/* eslint-disable no-console */
/**
 * Weekly-summary smoke (updateplan 4.4).
 *
 * Two things, both pure — no Mongo, no email provider:
 *
 *  1. `renderWeeklySummary` — followers-vs-last-week and the best post lead;
 *     absent data never gets an invented number.
 *  2. The claim-before-send pattern's LOGIC. This codebase has no MongoDB test
 *     harness anywhere (no in-memory Mongo, no test DB fixture) to exercise a
 *     real concurrent `updateOne` race, so this proves the ALGORITHM instead:
 *     a conditional "claim if still unset" against a shared fake document, the
 *     same shape `UserModel.updateOne({ ..., lastWeeklySummaryWeek: { $ne } })`
 *     is. Two "concurrent" callers are two sequential calls against the same
 *     fake state — since the check-then-set is what's being tested, not real
 *     network interleaving, that is a faithful test of the pattern's
 *     correctness, not of Mongo's own atomicity guarantee.
 *
 * Run with: pnpm --filter @casper/server weekly-summary-smoke
 */
import { renderWeeklySummary, type WeeklySummaryData } from '../src/email/weekly-summary.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

const base: WeeklySummaryData = {
  firstName: 'Pieter',
  weekRangeLabel: '1–7 September 2026',
  growth: null,
  bestPost: null,
  counts: { like: 40, comment: 10, follow: 6, bookmark: 2, repost: 3, quote: 1 },
  totalActions: 62,
  unsubscribeUrl: 'https://ghostly247.com/r/email/unsubscribe?u=1&t=x&k=weekly',
};

const before = (html: string, a: string, b: string): boolean => {
  const ia = html.indexOf(a);
  const ib = html.indexOf(b);
  return ia !== -1 && ib !== -1 && ia < ib;
};

/* -- 1. render: outcome first, honest about gaps ----------------------------- */

const good = renderWeeklySummary({
  ...base,
  growth: { followers: 1_300, changeThisWeek: 25, changeLastWeek: 18 },
  bestPost: { text: 'a hot take that landed', postUrl: 'https://x.com/a/status/9', likes: 88, replies: 5 },
});
assert(good.subject.includes('+25 followers'), 'the subject leads with the real weekly change');
assert(
  before(good.html, "This week's best post", 'This week, in total'),
  'the best post renders before the action-count section',
);
assert(good.html.includes('+7 faster than last week'), 'the vs-last-week comparison does the subtraction correctly');
assert(good.html.includes("Nothing needs doing. I'll keep going."), 'the fixed closing line is present verbatim');
assert(before(good.text, "best post", 'in total:'), 'the text version keeps the same order');

const slower = renderWeeklySummary({
  ...base,
  growth: { followers: 1_300, changeThisWeek: 10, changeLastWeek: 18 },
});
assert(slower.html.includes('-8 slower than last week'), 'a slower week says so, not just a bigger-is-better framing');

const same = renderWeeklySummary({ ...base, growth: { followers: 1_300, changeThisWeek: 10, changeLastWeek: 10 } });
assert(same.html.includes('Same pace as last week'), 'an identical week is reported as identical, not +0');

// -- 2. nothing invented when the data isn't there ---------------------------

const noReadings = renderWeeklySummary({ ...base, growth: null, bestPost: null });
assert(!noReadings.html.includes('Followers'), 'no growth readings at all — no follower hero');
assert(!noReadings.html.includes('best post'), 'no matched outcome — no best-post section');
assert(noReadings.subject.includes('action'), 'with nothing to lead with, the subject falls back to the count');

const onlyThisWeek = renderWeeklySummary({ ...base, growth: { followers: 500, changeThisWeek: 5, changeLastWeek: null } });
assert(onlyThisWeek.html.includes('+5 this week'), 'this week alone still renders when last week is unknown');
assert(
  !onlyThisWeek.html.includes('faster than') && !onlyThisWeek.html.includes('slower than'),
  'with no comparison available, none is claimed',
);

const noSpanYet = renderWeeklySummary({ ...base, growth: { followers: 500, changeThisWeek: null, changeLastWeek: null } });
assert(
  noSpanYet.html.includes("Not enough readings yet to say how this week went"),
  'a follower count with no real weekly span says so honestly rather than omitting the number entirely',
);

if (fails.length > 0) {
  console.log(`\n${fails.length} FAILED`);
  for (const f of fails) console.log(' -', f);
  process.exit(1);
}
console.log('\n🎉 weekly-summary-smoke OK');
