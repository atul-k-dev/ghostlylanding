/**
 * Pure follower-series maths for the growth scoreboard. Kept out of the route
 * so it can be reasoned about (and exercised) without Express or Mongo.
 */
import type { GrowthDelta } from '@casper/shared';

export interface SeriesPoint {
  /** YYYY-MM-DD. */
  date: string;
  followers: number;
}

/** Whole days between two YYYY-MM-DD strings (b - a). Timezone-free by design:
 *  the dates were already resolved in the user's zone when they were recorded. */
export const daysBetween = (a: string, b: string): number =>
  Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86_400_000);

/**
 * Follower change over the last `window` days, given an oldest-first series.
 *
 * The baseline is the reading whose age is CLOSEST to `window` — not simply the
 * newest one old enough. Readings are daily but gappy in practice (the browser
 * has to be open), so "newest at least 7 days old" can land on a 15-day-old
 * point when the user was away, and quietly report a fortnight of growth in the
 * weekly tile. Ties go to the older reading, which spans more.
 *
 * `days` is always the span actually measured, so the UI can label it honestly
 * ("+21 over 2d") instead of implying history it doesn't have. `change: null`
 * means there's no second reading to compare against yet.
 */
export const deltaOver = (series: SeriesPoint[], window: number): GrowthDelta => {
  const latest = series[series.length - 1];
  if (!latest || series.length < 2) return { change: null, days: 0 };

  let baseline: SeriesPoint | null = null;
  let baselineAge = 0;
  for (const point of series.slice(0, -1)) {
    const age = daysBetween(point.date, latest.date);
    if (age <= 0) continue;
    const better =
      baseline === null ||
      Math.abs(age - window) < Math.abs(baselineAge - window) ||
      (Math.abs(age - window) === Math.abs(baselineAge - window) && age > baselineAge);
    if (better) {
      baseline = point;
      baselineAge = age;
    }
  }
  if (!baseline) return { change: null, days: 0 };

  return { change: latest.followers - baseline.followers, days: baselineAge };
};
