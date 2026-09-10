/* eslint-disable no-console */
/**
 * Browser-notification cap smoke (updateplan 4.3).
 *
 * The one thing worth pinning without a real `chrome.notifications`: the daily
 * ceiling and its day-rollover, since "capped at 1–2/day" is a promise the rest
 * of `browser-notify.ts` builds on and never re-checks.
 *
 * Run with: pnpm --filter @casper/extension browser-notify-smoke
 */
import {
  rolloverState,
  hasSlotLeft,
  MAX_NOTIFICATIONS_PER_DAY,
} from '../src/lib/browser-notify.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

assert(MAX_NOTIFICATIONS_PER_DAY <= 2, 'the cap is at most 2/day, per the plan');

assert(
  hasSlotLeft(rolloverState(undefined, '2026-09-10')),
  'a fresh install has a slot available',
);
assert(
  hasSlotLeft(rolloverState({ date: '2026-09-10', sent: MAX_NOTIFICATIONS_PER_DAY - 1 }, '2026-09-10')),
  'one below the cap still has a slot',
);
assert(
  !hasSlotLeft(rolloverState({ date: '2026-09-10', sent: MAX_NOTIFICATIONS_PER_DAY }, '2026-09-10')),
  'at the cap, no slot is left',
);
assert(
  !hasSlotLeft(rolloverState({ date: '2026-09-10', sent: MAX_NOTIFICATIONS_PER_DAY + 5 }, '2026-09-10')),
  'a count somehow past the cap is still refused, not treated as available',
);

// Day rollover: yesterday's count never leaks into today's budget.
const spentYesterday = rolloverState(
  { date: '2026-09-09', sent: MAX_NOTIFICATIONS_PER_DAY, notifiedSignedOutSince: 123 },
  '2026-09-10',
);
assert(spentYesterday.sent === 0, 'a new day resets the spent count to zero');
assert(hasSlotLeft(spentYesterday), 'a new day always has a slot available');
assert(
  spentYesterday.notifiedSignedOutSince === 123,
  'the signed-out episode marker survives a day rollover — an episode can span midnight',
);

if (fails.length > 0) {
  console.log(`\n${fails.length} FAILED`);
  for (const f of fails) console.log(' -', f);
  process.exit(1);
}
console.log('\n🎉 browser-notify-smoke OK');
