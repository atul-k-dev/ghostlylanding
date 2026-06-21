/**
 * The Ghostly247 scheduler.
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
import type { ExtensionSettings, Platform } from '@casper/shared';
import { FREE_TIER, isPro, monthlyActionsUsed, bumpMonthly } from '@casper/shared';
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
  purgeStaleTasks,
  enqueue,
  stats as queueStats,
} from './queue.js';
import { executeTask } from './executor.js';
import { appendActionLog, flushActionLog, shouldFlush } from './action-log.js';
import { getTargetState, setTargetState } from '../lib/storage.js';

export const SCHEDULER_ALARM = 'casper.scheduler.tick';
const TICK_PERIOD_MINUTES = 0.5; // 30 seconds

/** Auto-rescan a target if it hasn't been scanned in this long. */
const RESCAN_INTERVAL_MS = 6 * 60 * 60 * 1000;
/**
 * Home feed re-scans periodically while the engine is Active so it keeps working
 * through the selected session — but only while there's daily/free budget left
 * (see homeHasBudget), so it never churns tabs after the caps are reached. The
 * session auto-pause stops it at the chosen duration.
 */
const HOME_RESCAN_INTERVAL_MS = 3 * 60 * 1000;
/** How often to run auto follow-back (open your followers list and follow back). */
const FOLLOWBACK_INTERVAL_MS = 30 * 60 * 1000;
/** Don't auto-refill if there are already this many pending tasks. */
const REFILL_PENDING_THRESHOLD = 5;

/**
 * MV3 keep-alive. While the engine is Active, a long autopilot session leaves
 * the service worker just *awaiting* a tab message — Chrome treats that as idle
 * and evicts the worker after ~5 min, which kills the run ("extension closed").
 * Pinging a chrome API every 20s (under the 30s idle timeout) keeps the worker
 * alive for the whole session. Stopped the moment the engine pauses.
 */
let keepAliveTimer: ReturnType<typeof setInterval> | null = null;
const startKeepAlive = (): void => {
  if (keepAliveTimer !== null) return;
  keepAliveTimer = setInterval(() => {
    void chrome.runtime.getPlatformInfo();
  }, 20_000);
  console.log('[casper] keep-alive on');
};
const stopKeepAlive = (): void => {
  if (keepAliveTimer === null) return;
  clearInterval(keepAliveTimer);
  keepAliveTimer = null;
  console.log('[casper] keep-alive off');
};

export const installScheduler = async (): Promise<void> => {
  // Clear out dev stub tasks / stale history so they can't block real work.
  const purged = await purgeStaleTasks();
  if (purged > 0) console.log(`[casper] purged ${purged} stale/stub tasks on startup`);
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
      console.log('[casper] tick: PAUSED — toggle the Active pill to start');
      stopKeepAlive();
      if (schedState.activeSince !== null) {
        await setSchedulerState({ ...schedState, activeSince: null });
      }
      await maybeFlush();
      return;
    }
    console.log('[casper] tick: active');
    startKeepAlive();

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
      stopKeepAlive();
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
      const waitS = Math.ceil((state.nextEligibleAt - Date.now()) / 1000);
      console.log(`[casper] tick: cooling down, next action in ~${waitS}s`);
      await maybeFlush();
      return;
    }

    // Top-up scans if the pipeline is light.
    await maybeRefillScans(settings);

    const task = await peekNextPending();
    if (!task) {
      console.log('[casper] tick: nothing queued (add targets or enable home feed)');
      await maybeFlush();
      return;
    }
    console.log(`[casper] tick: executing ${task.taskType} on ${task.platform}`, task.payload);

    if (task.kind === 'action') {
      // Free-tier gate
      const auth = await getAuth();
      const status = auth?.user.subscriptionStatus ?? 'free';
      if (!isPro(status)) {
        // Every feature works for free users too. The ONLY free-tier limit is a
        // 5-actions-per-month allowance — likes + comments + follows combined.
        // The server's count is authoritative (and resets monthly); we bump
        // locally after each action to avoid racing past it between syncs.
        if (monthlyActionsUsed(auth?.user) >= FREE_TIER.monthlyActions) {
          await updateTask(task.id, {
            status: 'skipped',
            lastError: `Free plan: ${FREE_TIER.monthlyActions} actions/month used. Upgrade to Pro.`,
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
      console.error(`[casper] ${task.taskType} threw:`, err);
      await updateTask(task.id, {
        status: 'failed',
        lastError: err instanceof Error ? err.message : String(err),
      });
      await scheduleNext();
      return;
    }

    console.log(
      `[casper] ${task.taskType} → ${result.success ? 'OK' : 'FAIL'}${
        result.errorMessage ? ` (${result.errorMessage})` : ''
      }`,
    );
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
      // For free users approaching the monthly cap, optimistically bump the
      // local count (rolling over at month boundaries) so the server's
      // authoritative count comes back before the next dispatch.
      const auth = await getAuth();
      if (!isPro(auth?.user.subscriptionStatus ?? 'free') && auth) {
        await setAuth({ ...auth, user: { ...auth.user, ...bumpMonthly(auth.user) } });
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
  if (!hasTargets && !homeEnabled && !settings.followBack) return;

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
      if (now - (existing.lastHomeScanAt ?? 0) < HOME_RESCAN_INTERVAL_MS) continue;
      // Don't re-open a tab that can do nothing: skip when the day's caps (or the
      // free-tier allowance) are already used up. This is what stops the
      // "tab keeps opening and closing" churn once limits are reached.
      if (!(await homeHasBudget(settings, platform))) continue;
      await enqueue(platform, 'scan-home-feed', {});
      existing.lastHomeScanAt = now;
      targetState[key] = existing;
      mutated = true;
    }
  }

  // Auto follow-back (Twitter/X) — paced, and only while there's follow budget.
  if (settings.followBack) {
    const key = 'followback:twitter';
    const existing = targetState[key] ?? { lastScannedAt: 0 };
    if (
      now - (existing.lastFollowScanAt ?? 0) >= FOLLOWBACK_INTERVAL_MS &&
      (await followBackHasBudget(settings))
    ) {
      await enqueue('twitter', 'scan-followback', {});
      existing.lastFollowScanAt = now;
      targetState[key] = existing;
      mutated = true;
    }
  }

  if (mutated) {
    await setTargetState(targetState);
  }
};

/** True if there's still daily + free-tier follow budget for auto follow-back. */
const followBackHasBudget = async (settings: ExtensionSettings): Promise<boolean> => {
  const auth = await getAuth();
  if (!isPro(auth?.user.subscriptionStatus ?? 'free')) {
    if (monthlyActionsUsed(auth?.user) >= FREE_TIER.monthlyActions) return false;
  }
  const counters = await ensureToday(settings);
  return isUnderCap(counters, 'twitter', 'follow');
};

/** True if there's still daily (and free-tier monthly) budget to act on this
 *  platform's home feed — used to avoid re-opening a tab that can do nothing. */
const homeHasBudget = async (settings: ExtensionSettings, platform: Platform): Promise<boolean> => {
  const auth = await getAuth();
  if (!isPro(auth?.user.subscriptionStatus ?? 'free')) {
    if (monthlyActionsUsed(auth?.user) >= FREE_TIER.monthlyActions) return false;
  }
  const counters = await ensureToday(settings);
  const hf = settings.homeFeed;
  return (
    (hf.like && isUnderCap(counters, platform, 'like')) ||
    (hf.comment && isUnderCap(counters, platform, 'comment')) ||
    (hf.follow && isUnderCap(counters, platform, 'follow')) ||
    (hf.bookmark && isUnderCap(counters, platform, 'bookmark')) ||
    (hf.repost && isUnderCap(counters, platform, 'repost')) ||
    (hf.quote && isUnderCap(counters, platform, 'quote'))
  );
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
