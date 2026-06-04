/**
 * The Casper scheduler.
 *
 * Alarm-driven (chrome.alarms — survives service-worker eviction). On each
 * tick we walk an ordered safety gate:
 *
 *   1. Engine paused?                        → skip
 *   2. Inside active hours (user tz)?        → skip
 *   3. Has a task already 'running'?         → skip (single in-flight at a time)
 *   4. Random-delay cooldown elapsed?        → skip
 *   5. Any pending task?                     → maybe refill scans, exit
 *   6. Daily cap exhausted (action kind only)? → mark task skipped, exit
 *   7. Execute. Log + increment counter on success.
 *   8. Set nextEligibleAt += jitter(8–45s).
 *   9. Flush action-log buffer if due.
 *
 * Scans go through 2–4 but not 6 — they're internal and feed real actions.
 */
import type { ExtensionSettings } from '@casper/shared';
import { FREE_TIER, isPro } from '@casper/shared';
import {
  getSettings,
  setSettings,
  getSchedulerState,
  setSchedulerState,
  getAuth,
  appendDiagnostic,
} from '../lib/storage.js';
import { ensureToday, incrementCounter, isUnderCap } from './counters.js';
import { setAuth } from '../lib/storage.js';
import { nextActionDelayMs } from './timegate.js';
import {
  peekNextPending,
  updateTask,
  pruneFinished,
  hasRunningTask,
  reviveRunningTasks,
  enqueue,
  stats as queueStats,
} from './queue.js';
import { executeTask } from './executor.js';
import { appendActionLog, flushActionLog, shouldFlush } from './action-log.js';
import { getTargetState } from '../lib/storage.js';

export const SCHEDULER_ALARM = 'casper.scheduler.tick';
const TICK_PERIOD_MINUTES = 0.5; // 30 seconds

/** Auto-rescan a target if it hasn't been scanned in this long. */
const RESCAN_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** Home feed refreshes more often than individual profiles. */
const HOME_RESCAN_INTERVAL_MS = 2 * 60 * 60 * 1000;
/** Don't auto-refill if there are already this many pending tasks. */
const REFILL_PENDING_THRESHOLD = 5;

export const installScheduler = async (): Promise<void> => {
  // Repair any 'running' tasks left over from a dropped service worker
  await reviveRunningTasks();
  const existing = await chrome.alarms.get(SCHEDULER_ALARM);
  if (!existing) {
    await chrome.alarms.create(SCHEDULER_ALARM, {
      delayInMinutes: TICK_PERIOD_MINUTES,
      periodInMinutes: TICK_PERIOD_MINUTES,
    });
    console.log('[casper] scheduler alarm installed');
  }
};

export const handleTick = async (): Promise<void> => {
  try {
    const settings = await getSettings();
    const schedState = await getSchedulerState();

    // Paused → engine idle. Clear any running session timer.
    if (settings.isPaused) {
      if (schedState.activeSince !== null) {
        await setSchedulerState({ ...schedState, activeSince: null });
      }
      await maybeFlush();
      return;
    }

    // Active → start the session clock on the first tick after arming.
    if (schedState.activeSince === null) {
      await setSchedulerState({ ...schedState, activeSince: Date.now() });
    }
    const startedAt = schedState.activeSince ?? Date.now();

    // Safety auto-pause: once a session exceeds the limit, pause and notify.
    const sessionMs = Math.max(1, settings.sessionMinutes) * 60_000;
    if (Date.now() - startedAt >= sessionMs) {
      await setSettings({ ...settings, isPaused: true });
      await setSchedulerState({ ...schedState, activeSince: null });
      await appendDiagnostic({
        kind: 'auto_pause',
        context: 'safety',
        detail: `Auto-paused after ${settings.sessionMinutes} min to protect your account. Toggle Active to resume.`,
      });
      await maybeFlush();
      return;
    }

    if (await hasRunningTask()) {
      // Don't dispatch a second task while one is in flight.
      await maybeFlush();
      return;
    }

    const state = await getSchedulerState();
    if (Date.now() < state.nextEligibleAt) {
      await maybeFlush();
      return;
    }

    // Top-up scans if the pipeline is light.
    await maybeRefillScans(settings);

    const task = await peekNextPending();
    if (!task) {
      await maybeFlush();
      return;
    }

    if (task.kind === 'action') {
      // Free-tier gate
      const auth = await getAuth();
      const status = auth?.user.subscriptionStatus ?? 'free';
      if (!isPro(status)) {
        // 1) No AI comments for free users
        if (task.taskType === 'comment') {
          await updateTask(task.id, {
            status: 'skipped',
            lastError: 'AI comments require Casper Pro',
          });
          await maybeFlush();
          return;
        }
        // 2) Only one platform — whichever has a target listed first
        const allowedPlatform = settings.targetCreators[0]?.platform;
        if (allowedPlatform && task.platform !== allowedPlatform) {
          await updateTask(task.id, {
            status: 'skipped',
            lastError: `Free plan: only ${allowedPlatform} is active. Upgrade to Pro for both platforms.`,
          });
          await maybeFlush();
          return;
        }
        // 3) 30 LIFETIME actions across the entire history of this account.
        // Server's count is authoritative; pessimistic local += pending to avoid
        // racing past the cap between server syncs.
        const lifetime = auth?.user.lifetimeActionCount ?? 0;
        if (lifetime >= FREE_TIER.lifetimeActions) {
          await updateTask(task.id, {
            status: 'skipped',
            lastError: `Free plan: ${FREE_TIER.lifetimeActions}-action lifetime allowance used. Upgrade to Pro.`,
          });
          await maybeFlush();
          return;
        }
      }

      const counters = await ensureToday(settings);
      if (!isUnderCap(counters, task.platform, task.taskType as Parameters<typeof isUnderCap>[2])) {
        await updateTask(task.id, {
          status: 'skipped',
          lastError: `daily cap reached for ${task.platform}/${task.taskType}`,
        });
        await maybeFlush();
        return;
      }
    }

    await updateTask(task.id, { status: 'running', attempts: task.attempts + 1 });

    let result;
    try {
      result = await executeTask(task);
    } catch (err) {
      await updateTask(task.id, {
        status: 'failed',
        lastError: err instanceof Error ? err.message : String(err),
      });
      await scheduleNext();
      return;
    }

    await updateTask(task.id, {
      status: result.success ? 'completed' : 'failed',
      ...(result.errorMessage ? { lastError: result.errorMessage } : {}),
    });
    if (result.logEntry) {
      await appendActionLog(result.logEntry);
    }
    if (result.success && task.kind === 'action') {
      await incrementCounter(
        settings,
        task.platform,
        task.taskType as Parameters<typeof incrementCounter>[2],
      );
      // For free users approaching the lifetime cap, optimistically bump local
      // count + flush eagerly so the server's authoritative count comes back
      // before the next dispatch.
      const auth = await getAuth();
      if (!isPro(auth?.user.subscriptionStatus ?? 'free') && auth) {
        const next = (auth.user.lifetimeActionCount ?? 0) + 1;
        await setAuth({ ...auth, user: { ...auth.user, lifetimeActionCount: next } });
      }
    }
    await scheduleNext();
    await pruneFinished();
    await maybeFlush();
  } catch (err) {
    console.error('[casper] scheduler tick error', err);
  }
};

const maybeRefillScans = async (settings: ExtensionSettings): Promise<void> => {
  const hasTargets = settings.targetCreators.length > 0;
  const homeEnabled = settings.homeFeed.enabled && settings.homeFeed.platforms.length > 0;
  if (!hasTargets && !homeEnabled) return;

  const s = await queueStats();
  if (s.pending + s.running >= REFILL_PENDING_THRESHOLD) return;

  const targetState = await getTargetState();
  const now = Date.now();
  let mutated = false;

  for (const target of settings.targetCreators) {
    const key = `${target.platform}:${target.handle.replace(/^@/, '')}`;
    const existing = targetState[key] ?? { lastScannedAt: 0 };
    if (now - existing.lastScannedAt >= RESCAN_INTERVAL_MS) {
      await enqueue(target.platform, 'scan-profile-likes', { handle: target.handle });
      existing.lastScannedAt = now;
      mutated = true;
    }
    if (now - (existing.lastFollowScanAt ?? 0) >= RESCAN_INTERVAL_MS) {
      await enqueue(target.platform, 'scan-profile-followers', { handle: target.handle });
      existing.lastFollowScanAt = now;
      mutated = true;
    }
    targetState[key] = existing;
  }

  if (homeEnabled) {
    for (const platform of settings.homeFeed.platforms) {
      const key = `home:${platform}`;
      const existing = targetState[key] ?? { lastScannedAt: 0 };
      if (now - (existing.lastHomeScanAt ?? 0) >= HOME_RESCAN_INTERVAL_MS) {
        await enqueue(platform, 'scan-home-feed', {});
        existing.lastHomeScanAt = now;
        targetState[key] = existing;
        mutated = true;
      }
    }
  }

  if (mutated) {
    const { setTargetState } = await import('../lib/storage.js');
    await setTargetState(targetState);
  }
};

const scheduleNext = async (): Promise<void> => {
  const state = await getSchedulerState();
  await setSchedulerState({ ...state, nextEligibleAt: Date.now() + nextActionDelayMs() });
};

const maybeFlush = async (): Promise<void> => {
  if (await shouldFlush()) {
    const r = await flushActionLog();
    if (r.sent > 0) console.log(`[casper] flushed ${r.sent} action logs`);
  }
};
