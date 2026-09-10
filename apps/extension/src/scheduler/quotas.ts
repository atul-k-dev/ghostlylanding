import type { Platform, PlatformCaps, ExtensionSettings } from '@casper/shared';
import { warmupFactor } from '../lib/presets.js';

/**
 * Age-aware multiplier — new accounts get tighter caps so they don't trip
 * platform rate-limits in the first months.
 */
export const ageMultiplier = (months: number | null): number => {
  // Unknown age is treated as NEW, not as trusted. The field is optional and the
  // UI told people to leave it blank if unsure, so "unknown" was the most common
  // value in practice — and it silently granted the FULL caps to exactly the
  // accounts most likely to be young and most likely to get limited. When we
  // don't know, we take the safer of the two readings.
  if (months === null || months < 0) return 0.5;
  if (months < 6) return 0.5;
  if (months < 12) return 0.75;
  return 1.0;
};

/** ±15% daily variance — frozen for a given user-local day. */
export const dailyVarianceFactor = (rand: number = Math.random()): number =>
  0.85 + rand * 0.3;

/** Floor at 1 so the variance can't push a cap to 0. */
const cap = (n: number) => Math.max(1, Math.round(n));

/**
 * Compute today's effective caps for a platform.
 * Called once per day per platform when the daily counter resets.
 */
export const computeDailyCaps = (
  base: PlatformCaps,
  months: number | null,
  variance: number = dailyVarianceFactor(),
  /**
   * Warm-up ramp (updateplan 1.3). MULTIPLIES with the age multiplier rather
   * than replacing it: they answer different questions — how old the ACCOUNT is,
   * and how long the AUTOMATION has been running on it. A three-month-old
   * account on day two of its ramp is the riskiest combination there is, and
   * multiplying is the only composition that reflects that.
   */
  warmup: number = 1,
): PlatformCaps => {
  const m = ageMultiplier(months) * Math.max(0, Math.min(1, warmup));
  return {
    likesPerDay: cap(base.likesPerDay * m * variance),
    commentsPerDay: cap(base.commentsPerDay * m * variance),
    followsPerDay: cap(base.followsPerDay * m * variance),
    bookmarksPerDay: cap(base.bookmarksPerDay * m * variance),
    repostsPerDay: cap(base.repostsPerDay * m * variance),
    quotesPerDay: cap(base.quotesPerDay * m * variance),
  };
};

export const platformCapsForToday = (
  settings: ExtensionSettings,
  platform: Platform,
): PlatformCaps => {
  return computeDailyCaps(
    settings.caps[platform],
    settings.accountAgeMonths[platform],
    dailyVarianceFactor(),
    warmupFactor(settings.warmupStartedAt),
  );
};

/**
 * Search feeds' own share of today's caps (updateplan 6.7 — D8).
 *
 * Search feeds used to spend from the SAME daily counter as the home feed, so
 * a home-feed session that had already used up the day's comments left search
 * feeds nothing — even though the user explicitly asked for a separate topic
 * to be worked. A flat fraction of the same (already age/warmup/variance
 * adjusted) caps, tracked on its own counter — not a fourth safety preset,
 * since search feeds are opt-in and additive rather than a pacing choice.
 */
export const SEARCH_BUDGET_SHARE = 0.3;

const shareOf = (n: number): number => Math.max(1, Math.round(n * SEARCH_BUDGET_SHARE));

export const searchCapsForToday = (effectiveCap: PlatformCaps): PlatformCaps => ({
  likesPerDay: shareOf(effectiveCap.likesPerDay),
  commentsPerDay: shareOf(effectiveCap.commentsPerDay),
  followsPerDay: shareOf(effectiveCap.followsPerDay),
  bookmarksPerDay: shareOf(effectiveCap.bookmarksPerDay),
  repostsPerDay: shareOf(effectiveCap.repostsPerDay),
  quotesPerDay: shareOf(effectiveCap.quotesPerDay),
});
