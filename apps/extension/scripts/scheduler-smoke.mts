/* eslint-disable no-console */
/**
 * M3 scheduler unit smoke — pure-function checks for cap math,
 * timezone helpers, and active-hours wraparound. Run with:
 *   pnpm --filter @casper/extension smoke
 */
import { localDate, localHour, isWithinActiveHours, nextActionDelayMs } from '../src/scheduler/timegate.js';
import { ageMultiplier, dailyVarianceFactor, computeDailyCaps } from '../src/scheduler/quotas.js';
import { isFresh } from '../src/platforms/common/freshness.js';
import { extractPostId } from '../src/platforms/common/dedupe.js';
import { parseCount } from '../src/platforms/twitter/stats.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

// --- timegate ---------------------------------------------------------------
const noon = new Date('2026-05-20T12:00:00Z');
assert(localDate(noon, 'UTC') === '2026-05-20', 'localDate UTC noon');
assert(localDate(noon, 'America/New_York') === '2026-05-20', 'localDate ET noon UTC');
assert(localHour(noon, 'UTC') === 12, 'localHour UTC = 12');
assert(localHour(noon, 'America/New_York') === 8, 'localHour ET (UTC noon) = 8 (DST)');

// 9–22 same-day window
assert(isWithinActiveHours(noon, 'UTC', { startHour: 9, endHour: 22 }), 'noon ∈ [9,22)');
assert(!isWithinActiveHours(noon, 'UTC', { startHour: 13, endHour: 22 }), 'noon ∉ [13,22)');
assert(!isWithinActiveHours(noon, 'UTC', { startHour: 9, endHour: 12 }), 'noon ∉ [9,12) — endHour exclusive');

// Overnight (22–6) window
const twoAm = new Date('2026-05-20T02:00:00Z');
const tenPm = new Date('2026-05-20T22:00:00Z');
const fourPm = new Date('2026-05-20T16:00:00Z');
assert(isWithinActiveHours(twoAm, 'UTC', { startHour: 22, endHour: 6 }), '02:00 ∈ overnight [22,6)');
assert(isWithinActiveHours(tenPm, 'UTC', { startHour: 22, endHour: 6 }), '22:00 ∈ overnight [22,6)');
assert(!isWithinActiveHours(fourPm, 'UTC', { startHour: 22, endHour: 6 }), '16:00 ∉ overnight [22,6)');

// Random delay in 8–45s
for (let i = 0; i < 50; i++) {
  const d = nextActionDelayMs();
  if (d < 8_000 || d > 45_000) {
    fails.push(`nextActionDelayMs out of range: ${d}`);
    break;
  }
}
assert(!fails.some((f) => f.startsWith('nextActionDelayMs')), 'nextActionDelayMs always in [8000,45000]');

// --- quotas -----------------------------------------------------------------
// Unknown age is treated as NEW (updateplan 0.3 / D3). This assertion used to
// expect 1.0; that was the defect, not the contract — the age field is optional,
// so "unknown" was the common case and it handed young accounts full caps.
assert(ageMultiplier(null) === 0.5, 'ageMultiplier(null) = 0.5 (unknown age is treated as new)');
assert(ageMultiplier(0) === 0.5, 'ageMultiplier(0mo) = 0.5');
assert(ageMultiplier(5) === 0.5, 'ageMultiplier(<6mo) = 0.5');
assert(ageMultiplier(6) === 0.75, 'ageMultiplier(6mo) = 0.75');
assert(ageMultiplier(11) === 0.75, 'ageMultiplier(<12mo) = 0.75');
assert(ageMultiplier(12) === 1.0, 'ageMultiplier(12mo) = 1.0');
assert(ageMultiplier(60) === 1.0, 'ageMultiplier(5yr) = 1.0');

// dailyVarianceFactor stays inside [0.85, 1.15]
const minV = dailyVarianceFactor(0);
const maxV = dailyVarianceFactor(1);
assert(Math.abs(minV - 0.85) < 1e-9, 'variance(0) = 0.85');
assert(Math.abs(maxV - 1.15) < 1e-9, 'variance(1) = 1.15');

// computeDailyCaps applies age × variance and floors at 1
const base = { likesPerDay: 80, commentsPerDay: 20, followsPerDay: 30 };
const newAcc = computeDailyCaps(base, 0, 1.0);
assert(newAcc.likesPerDay === 40, `new-account likes: 80*0.5*1.0 = ${newAcc.likesPerDay}`);
assert(newAcc.commentsPerDay === 10, `new-account comments: ${newAcc.commentsPerDay}`);
const mature = computeDailyCaps(base, 24, 1.0);
assert(mature.likesPerDay === 80, `mature likes: ${mature.likesPerDay}`);
const unknownAge = computeDailyCaps(base, null, 1.0);
assert(
  unknownAge.likesPerDay === 40,
  `unknown-age likes are halved, not full: ${unknownAge.likesPerDay}`,
);
const tiny = computeDailyCaps({ likesPerDay: 1, commentsPerDay: 1, followsPerDay: 1 }, 0, 0.85);
assert(tiny.likesPerDay >= 1, `floor cap at 1, got ${tiny.likesPerDay}`);

// --- freshness --------------------------------------------------------------
const nowIso = new Date().toISOString();
const oneHourAgo = new Date(Date.now() - 3_600_000).toISOString();
const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
assert(isFresh(nowIso), 'isFresh(now) = true');
assert(isFresh(oneHourAgo), 'isFresh(1h ago) = true');
assert(!isFresh(threeDaysAgo), 'isFresh(3d ago) = false (default 48h window)');
assert(!isFresh(null), 'isFresh(null) = false');
assert(!isFresh('not-a-date'), 'isFresh(bad string) = false');

// --- dedupe post id extraction ---------------------------------------------
assert(
  extractPostId('twitter', 'https://x.com/elonmusk/status/1234567890') === '1234567890',
  'twitter status id from x.com',
);
assert(
  extractPostId('twitter', 'https://twitter.com/elonmusk/status/9999/photo/1') === '9999',
  'twitter id ignores trailing /photo/1',
);
// LinkedIn automation was removed — extractPostId parses /status/ only, so a
// LinkedIn URL is expected to yield nothing rather than an activity id.
assert(
  extractPostId(
    'linkedin',
    'https://www.linkedin.com/feed/update/urn:li:activity:7012345678901234567/',
  ) === null,
  'linkedin urn no longer parsed (automation removed)',
);
assert(extractPostId('twitter', 'https://x.com/home') === null, 'twitter non-status returns null');

// --- growth: count parsing --------------------------------------------------
// The strings X actually renders in profile headers and action-row aria-labels.
assert(parseCount('1,234 Followers') === 1234, 'parseCount thousands separator');
assert(parseCount('12.5K Followers') === 12_500, 'parseCount K suffix');
assert(parseCount('1.2M Followers') === 1_200_000, 'parseCount M suffix');
assert(parseCount('3 456 Followers') === 3456, 'parseCount space-separated locale');
assert(parseCount('0 Following') === 0, 'parseCount zero');
assert(parseCount('27 Likes. Like') === 27, 'parseCount button aria-label');
assert(parseCount('840 posts') === 840, 'parseCount posts subtitle');
assert(parseCount('no numbers here') === null, 'parseCount no digits → null');
assert(parseCount(null) === null, 'parseCount null input');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 scheduler-smoke OK');
