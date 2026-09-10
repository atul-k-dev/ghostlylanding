/* eslint-disable no-console */
/**
 * Weekly auto-tune smoke (updateplan 6.1).
 *
 * Pins the two pure decisions: WHEN it's due (local-only, no network implied),
 * and WHICH targets it would drop (always a subset of the ones already
 * flagged `stale` by the Growth tab's own threshold — never a second,
 * looser rule invented for the unattended path).
 *
 * Run with: pnpm --filter @casper/extension auto-tune-smoke
 */
import { isAutoTuneDue, dropHandlesFor, AUTO_TUNE_INTERVAL_DAYS } from '../src/scheduler/auto-tune.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

const NOW = Date.parse('2026-09-11T12:00:00Z');
const DAY_MS = 86_400_000;

// --- isAutoTuneDue -----------------------------------------------------------
assert(!isAutoTuneDue(false, null, NOW), 'disabled is never due, even with no prior run');
assert(!isAutoTuneDue(false, new Date(NOW - 30 * DAY_MS).toISOString(), NOW), 'disabled is never due, regardless of last run');
assert(isAutoTuneDue(true, null, NOW), 'enabled with no prior run is due immediately');
assert(
  isAutoTuneDue(true, new Date(NOW - (AUTO_TUNE_INTERVAL_DAYS + 1) * DAY_MS).toISOString(), NOW),
  'enabled and a week+ since the last run is due',
);
assert(
  !isAutoTuneDue(true, new Date(NOW - (AUTO_TUNE_INTERVAL_DAYS - 1) * DAY_MS).toISOString(), NOW),
  'enabled but under a week since the last run is not due',
);
assert(
  isAutoTuneDue(true, 'not a real date', NOW),
  'an unparseable lastRunAt is treated as "never run" — due, not silently blocked forever',
);
assert(
  isAutoTuneDue(true, new Date(NOW - AUTO_TUNE_INTERVAL_DAYS * DAY_MS).toISOString(), NOW),
  'exactly on the boundary is due (>= not >)',
);

// --- dropHandlesFor ----------------------------------------------------------
assert(
  JSON.stringify(dropHandlesFor([])) === '[]',
  'no targets at all → nothing to drop',
);
assert(
  JSON.stringify(dropHandlesFor([{ handle: 'levelsio', stale: false }])) === '[]',
  'an active target is never dropped',
);
const mixed = [
  { handle: 'levelsio', stale: false },
  { handle: 'quietOne', stale: true },
  { handle: 'naval', stale: false },
  { handle: 'goneQuiet', stale: true },
];
const dropped = dropHandlesFor(mixed);
assert(dropped.length === 2, 'only the stale targets are dropped (2 of 4)');
assert(dropped.includes('quietOne') && dropped.includes('goneQuiet'), 'the exact stale handles are the ones dropped');
assert(!dropped.includes('levelsio') && !dropped.includes('naval'), 'active targets never appear in the drop list');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 auto-tune-smoke OK');
