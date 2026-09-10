/* eslint-disable no-console */
/**
 * Daily-summary render smoke (updateplan 4.5).
 *
 * `renderDailySummary` is pure — HTML/text in, no DB, no email provider — so
 * the reframe (followers + best reply lead, action counts below the fold) can
 * be pinned directly: which section a string appears in, not just that the
 * string exists somewhere in the output.
 *
 * Run with: pnpm --filter @casper/server daily-summary-smoke
 */
import { renderDailySummary, type DailySummaryData } from '../src/email/daily-summary.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

const base: DailySummaryData = {
  firstName: 'Pieter',
  dateLabel: 'Tuesday, 9 September 2026',
  counts: { like: 12, comment: 3, follow: 2, bookmark: 0, repost: 1, quote: 0 },
  totalActions: 18,
  replies: [{ text: 'totally agree with this take', postUrl: 'https://x.com/a/status/1', tone: 'friendly' }],
  moreReplies: 0,
  follows: [{ handle: 'levelsio', url: 'https://x.com/levelsio' }],
  moreFollows: 0,
  unsubscribeUrl: 'https://ghostly247.com/r/email/unsubscribe?u=1&t=x',
};

/** Index-of ordering check: `a` appears strictly before `b` in the HTML. */
const before = (html: string, a: string, b: string): boolean => {
  const ia = html.indexOf(a);
  const ib = html.indexOf(b);
  return ia !== -1 && ib !== -1 && ia < ib;
};

// -- 1. followers lead, action counts below the fold -------------------------

const withGrowthAndBest = renderDailySummary({
  ...base,
  growth: { followers: 1_240, change: 18, days: 7 },
  dayChange: { followers: 1_240, change: 3 },
  bestReply: { text: 'totally agree with this take', postUrl: 'https://x.com/a/status/1', likes: 42, replies: 2 },
});

assert(
  before(withGrowthAndBest.html, 'Yesterday\'s best reply', 'What I did'),
  'the best-reply callout renders before the action-count section',
);
assert(
  before(withGrowthAndBest.html, '>1,240<', 'What I did'),
  'the follower hero number renders before the action-count section',
);
assert(
  before(withGrowthAndBest.html, '+3 yesterday', '+18 over the last 7 days'),
  'the day-over-day change leads; the 7-day trend sits underneath as context',
);
assert(
  withGrowthAndBest.subject.includes('+3 followers'),
  'the subject line leads with the real day-over-day number',
);
assert(
  before(withGrowthAndBest.text, "Yesterday's best reply", 'What I did:'),
  'the text version keeps the same order: outcome first, activity second',
);

// -- 2. no growth scan yet: nothing invented ----------------------------------

const freshInstall = renderDailySummary({ ...base, growth: null, dayChange: null, bestReply: null });
assert(!freshInstall.html.includes('Followers'), 'no growth reading yet — no follower hero at all');
assert(
  !freshInstall.html.includes("best reply"),
  'no matched outcome — no best-reply section, not a guessed one',
);
assert(
  freshInstall.subject.includes('action'),
  'with no day-over-day number, the subject falls back to the action count',
);

// -- 3. a weekly trend without a same-day pair is shown as trend, not "today" -

const weekOnly = renderDailySummary({ ...base, growth: { followers: 900, change: 40, days: 9 }, dayChange: null, bestReply: null });
assert(weekOnly.html.includes('>900<'), 'the follower count still leads when only the weekly trend is known');
assert(
  !weekOnly.html.includes('+40 yesterday') && !weekOnly.html.includes('followers gained yesterday'),
  'without a real day-over-day reading, the hero never claims yesterday\'s change specifically',
);
assert(
  weekOnly.subject.includes('action'),
  'no day-over-day number means the subject does not claim one',
);

// -- 4. a reply with zero likes is still named honestly -----------------------

const zeroLikes = renderDailySummary({
  ...base,
  growth: null,
  dayChange: null,
  bestReply: { text: 'x', postUrl: 'https://x.com/a/status/2', likes: 0, replies: 0 },
});
assert(zeroLikes.html.includes('0 likes'), 'zero likes is stated plainly, not hidden or rounded away');

if (fails.length > 0) {
  console.log(`\n${fails.length} FAILED`);
  for (const f of fails) console.log(' -', f);
  process.exit(1);
}
console.log('\n🎉 daily-summary-smoke OK');
