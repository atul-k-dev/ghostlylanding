/**
 * The Ghostly247 scheduler.
 *
 * Alarm-driven (chrome.alarms — survives service-worker eviction). On each tick
 * we walk an ordered safety gate. Everything before gate 1 runs whether or not
 * the engine is armed, because the user asked for it explicitly:
 *
 *   0. A post is mid-publish, a growth read is driving a tab, or a scheduled
 *      post is due?                          → yield the tick to it
 *   1. Engine paused?                        → skip
 *   2. Inside active hours (user tz)?        → skip, record 'outside-hours'
 *   2a. Session length exceeded?             → auto-pause + diagnostic, exit
 *   2b. Auto-drafting due (3.2)?             → write + slot tomorrow's posts
 *   2c. Weekly auto-tune due (6.1)?          → drop stale targets, log it —
 *                                              OFF by default; the due-check
 *                                              is local-only, so a disabled
 *                                              install never makes the
 *                                              network call that would follow
 *   3. Has a task already 'running'?         → skip (single in-flight at a time)
 *   4. Tick cooldown elapsed?                → skip (see gate 8)
 *   5. Any pending task?                     → maybe refill scans, record WHY
 *                                              there's nothing to do, exit
 *   6. Free-tier monthly allowance spent, or daily cap exhausted (action kind
 *      only)?                                → mark task skipped, record, exit
 *   7. Execute. Log + increment counter on success. Clear the block reason.
 *   8. Set nextEligibleAt += jitter(ACTION_DELAY_MS, 8–45s).
 *   9. Flush action-log + diagnostics buffers if due.
 *
 * Scans go through 2–4 but not 6 — they're internal and feed real actions.
 *
 * Gate 2 was documented here from the first commit and did not exist until
 * `updateplan.md` 0.4; `isActiveNow` had no callers at all. Treat this comment
 * as a contract, not a description — if a line here isn't in the code below,
 * that's the bug.
 *
 * Gate 8 is NOT the delay between two actions the user's account performs. It
 * is the gap between dispatches of QUEUED tasks — one tab-driving job and the
 * next. The pacing inside a session (the one X sees: like, wait, like) is the
 * same 8–45s range from the same `ACTION_DELAY_MS` constant, but it is handed
 * to the content script by executor.ts and slept there, and it is bounded by a
 * second guard the tick knows nothing about: the rolling hourly ceiling in
 * scheduler/rate-limit.ts, enforced inside the feed loop before every action.
 */
import type { ExtensionSettings, Platform } from '@casper/shared';
import { FREE_TIER, isPro, monthlyActionsUsed, bumpMonthly } from '@casper/shared';
import {
  getSettings,
  setSettings,
  getSchedulerState,
  setSchedulerState,
  getAuth,
  getOwnHandle,
  appendDiagnostic,
} from '../lib/storage.js';
import { ensureToday, incrementCounter, isUnderCap } from './counters.js';
import { setAuth } from '../lib/storage.js';
import { nextActionDelayMs, isWithinActiveHours } from './timegate.js';
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
import { setBlockReason, clearBlockReason, resolveBlockReason, getBlockReason } from './block-reason.js';
import { maybeNotifySignedOut, maybeNotifyAutoPause } from '../lib/browser-notify.js';
import type { ExecutorResult, QueuedTask } from './types.js';
import { appendActionLog, flushActionLog, shouldFlush } from './action-log.js';
import { flushDiagnostics, shouldFlushDiagnostics } from './diagnostics-log.js';
import { getTargetState, setTargetState } from '../lib/storage.js';
import { maybePublishDuePost, isPublishing, reviveScheduledPosts } from './scheduled-posts.js';
import { maybeAutoDraft } from './auto-posting.js';
import { requestPostIdeas } from '../lib/ideas.js';
import { isAutoTuneDue, dropHandlesFor } from './auto-tune.js';
import { appendGrowthMilestone, appendAutoTuneDrops } from '../lib/storage.js';
import { apiFetch } from '../lib/api.js';
import type { GrowthSummary } from '@casper/shared';

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
/**
 * How often to read the growth scoreboard (followers + how our posts performed).
 * Once a day: the numbers are a daily series, and the read costs three tabs.
 */
const GROWTH_INTERVAL_MS = 20 * 60 * 60 * 1000;
/** How often to work each saved search feed. */
const SEARCH_INTERVAL_MS = 45 * 60 * 1000;
/**
 * Early-reply cadence: how often to re-check ONE target creator's profile for
 * something brand new. Targets are visited in rotation (least-recently-checked
 * first), so this is the interval between visits, not per creator — five
 * creators at 6 minutes means each is seen roughly every half hour, and any post
 * we do find is still only minutes old.
 */
const EARLY_REPLY_INTERVAL_MS = 6 * 60 * 1000;
/**
 * How often to read the notifications/mentions tab (updateplan 4.1). Ten
 * minutes: mentions decay fast (see `lib/mentions.ts`'s priority scoring), and
 * this is a read-only scan — it never touches the daily caps.
 */
const MENTIONS_INTERVAL_MS = 10 * 60 * 1000;

/**
 * Consecutive 'degraded' runs before the engine stops itself. Degraded means we
 * couldn't see the page at all — tab failures, or a timeline that rendered zero
 * posts. Four in a row is not a quiet feed; it's a signed-out session or a
 * broken selector, and grinding on opens tabs that can't do anything.
 */
const DEGRADED_LIMIT = 4;

/** Don't auto-refill if there are already this many pending tasks. */
const REFILL_PENDING_THRESHOLD = 5;

/**
 * MV3 keep-alive. While the engine is Active, a long autopilot session leaves
 * the service worker just *awaiting* a tab message — Chrome treats that as idle
 * and evicts the worker after ~5 min, which kills the run ("extension closed").
 * Pinging a chrome API every 20s (under the 30s idle timeout) keeps the worker
 * alive for the whole session. Stopped the moment the engine pauses.
 */
/**
 * True while an on-demand growth read is in flight. The Growth tab's Refresh
 * runs outside the queue, so the tick has no 'running' task to see — without
 * this it could start an autopilot session in parallel and drive two tabs at
 * once. Mirrors the `isPublishing` guard scheduled posts use.
 */
let growthRunning = false;

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
  // A scheduled post left mid-publish by an SW restart is marked failed (never
  // silently retried) so we can't double-post to the user's timeline.
  await reviveScheduledPosts();
  const existing = await chrome.alarms.get(SCHEDULER_ALARM);
  if (!existing) {
    await chrome.alarms.create(SCHEDULER_ALARM, {
      delayInMinutes: TICK_PERIOD_MINUTES,
      periodInMinutes: TICK_PERIOD_MINUTES,
    });
    console.log('[casper] scheduler alarm installed');
  }
};

/**
 * One pass of the auto-draft loop, with the network call wired in and every
 * failure swallowed. The tick is the heart of the engine; an idea request that
 * throws must not cost the user their engagement turn.
 */
const runAutoDraft = async (): Promise<void> => {
  try {
    await maybeAutoDraft(async (count) => {
      const resp = await requestPostIdeas({ count });
      if (!resp.ok) throw new Error(resp.error.message);
      return resp.data.ideas;
    });
  } catch (err) {
    console.warn('[casper] auto-post: pass failed —', err);
  }
};

/**
 * Weekly auto-tune (updateplan 6.1) — gate 2c. Off by default. Drops target
 * creators flagged `stale` by the exact same 21-day threshold the Growth tab
 * already shows the user, and nothing else: no per-target follower guess, no
 * "promote" action, no cap shifting — none of those have a safe automatic
 * mechanism in this codebase (see the Phase 6 progress log). Every drop is
 * logged as a change marker AND kept in a recoverable list, so "reversible"
 * is a real property of what this does, not a promise.
 */
const runAutoTune = async (): Promise<void> => {
  try {
    const settings = await getSettings();
    if (!isAutoTuneDue(settings.autoTune.enabled, settings.autoTune.lastRunAt, Date.now())) return;

    const resp = await apiFetch<GrowthSummary>('/api/growth/summary?days=1');
    // Stamp lastRunAt regardless of the fetch's outcome — a server hiccup
    // costs this install the interval, not a request every 30 seconds until
    // one succeeds (same reasoning as auto-posting's own lastRunAt stamp).
    const current = await getSettings();
    await setSettings({
      ...current,
      autoTune: { ...current.autoTune, lastRunAt: new Date().toISOString() },
    });
    if (!resp.ok) return;

    const dropHandles = dropHandlesFor(resp.data.targets);
    if (dropHandles.length === 0) return;

    const now = new Date().toISOString();
    const dropSet = new Set(dropHandles.map((h) => h.toLowerCase()));
    const afterDrop = await getSettings();
    await setSettings({
      ...afterDrop,
      targetCreators: afterDrop.targetCreators.filter((t) => !dropSet.has(t.handle.toLowerCase())),
    });
    await appendAutoTuneDrops(dropHandles.map((handle) => ({ handle, at: now, reason: 'stale' as const })));
    await appendGrowthMilestone({
      at: now,
      kind: 'auto-tune-dropped-targets',
      detail: `Dropped ${dropHandles.length} quiet target${dropHandles.length === 1 ? '' : 's'}: ${dropHandles
        .map((h) => `@${h}`)
        .join(', ')}`,
    });
  } catch (err) {
    console.warn('[casper] auto-tune: pass failed —', err);
  }
};

export const handleTick = async (): Promise<void> => {
  try {
    // Scheduled posts publish at their scheduled time regardless of the Active
    // pill (the user scheduled them explicitly). Handle this FIRST, and keep it
    // isolated from the autopilot: skip while a post is mid-publish or while an
    // autopilot task is in flight, so we never open two tabs at once. At most one
    // post per tick; when one fires we yield the rest of this tick to it.
    if (isPublishing()) return;
    // A manual growth read is already driving a tab — don't open another.
    if (growthRunning) return;
    if (!(await hasRunningTask())) {
      if (await maybePublishDuePost()) return;
    }

    const settings = await getSettings();
    const schedState = await getSchedulerState();

    // Paused → engine idle. Clear any running session timer.
    if (settings.isPaused) {
      console.log('[casper] tick: PAUSED — toggle the Active pill to start');
      await setBlockReason('paused');
      stopKeepAlive();
      if (schedState.activeSince !== null) {
        await setSchedulerState({ ...schedState, activeSince: null });
      }
      await maybeFlush();
      return;
    }
    // Gate 2 — active hours, in the user's own timezone. This gate has been
    // documented in the header since the scheduler was written and was never
    // actually called (D6): `isActiveNow` had no callers, not even a test, so
    // the engine ran at 4am the same as at 4pm. Scans stop here too, per the
    // gate contract above (scans pass 2–4, not 6) — there is no point warming
    // a queue for a window that is closed.
    if (!isWithinActiveHours(new Date(), settings.timezone, settings.activeHours)) {
      const { startHour, endHour } = settings.activeHours;
      const window = `${String(startHour).padStart(2, '0')}:00–${String(endHour).padStart(2, '0')}:00`;
      console.log(`[casper] tick: outside active hours (${window} ${settings.timezone})`);
      // The block reason, not appendDiagnostic: this tick fires every 30s, and a
      // diagnostic per tick would push everything else out of the buffer for the
      // whole night. The reason carries `since`, so the UI can say how long.
      await setBlockReason('outside-hours', `${window} ${settings.timezone}`);
      stopKeepAlive();
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

    // Auto-drafting (updateplan 3.2). Deliberately behind the paused and
    // active-hours gates rather than beside the scheduled-post publisher: a
    // post the user scheduled by hand is theirs and goes out regardless, but
    // writing something new is the engine acting on its own, and "Resting"
    // has to mean nothing is running. Awaited, not fired off, so two ticks
    // 30 seconds apart can't both get past the interval check.
    await runAutoDraft();
    await runAutoTune();

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
      // Nothing to run. WHY there's nothing to run is the thing users have never
      // been told — it lived in a console.log in this exact spot. Resolve it and
      // persist it so the UI can show the one card that fixes it.
      await reportIdleReason(settings);
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
          await setBlockReason('free-cap');
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
        await setBlockReason('caps-spent', `${task.platform}/${task.taskType}`);
        await maybeFlush();
        return;
      }
    }

    // We're actually doing something — nothing to explain.
    await clearBlockReason();
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

    // The quiet-feed counter behind "Skipped {n} posts". A run that read posts
    // and acted on none adds to it; anything actually acted on clears it, so the
    // number always describes the quiet spell the user is in right now.
    if (typeof result.scanned === 'number') {
      const sched = await getSchedulerState();
      const acted = result.acted ?? 0;
      await setSchedulerState({
        ...sched,
        skippedSinceAction:
          acted > 0 ? 0 : (sched.skippedSinceAction ?? 0) + Math.max(0, result.scanned - acted),
      });
    }

    // Circuit breaker. A healthy run clears the streak; four consecutive
    // degraded ones pause the engine and say why, instead of reopening a tab
    // every cycle that can't do anything.
    if (result.health) {
      const sched = await getSchedulerState();
      const streak = result.health === 'degraded' ? (sched.degradedStreak ?? 0) + 1 : 0;
      await setSchedulerState({ ...sched, degradedStreak: streak });
      if (streak >= DEGRADED_LIMIT) {
        await setSettings({ ...settings, isPaused: true });
        await setSchedulerState({
          ...(await getSchedulerState()),
          activeSince: null,
          degradedStreak: 0,
        });
        stopKeepAlive();
        {
          const detail =
            `Paused after ${streak} runs that couldn't read your timeline. ` +
            'Open x.com and check you are signed in, then toggle Active to resume.';
          await appendDiagnostic({ kind: 'auto_pause', context: 'safety:degraded', detail });
          // A worse-than-idle moment (updateplan 4.3): the engine stopped
          // itself and the panel may well be closed when it happened.
          void maybeNotifyAutoPause(detail);
        }
        await maybeFlush();
        return;
      }
    }
    if (result.success && task.kind === 'action') {
      // Something happened, so the quiet spell is over.
      const sched = await getSchedulerState();
      if ((sched.skippedSinceAction ?? 0) > 0) {
        await setSchedulerState({ ...sched, skippedSinceAction: 0 });
      }
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
    // The tick is the heart of the engine — a throw here means the user's
    // automation silently stopped, so it must be reported, not just logged.
    await appendDiagnostic({
      kind: 'crash',
      context: 'scheduler:tick',
      detail:
        err instanceof Error ? `${err.message}\n${(err.stack ?? '').slice(0, 400)}` : String(err),
    });
  }
};

/**
 * Run the growth read on demand — the Growth tab's Refresh button.
 *
 * Deliberately bypasses the queue and the Active gate: the growth scan only
 * READS the user's own profile, so it's safe while the engine is paused, and a
 * user checking their numbers shouldn't have to arm the automation first. We
 * hold the service worker awake for the duration when it isn't already (a
 * paused engine has no keep-alive running, and three tab round-trips look idle
 * to Chrome).
 */
export const runGrowthScanNow = async (): Promise<ExecutorResult> => {
  if (growthRunning) {
    return { success: false, errorMessage: 'a growth read is already running' };
  }
  const { isPaused } = await getSettings();
  growthRunning = true;
  if (isPaused) startKeepAlive();
  try {
    const task: QueuedTask = {
      id: 'growth-manual',
      kind: 'scan',
      platform: 'twitter',
      taskType: 'scan-growth',
      payload: {},
      enqueuedAt: new Date().toISOString(),
      attempts: 1,
      status: 'running',
    };
    return await executeTask(task);
  } finally {
    growthRunning = false;
    // Only give the worker back if we're the ones who woke it — an Active
    // session needs its keep-alive to survive this call.
    if (isPaused) stopKeepAlive();
  }
};

const maybeRefillScans = async (settings: ExtensionSettings): Promise<void> => {
  const hasTargets = settings.targetCreators.length > 0;
  const homeEnabled = settings.homeFeed.enabled && settings.homeFeed.platforms.length > 0;

  const s = await queueStats();
  if (s.pending + s.running >= REFILL_PENDING_THRESHOLD) return;

  const targetState = await getTargetState();
  const now = Date.now();
  let mutated = false;

  // The daily growth read comes first and runs regardless of what automation is
  // configured — it measures the account, not the automation, and a user whose
  // targeting is switched off still wants their follower chart. It's a 'scan',
  // so it never touches the daily caps or the free-tier allowance.
  {
    const key = 'growth:twitter';
    const existing = targetState[key] ?? { lastScannedAt: 0 };
    if (now - (existing.lastGrowthScanAt ?? 0) >= GROWTH_INTERVAL_MS) {
      await enqueue('twitter', 'scan-growth', {});
      existing.lastGrowthScanAt = now;
      targetState[key] = existing;
      mutated = true;
    }
  }

  // Mentions (updateplan 4.1) also run regardless of what engagement is
  // configured — replying to your own mentions carries no ban risk, and a user
  // who has switched off all feed engagement may still want their mentions
  // answered. It has its own on/off switch (`settings.mentions.enabled`)
  // rather than piggybacking on the home feed's.
  if (settings.mentions.enabled) {
    const key = 'mentions:twitter';
    const existing = targetState[key] ?? { lastScannedAt: 0 };
    if (now - (existing.lastMentionsScanAt ?? 0) >= MENTIONS_INTERVAL_MS) {
      await enqueue('twitter', 'scan-mentions', {});
      existing.lastMentionsScanAt = now;
      targetState[key] = existing;
      mutated = true;
    }
  }

  const hasSearches = settings.searchQueries.length > 0;
  if (!hasTargets && !homeEnabled && !settings.followBack && !hasSearches) {
    if (mutated) await setTargetState(targetState);
    return;
  }

  // Early replies: visit ONE target creator per interval, least-recently-checked
  // first, and act only on posts a few hours old. Rotating keeps the tab churn
  // flat no matter how many creators are on the list, while still catching a new
  // post while its reply section is short.
  // Neither source below is worth a tab once the day's caps (or the free
  // allowance) are spent — that's the churn the home feed already guards
  // against. They need different checks: a search feed mirrors the home-feed
  // toggles, while a profile visit always Likes whatever those toggles say.
  const searchCanAct = await homeHasBudget(settings, 'twitter');

  if (settings.earlyReply && hasTargets && (await profileVisitHasBudget(settings))) {
    const key = 'early:twitter';
    const existing = targetState[key] ?? { lastScannedAt: 0 };
    if (now - (existing.lastScannedAt ?? 0) >= EARLY_REPLY_INTERVAL_MS) {
      // Least-recently-visited first, read from the early-visit clock so this
      // rotation is independent of the slow full sweep.
      const dueFirst = [...settings.targetCreators].sort((a, b) => {
        const ka = `early:${a.platform}:${a.handle.replace(/^@/, '')}`;
        const kb = `early:${b.platform}:${b.handle.replace(/^@/, '')}`;
        return (targetState[ka]?.lastScannedAt ?? 0) - (targetState[kb]?.lastScannedAt ?? 0);
      });
      const next = dueFirst[0];
      if (next) {
        await enqueue(next.platform, 'scan-profile-likes', { handle: next.handle, early: true });
        const nk = `early:${next.platform}:${next.handle.replace(/^@/, '')}`;
        targetState[nk] = { ...(targetState[nk] ?? { lastScannedAt: 0 }), lastScannedAt: now };
        existing.lastScannedAt = now;
        targetState[key] = existing;
        mutated = true;
      }
    }
  }

  // Topic feeds — X search on the Latest tab, one task per saved query.
  if (searchCanAct) {
    for (const saved of settings.searchQueries) {
      const key = `search:${saved.query}`;
      const existing = targetState[key] ?? { lastScannedAt: 0 };
      if (now - (existing.lastSearchScanAt ?? 0) >= SEARCH_INTERVAL_MS) {
        await enqueue('twitter', 'scan-search', { query: saved.query });
        existing.lastSearchScanAt = now;
        targetState[key] = existing;
        mutated = true;
      }
    }
  }

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

/**
 * True if a profile visit could still do something. Unlike the home feed, a
 * profile visit ALWAYS likes (that's its promise), so a like slot is enough —
 * checking the home-feed toggles here would wrongly block early replies for a
 * user who works targets with the home feed switched off.
 */
const profileVisitHasBudget = async (settings: ExtensionSettings): Promise<boolean> => {
  const auth = await getAuth();
  if (!isPro(auth?.user.subscriptionStatus ?? 'free')) {
    if (monthlyActionsUsed(auth?.user) >= FREE_TIER.monthlyActions) return false;
  }
  const counters = await ensureToday(settings);
  return (
    isUnderCap(counters, 'twitter', 'like') ||
    (settings.homeFeed.comment && isUnderCap(counters, 'twitter', 'comment'))
  );
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

/**
 * Work out why the queue is empty and persist it for the UI.
 *
 * Everything here was already computed somewhere in this file; the only new part
 * is writing the answer down where a human can read it. Assembles plain data and
 * hands it to the pure resolver, which owns the precedence rules.
 */
const reportIdleReason = async (settings: ExtensionSettings): Promise<void> => {
  const auth = await getAuth();
  const status = auth?.user.subscriptionStatus ?? 'free';
  const pro = isPro(status);
  const counters = await ensureToday(settings);
  const sched = await getSchedulerState();
  const hf = settings.homeFeed;

  const anyActionEnabled =
    hf.like || hf.comment || hf.follow || hf.bookmark || hf.repost || hf.quote;

  /** Posts read and passed over since anything last happened — the card's {n}. */
  const skipped = sched.skippedSinceAction ?? 0;

  // Caps are "spent" only when every action type the user actually enabled has
  // run out. A disabled action type having budget left is not budget.
  const enabled: [boolean, Parameters<typeof isUnderCap>[2]][] = [
    [hf.like, 'like'],
    [hf.comment, 'comment'],
    [hf.follow, 'follow'],
    [hf.bookmark, 'bookmark'],
    [hf.repost, 'repost'],
    [hf.quote, 'quote'],
  ];
  const live = enabled.filter(([on]) => on);
  const capsSpent =
    live.length > 0 && live.every(([, kind]) => !isUnderCap(counters, 'twitter', kind));

  const code = resolveBlockReason({
    isPaused: settings.isPaused,
    signedInToX: (await getOwnHandle()) !== null,
    // A free account is not a lapsed one — only a paid plan that stopped.
    subscriptionLapsed: status === 'canceled' || status === 'past_due',
    freeCapHit: !pro && monthlyActionsUsed(auth?.user) >= FREE_TIER.monthlyActions,
    // The engine keeps liking and following without the API; only replies need
    // it, so an unreachable server is reported but never treated as fatal here.
    serverReachable: true,
    degradedStreak: sched.degradedStreak ?? 0,
    capsSpent,
    withinActiveHours: isWithinActiveHours(new Date(), settings.timezone, settings.activeHours),
    hasTargets: settings.targetCreators.length > 0,
    hasSearchQueries: settings.searchQueries.length > 0,
    homeFeedEnabled: hf.enabled,
    anyActionEnabled,
    mentionsEnabled: settings.mentions.enabled,
    // The queue being empty after a refill pass means the scans found nothing
    // worth queueing — a quiet feed, not a fault. Only claim it once a scan has
    // actually read posts and passed on them: "Skipped 0 posts" would be a
    // sentence about nothing, and a fresh install that has yet to scan is not a
    // quiet feed, it is an engine that hasn't started.
    scannedButNoMatch: skipped > 0,
  });

  if (code === null) {
    await clearBlockReason();
    return;
  }
  await setBlockReason(code, code === 'nothing-matched' ? String(skipped) : undefined);
  console.log(`[casper] tick: idle — ${code}`);
  // "I've been signed out for 2 hours" (updateplan 4.3) — a decaying moment
  // worth a Chrome-level alert even with the panel closed. Reads the reason
  // straight back so it has the real `since`, not a guess at when this tick
  // happens to be running.
  void maybeNotifySignedOut(await getBlockReason());
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
  // Diagnostics flush on their OWN schedule. A broken install produces no action
  // logs at all, so anything gated on the action-log buffer would stay silent in
  // the one case this telemetry exists for.
  if (await shouldFlushDiagnostics()) {
    const diagnostics = await flushDiagnostics();
    if (diagnostics > 0) console.log(`[casper] flushed ${diagnostics} diagnostics`);
  }
};
