/* eslint-disable no-console */
/**
 * Pacing smoke — the Phase 0 safety guarantees, in one place.
 *
 * `CONTEXT.md` §10 is a customer-facing promise ("8–45 seconds, randomized"),
 * so it gets a test rather than a comment. Grows over Phase 0: the delay range
 * (0.1) lands first, the hourly ceiling (0.2), age multiplier (0.3) and active
 * hours (0.4) follow.
 * Run with: pnpm --filter @casper/extension pacing-smoke
 */
import { ACTION_DELAY_MS, nextActionDelayMs } from '../src/scheduler/timegate.js';
import {
  RATE_WINDOW_MS,
  HOURLY_CEILINGS,
  DEFAULT_HOURLY_CEILING,
  pruneWindow,
  actionsInWindow,
  slotsLeft,
  canAct,
  msUntilNextSlot,
} from '../src/scheduler/rate-limit.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

// --- 0.1 the documented delay range ----------------------------------------
assert(ACTION_DELAY_MS.min >= 8_000, 'action delay floor is at least 8s');
assert(ACTION_DELAY_MS.max <= 45_000, 'action delay ceiling is at most 45s');
assert(ACTION_DELAY_MS.min < ACTION_DELAY_MS.max, 'the range is not inverted');

// The scheduler's tick spacing must come from the same constant, or the two
// halves of "8–45s" drift apart again — which is exactly defect D1.
let low = Number.POSITIVE_INFINITY;
let high = 0;
for (let i = 0; i < 2_000; i += 1) {
  const d = nextActionDelayMs();
  low = Math.min(low, d);
  high = Math.max(high, d);
}
assert(low >= ACTION_DELAY_MS.min, 'nextActionDelayMs never returns under the floor');
assert(high <= ACTION_DELAY_MS.max, 'nextActionDelayMs never returns over the ceiling');
assert(high - low > 20_000, 'nextActionDelayMs actually varies across the range');

// --- 0.2 the rolling hourly ceiling ----------------------------------------
const T0 = 1_757_500_000_000; // fixed epoch — these assertions must not drift
const spread = (count: number, from: number, everyMs: number): number[] =>
  Array.from({ length: count }, (_, i) => from + i * everyMs);

assert(DEFAULT_HOURLY_CEILING === HOURLY_CEILINGS.balanced, 'Balanced is the default ceiling');
assert(HOURLY_CEILINGS.careful < HOURLY_CEILINGS.balanced, 'Careful is slower than Balanced');
assert(HOURLY_CEILINGS.balanced < HOURLY_CEILINGS.growth, 'Growth is faster than Balanced');
assert(RATE_WINDOW_MS === 3_600_000, 'the window is 60 minutes');

// 30 actions inside one hour, one per minute, ending at T0.
const full = spread(30, T0 - 29 * 60_000, 60_000);
assert(actionsInWindow(full, T0) === 30, '30 actions inside the hour are all counted');
assert(!canAct(full, T0), '30 recorded actions inside one hour → cannot act');
assert(slotsLeft(full, T0) === 0, 'no slots left at the ceiling');
assert(canAct(full.slice(1), T0), '29 actions → can still act');
assert(slotsLeft(full.slice(1), T0) === 1, 'one slot left just under the ceiling');

// Roll the window past the oldest action and a slot opens — no clock-hour reset.
const justAfter = full[0]! + RATE_WINDOW_MS + 1;
assert(canAct(full, justAfter), 'after the window rolls → can act again');
assert(actionsInWindow(full, justAfter) === 29, 'only the aged-out action leaves');
assert(
  msUntilNextSlot(full, T0) === full[0]! + RATE_WINDOW_MS - T0,
  'the wait is until the OLDEST action ages out',
);
assert(msUntilNextSlot(full, justAfter) === 0, 'no wait once there is room');
assert(msUntilNextSlot(full.slice(1), T0) === 0, 'no wait below the ceiling');

// An empty window never blocks, and a burst is bounded by the ceiling, not by
// how long ago the burst happened.
assert(canAct([], T0), 'a fresh window lets the first action through');
assert(slotsLeft([], T0) === DEFAULT_HOURLY_CEILING, 'a fresh window has the full ceiling');
const burst = spread(30, T0 - 5_000, 100); // 30 actions in 3 seconds
assert(!canAct(burst, T0 + 60_000), 'a 3-second burst still blocks a minute later');
assert(canAct(burst, T0 + RATE_WINDOW_MS + 10_000), 'the same burst clears an hour later');

// Ceilings are per-preset, and lowering one mid-hour must not divide by zero or
// hand out a slot early.
assert(!canAct(full, T0, HOURLY_CEILINGS.careful), 'a full hour also blocks under Careful');
assert(canAct(full, T0, HOURLY_CEILINGS.growth), 'the same hour has room under Growth');
assert(
  msUntilNextSlot(full, T0, HOURLY_CEILINGS.careful) > msUntilNextSlot(full, T0),
  'a lower ceiling means a longer wait, not a wrong one',
);

// Pruning is what keeps the stored window from growing without bound.
assert(pruneWindow([T0 - RATE_WINDOW_MS - 1, T0], T0).length === 1, 'aged-out entries are dropped');
assert(
  pruneWindow([T0, T0 - 1_000], T0).join() === [T0 - 1_000, T0].join(),
  'the pruned window comes back oldest-first',
);

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 pacing-smoke OK');
