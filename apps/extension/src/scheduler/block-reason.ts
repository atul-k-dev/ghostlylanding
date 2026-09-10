/**
 * Why the engine isn't doing anything right now.
 *
 * The scheduler has always KNOWN this — it evaluated every one of these
 * conditions on each tick and then wrote the answer to `console.log`, inside a
 * service worker, where no user has ever seen it. The result is that a healthy
 * quiet engine and a completely broken one look identical from the popup: six
 * zeroed counters either way.
 *
 * This module makes the reason a first-class, persisted value so the UI can
 * render it (and, crucially, render the ONE button that resolves it).
 *
 * Two halves, deliberately separated:
 *   - `resolveBlockReason` is PURE. No chrome APIs, no storage, no imports that
 *     touch either — so the smoke suite can drive every condition in plain node.
 *   - the get/set/clear helpers below persist it, and are the only part that
 *     needs a browser.
 */
import { STORAGE_KEYS } from '../lib/storage.js';

/**
 * Ordered by PRECEDENCE, most-authoritative first. When several conditions hold
 * at once we report the one the user can most usefully act on:
 *
 *   1. What the user asked for beats everything — if they hit Pause, that is the
 *      reason, not whatever else happens to also be true.
 *   2. Then anything that makes the engine structurally unable to act: it can't
 *      see the account, isn't allowed to, or can't read the page.
 *   3. Then budget, which means "nothing more today" regardless of the clock.
 *      This sits ABOVE outside-hours on purpose: caps-spent is the more complete
 *      truth (even at 10am nothing would happen), and its copy already tells the
 *      user when work resumes.
 *   4. Then setup gaps, which are the user's to fix.
 *   5. Finally 'nothing-matched', which is not a fault at all — it's a healthy
 *      engine on a quiet feed, and saying so is the whole point of this module.
 */
export const BLOCK_REASON_PRECEDENCE = [
  'paused',
  'signed-out',
  'sub-lapsed',
  'free-cap',
  'server-unreachable',
  'degraded',
  'caps-spent',
  'outside-hours',
  'not-configured',
  'feed-off',
  'nothing-matched',
] as const;

export type BlockReasonCode = (typeof BLOCK_REASON_PRECEDENCE)[number];

export interface BlockReason {
  code: BlockReasonCode;
  /**
   * ms epoch when this reason was FIRST observed, and preserved across ticks for
   * as long as the code doesn't change. The UI needs the duration, not the last
   * time we happened to notice ("signed out for 2 hours" is a very different
   * message from "signed out").
   */
  since: number;
  /** Extra context for the copy, e.g. how many posts were scanned and skipped. */
  detail?: string;
}

/**
 * Everything the resolver needs, as plain data. Assembled by the caller from
 * settings, counters and auth — which keeps this function testable and keeps the
 * precedence rules in exactly one place instead of scattered across the tick.
 */
export interface BlockReasonInput {
  isPaused: boolean;
  /** Signed in to X itself (not to Ghostly) — false when the DOM says logged out. */
  signedInToX: boolean;
  /** A lapsed/cancelled paid subscription. Free accounts are NOT lapsed. */
  subscriptionLapsed: boolean;
  /** Free plan and the monthly action allowance is spent. */
  freeCapHit: boolean;
  serverReachable: boolean;
  /** Consecutive degraded runs — the selector breaker. */
  degradedStreak: number;
  /** Every enabled action type has spent its daily cap. */
  capsSpent: boolean;
  withinActiveHours: boolean;
  hasTargets: boolean;
  hasSearchQueries: boolean;
  homeFeedEnabled: boolean;
  /** At least one of like/comment/follow/bookmark/repost/quote is on. */
  anyActionEnabled: boolean;
  /** We scanned a feed this tick and matched nothing. */
  scannedButNoMatch: boolean;
}

/**
 * Consecutive degraded runs before we report a break. Must stay in step with
 * `DEGRADED_LIMIT` in scheduler.ts, which is what actually stops the engine —
 * reporting "X changed its layout" at a different threshold than the one that
 * halts work would tell the user a story the engine isn't living.
 */
export const DEGRADED_STREAK_LIMIT = 4;

/**
 * The single place that decides what to tell the user. Returns null when the
 * engine is genuinely working and has work to do — the only case with nothing
 * to report.
 */
export const resolveBlockReason = (input: BlockReasonInput): BlockReasonCode | null => {
  if (input.isPaused) return 'paused';
  if (!input.signedInToX) return 'signed-out';
  if (input.subscriptionLapsed) return 'sub-lapsed';
  if (input.freeCapHit) return 'free-cap';
  if (!input.serverReachable) return 'server-unreachable';
  if (input.degradedStreak >= DEGRADED_STREAK_LIMIT) return 'degraded';
  if (input.capsSpent) return 'caps-spent';
  if (!input.withinActiveHours) return 'outside-hours';

  // Setup gaps. "Not configured" is the harder failure: there is no source of
  // posts at all. "Feed off" is the subtler one that has quietly cost users
  // weeks — they saved topic feeds or target creators, but search work is gated
  // on the home-feed action toggles (executor.ts doLike = hf.like, and
  // scheduler.ts searchCanAct = homeHasBudget), so nothing ever runs and nothing
  // is ever reported.
  const hasAnySource = input.hasTargets || input.hasSearchQueries || input.homeFeedEnabled;
  if (!hasAnySource) return 'not-configured';
  if (!input.homeFeedEnabled || !input.anyActionEnabled) return 'feed-off';

  // Healthy, but the feed had nothing worth acting on. Not a fault — and the
  // difference between saying this and saying nothing is the difference between
  // a quiet colleague and a dead one.
  if (input.scannedButNoMatch) return 'nothing-matched';

  return null;
};

/** Lower index = higher precedence. Exported for the smoke suite. */
export const precedenceOf = (code: BlockReasonCode): number =>
  BLOCK_REASON_PRECEDENCE.indexOf(code);

/* -- persistence ----------------------------------------------------------- */

export const getBlockReason = async (): Promise<BlockReason | null> => {
  try {
    const got = await chrome.storage.local.get(STORAGE_KEYS.blockReason);
    return (got[STORAGE_KEYS.blockReason] as BlockReason | undefined) ?? null;
  } catch {
    return null;
  }
};

/**
 * Persist the current reason. `since` is preserved when the code is unchanged,
 * so a condition that has held for hours reports as hours rather than resetting
 * on every tick.
 */
export const setBlockReason = async (
  code: BlockReasonCode,
  detail?: string,
): Promise<void> => {
  const existing = await getBlockReason();
  const next: BlockReason = {
    code,
    since: existing?.code === code ? existing.since : Date.now(),
    ...(detail ? { detail } : {}),
  };
  await chrome.storage.local.set({ [STORAGE_KEYS.blockReason]: next });
};

/** Called on any tick that actually dispatches work. */
export const clearBlockReason = async (): Promise<void> => {
  await chrome.storage.local.remove(STORAGE_KEYS.blockReason);
};
