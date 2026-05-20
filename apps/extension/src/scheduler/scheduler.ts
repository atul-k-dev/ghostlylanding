/**
 * The Casper scheduler.
 *
 * One alarm fires every ~30s. On each tick we ask, in order:
 *   1. Is the engine paused?           — yes → skip
 *   2. Are we inside active hours?     — no  → skip (we'll try next tick)
 *   3. Has the random delay elapsed?   — no  → skip
 *   4. Is there a pending task?        — no  → maybe flush logs and exit
 *   5. Is the daily cap exhausted?     — yes → mark skipped, continue
 *   6. Execute. Increment counter, log action.
 *   7. Set nextEligibleAt = now + jitter(8–45s).
 *   8. Flush action buffer if due.
 *
 * Everything is event-driven on chrome.alarms — survives service worker eviction.
 */
import { getSettings, getSchedulerState, setSchedulerState } from '../lib/storage.js';
import { ensureToday, incrementCounter, isUnderCap } from './counters.js';
import { isActiveNow, nextActionDelayMs } from './timegate.js';
import { peekNextPending, updateTask, pruneFinished } from './queue.js';
import { executeTask } from './executor.js';
import { appendActionLog, flushActionLog, shouldFlush } from './action-log.js';

export const SCHEDULER_ALARM = 'casper.scheduler.tick';
const TICK_PERIOD_MINUTES = 0.5; // 30 seconds

export const installScheduler = async (): Promise<void> => {
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

    const state = await getSchedulerState();
    if (Date.now() < state.nextEligibleAt) {
      await maybeFlush();
      return;
    }

    const task = await peekNextPending();
    if (!task) {
      await maybeFlush();
      return;
    }

    const counters = await ensureToday(settings);
    if (!isUnderCap(counters, task.platform, task.taskType)) {
      await updateTask(task.id, {
        status: 'skipped',
        lastError: `daily cap reached for ${task.platform}/${task.taskType}`,
      });
      await maybeFlush();
      return;
    }

    await updateTask(task.id, { status: 'running', attempts: task.attempts + 1 });
    let logEntry;
    try {
      logEntry = await executeTask(task);
    } catch (err) {
      await updateTask(task.id, {
        status: 'failed',
        lastError: err instanceof Error ? err.message : String(err),
      });
      await scheduleNext();
      return;
    }

    await updateTask(task.id, {
      status: logEntry.success ? 'completed' : 'failed',
      ...(logEntry.errorMessage ? { lastError: logEntry.errorMessage } : {}),
    });
    await appendActionLog(logEntry);
    if (logEntry.success) {
      await incrementCounter(settings, task.platform, task.taskType);
    }
    await scheduleNext();
    await pruneFinished();
    await maybeFlush();
  } catch (err) {
    console.error('[casper] scheduler tick error', err);
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
