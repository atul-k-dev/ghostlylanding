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

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 pacing-smoke OK');
