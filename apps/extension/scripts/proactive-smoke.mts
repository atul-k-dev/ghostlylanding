/* eslint-disable no-console */
/**
 * Proactive-nudge smoke (updateplan 6.2).
 *
 * Every detector here is a deterministic pattern over real data — no model
 * call, so nothing here can hallucinate a trend that isn't there. Pins each
 * detector's threshold (so it doesn't fire on noise) AND that it DOES fire
 * on the plan's own three examples, plus the "only one at a time" priority.
 *
 * Run with: pnpm --filter @casper/extension proactive-smoke
 */
import type { PostOutcome, TargetPerformance } from '@casper/shared';
import type { CorrectedDraft } from '../src/lib/storage.js';
import {
  detectStandoutDay,
  detectTargetsQuiet,
  detectEditsShorter,
  detectProactiveNudge,
} from '../src/lib/proactive.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

// --- detectStandoutDay -------------------------------------------------------
const post = (id: number, isoDate: string, likes: number, isReply = false): PostOutcome => ({
  tweetId: `t${id}`,
  url: `https://x.com/me/status/${id}`,
  text: `post ${id}`,
  isReply,
  likes,
  replies: 0,
  reposts: 0,
  views: null,
  publishedAt: isoDate,
  repliedToHandle: null,
});

// 2026-09-08 and 2026-09-15 are both Tuesdays.
const standout: PostOutcome[] = [
  post(1, '2026-09-08T12:00:00Z', 100),
  post(2, '2026-09-15T12:00:00Z', 90),
  post(3, '2026-09-09T12:00:00Z', 5), // Wednesday
  post(4, '2026-09-10T12:00:00Z', 6), // Thursday
  post(5, '2026-09-16T12:00:00Z', 4), // Wednesday
];
const standoutResult = detectStandoutDay(standout);
assert(standoutResult !== null, 'a real 4x+ standout day is detected');
assert(!!standoutResult?.message.includes('Tuesday'), 'names the actual standout weekday');

assert(detectStandoutDay([]) === null, 'no outcomes at all → no nudge');
assert(
  detectStandoutDay([post(1, '2026-09-08T12:00:00Z', 100), post(2, '2026-09-09T12:00:00Z', 5)]) === null,
  'a single post on the standout day is not enough (needs ≥2 per day)',
);
const mild: PostOutcome[] = [
  post(1, '2026-09-08T12:00:00Z', 12),
  post(2, '2026-09-15T12:00:00Z', 11),
  post(3, '2026-09-09T12:00:00Z', 10),
  post(4, '2026-09-10T12:00:00Z', 9),
];
assert(detectStandoutDay(mild) === null, 'a mild difference (well under 4x) does not trip the nudge');
assert(
  detectStandoutDay([
    post(1, '2026-09-08T12:00:00Z', 5, true),
    post(2, '2026-09-15T12:00:00Z', 5, true),
    post(3, '2026-09-09T12:00:00Z', 100, true),
    post(4, '2026-09-10T12:00:00Z', 90, true),
  ]) === null,
  'replies are excluded — same reasoning as best-times (they describe engine hours, not the audience)',
);

// --- detectTargetsQuiet -------------------------------------------------------
const target = (handle: string, stale: boolean): TargetPerformance => ({
  handle,
  repliesSent: stale ? 0 : 5,
  engagement: { likes: 0, replies: 0, reposts: 0, views: 0 },
  lastActionAt: null,
  stale,
});

assert(detectTargetsQuiet([target('a', true), target('b', false)]) === null, 'fewer than 3 targets never nudges');
const fiveTargets = [target('a', true), target('b', true), target('c', true), target('d', false), target('e', false)];
const quietResult = detectTargetsQuiet(fiveTargets);
assert(quietResult !== null, '3 of 5 quiet (a majority) nudges');
assert(quietResult?.message.includes('3 of 5') ?? false, 'names the real counts');
assert(
  detectTargetsQuiet([target('a', true), target('b', false), target('c', false)]) === null,
  '1 of 3 quiet (not a majority) does not nudge',
);

// --- detectEditsShorter -------------------------------------------------------
const edit = (generated: string, corrected: string): CorrectedDraft => ({
  postText: 'p',
  generated,
  corrected,
  at: new Date().toISOString(),
});
const longGen = 'x'.repeat(100);
const shortCorrected = 'x'.repeat(40);
const shorterSix = Array.from({ length: 6 }, () => edit(longGen, shortCorrected));
assert(detectEditsShorter(shorterSix) !== null, '6 consistently-shortened edits nudges');
assert(detectEditsShorter(shorterSix.slice(0, 5)) === null, 'fewer than the sample size never nudges');
const mixedEdits = [
  edit(longGen, shortCorrected),
  edit(longGen, shortCorrected),
  edit(longGen, shortCorrected),
  edit(longGen, 'x'.repeat(98)), // barely trimmed, not "shorter"
  edit(longGen, 'x'.repeat(99)),
  edit(longGen, 'x'.repeat(150)), // actually LONGER
];
assert(detectEditsShorter(mixedEdits) === null, 'a mixed bag under the majority threshold does not nudge');

// --- detectProactiveNudge: one at a time, priority order ---------------------
const only = detectProactiveNudge({ outcomes: [], targets: [], corrected: [] });
assert(only === null, 'nothing detected at all → null, not a fabricated nudge');

const both = detectProactiveNudge({ outcomes: standout, targets: fiveTargets, corrected: shorterSix });
assert(both?.kind === 'targets-quiet', 'when multiple patterns are true at once, only ONE comes back (targets-quiet wins priority)');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 proactive-smoke OK');
