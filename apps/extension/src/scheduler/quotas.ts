import type { Platform, PlatformCaps, ExtensionSettings } from '@casper/shared';

/**
 * Age-aware multiplier — new accounts get tighter caps so they don't trip
 * platform rate-limits in the first months.
 */
export const ageMultiplier = (months: number | null): number => {
  if (months === null || months < 0) return 0.5; // unknown → conservative
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
): PlatformCaps => {
  const m = ageMultiplier(months);
  return {
    likesPerDay: cap(base.likesPerDay * m * variance),
    commentsPerDay: cap(base.commentsPerDay * m * variance),
    followsPerDay: cap(base.followsPerDay * m * variance),
  };
};

export const platformCapsForToday = (
  settings: ExtensionSettings,
  platform: Platform,
): PlatformCaps => {
  return computeDailyCaps(settings.caps[platform], settings.accountAgeMonths[platform]);
};
