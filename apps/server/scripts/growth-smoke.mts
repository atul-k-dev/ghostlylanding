/* eslint-disable no-console */
/**
 * Growth scoreboard unit smoke — pure follower-series maths, no DB, no server.
 * Run with:
 *   pnpm --filter @casper/server growth-smoke
 */
import { deltaOver, daysBetween, type SeriesPoint } from '../src/growth/series.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

const p = (date: string, followers: number): SeriesPoint => ({ date, followers });
const eq = (got: unknown, want: unknown): boolean =>
  JSON.stringify(got) === JSON.stringify(want);

// --- daysBetween ------------------------------------------------------------
assert(daysBetween('2026-08-30', '2026-09-04') === 5, 'daysBetween across a month boundary');
assert(daysBetween('2026-09-04', '2026-09-04') === 0, 'daysBetween same day');

// --- deltaOver --------------------------------------------------------------
// A single reading can't produce a delta — the UI shows "needs 2 readings".
assert(eq(deltaOver([p('2026-09-04', 100)], 7), { change: null, days: 0 }), 'one reading → null');
assert(
  eq(deltaOver([p('2026-09-04', 100), p('2026-09-04', 100)], 7), { change: null, days: 0 }),
  'same-day duplicates → null (never a zero-day baseline)',
);

assert(
  eq(deltaOver([p('2026-09-03', 100), p('2026-09-04', 112)], 1), { change: 12, days: 1 }),
  'day-over-day delta',
);
assert(
  eq(deltaOver([p('2026-09-03', 500), p('2026-09-04', 488)], 1), { change: -12, days: 1 }),
  'followers can go down',
);

// Three days of history asked for a month: falls back to the oldest reading and
// reports the span it actually covers, rather than implying 30 days.
const short = [p('2026-09-02', 100), p('2026-09-03', 108), p('2026-09-04', 121)];
assert(eq(deltaOver(short, 30), { change: 21, days: 2 }), 'short history reports its real span');

// A full month of daily readings, +5/day.
const month: SeriesPoint[] = Array.from({ length: 31 }, (_, i) =>
  p(`2026-09-${String(i + 1).padStart(2, '0')}`, 1_000 + i * 5),
);
assert(eq(deltaOver(month, 7), { change: 35, days: 7 }), '7d window on full history');
assert(eq(deltaOver(month, 30), { change: 150, days: 30 }), '30d window on full history');

// Gappy readings (the browser has to be open, so gaps are normal). The weekly
// tile must pick the reading NEAREST 7 days, not the newest one merely old
// enough — otherwise a fortnight of growth gets reported as a week's.
const gappy = [p('2026-08-20', 200), p('2026-09-01', 260), p('2026-09-04', 280)];
assert(eq(deltaOver(gappy, 7), { change: 20, days: 3 }), 'gappy 7d picks the nearest reading');
assert(eq(deltaOver(gappy, 30), { change: 80, days: 15 }), 'gappy 30d reaches back further');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 growth-smoke OK');
