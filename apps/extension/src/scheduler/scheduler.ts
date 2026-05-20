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
import {
  getSettings,
  getSchedulerState,
  setSchedulerState,
} from '../lib/storage.js';
import { ensureToday, incrementCounter, isUnderCap } from './counters.js';
import { isActiveNow, nextActionDelayMs } from './timegate.js';
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

    if (!isActiveNow(settings)) {
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
    }
    await scheduleNext();
    await pruneFinished();
    await maybeFlush();
  } catch (err) {
    console.error('[casper] scheduler tick error', err);
  }
};

const maybeRefillScans = async (settings: ExtensionSettings): Promise<void> => {
  if (settings.targetCreators.length === 0) return;
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
