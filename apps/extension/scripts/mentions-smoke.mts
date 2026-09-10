/* eslint-disable no-console */
/**
 * Mentions smoke (updateplan 4.1/4.2).
 *
 * Pure logic only — classification, prioritisation and dedupe — the same split
 * as `block-reason.ts` and `topics.ts`: the DOM side gathers plain data, this
 * decides everything, and this is what can be pinned down in plain node.
 *
 * Run with: pnpm --filter @casper/extension mentions-smoke
 */
import {
  classifyMention,
  mentionPriority,
  rankMentions,
  dedupeMentions,
  type MentionCandidate,
} from '../src/lib/mentions.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};
const eq = (actual: unknown, expected: unknown, label: string) => {
  const ok = actual === expected;
  assert(ok, ok ? label : `${label}\n    got:  ${String(actual)}\n    want: ${String(expected)}`);
};

/* -- 1. classification: the three shapes X renders -------------------------- */

eq(
  classifyMention({
    text: 'totally agree with this',
    ownHandle: '@levelsio',
    replyingToHandles: ['@levelsio'],
    quotedAuthorHandle: null,
  }),
  'reply-to-your-post',
  'a reply that names the own handle in "Replying to" is a reply-to-your-post',
);
eq(
  classifyMention({
    text: 'check this out',
    ownHandle: 'levelsio',
    replyingToHandles: [],
    quotedAuthorHandle: '@levelsio',
  }),
  'quote-of-your-post',
  'a quote box whose author is the own handle is a quote-of-your-post',
);
eq(
  classifyMention({
    text: 'hey @levelsio thoughts on this?',
    ownHandle: 'levelsio',
    replyingToHandles: [],
    quotedAuthorHandle: null,
  }),
  'mention',
  'no reply context and no quote box is a cold mention',
);
eq(
  classifyMention({
    text: 'replying to someone else entirely',
    ownHandle: 'levelsio',
    replyingToHandles: ['@someone_else'],
    quotedAuthorHandle: null,
  }),
  'mention',
  'a "Replying to" line that does NOT name the own handle is not a reply-to-your-post',
);
eq(
  classifyMention({
    text: 'x',
    ownHandle: '@Levelsio',
    replyingToHandles: ['levelsio'],
    quotedAuthorHandle: null,
  }),
  'reply-to-your-post',
  'the @ and case are normalised on both sides',
);
eq(
  classifyMention({ text: 'x', ownHandle: null, replyingToHandles: ['@levelsio'], quotedAuthorHandle: null }),
  'mention',
  'with no own handle known, nothing can be classified as answering it',
);
// A reply that ALSO happens to quote something: reply wins — it's checked first
// because it is more clearly a live conversation than a quote is.
eq(
  classifyMention({
    text: 'x',
    ownHandle: 'levelsio',
    replyingToHandles: ['@levelsio'],
    quotedAuthorHandle: '@levelsio',
  }),
  'reply-to-your-post',
  'reply-to-your-post is checked before quote-of-your-post',
);

/* -- 2. prioritisation: a big account decays FASTER, not just "bigger wins" - */

const c = (overrides: Partial<MentionCandidate>): MentionCandidate => ({
  postId: 'p',
  postUrl: 'https://x.com/x/status/1',
  authorHandle: null,
  text: 'x',
  publishedAt: null,
  type: 'mention',
  authorFollowers: null,
  ...overrides,
});

const now = Date.parse('2026-09-10T12:00:00Z');
const minutesAgo = (m: number): string => new Date(now - m * 60_000).toISOString();

const bigFresh = mentionPriority({ authorFollowers: 40_000, publishedAt: minutesAgo(0) }, now);
const smallTwoHoursOld = mentionPriority({ authorFollowers: 200, publishedAt: minutesAgo(120) }, now);
const bigSixHoursOld = mentionPriority({ authorFollowers: 40_000, publishedAt: minutesAgo(360) }, now);

assert(
  bigFresh > smallTwoHoursOld,
  'a brand-new mention from a big account outranks an older one from a small account',
);
assert(
  smallTwoHoursOld > bigSixHoursOld,
  'the big account decays fast enough that a smaller, fresher mention overtakes it — "decays fastest" is real, not just a bigger number',
);

const sameAgeSmall = mentionPriority({ authorFollowers: 50, publishedAt: minutesAgo(10) }, now);
const sameAgeBig = mentionPriority({ authorFollowers: 500_000, publishedAt: minutesAgo(10) }, now);
assert(sameAgeBig > sameAgeSmall, 'at the same age, the bigger account still ranks higher');

const unknownFollowers = mentionPriority({ authorFollowers: null, publishedAt: minutesAgo(0) }, now);
assert(
  unknownFollowers > 0 && unknownFollowers < bigFresh,
  'an unknown follower count scores as a small account, not zero and not average',
);

/* -- 3. ranking: order, and stable tie-breaking ------------------------------ */

const ranked = rankMentions(
  [
    c({ postId: 'small-old', authorFollowers: 200, publishedAt: minutesAgo(120) }),
    c({ postId: 'big-fresh', authorFollowers: 40_000, publishedAt: minutesAgo(0) }),
    c({ postId: 'big-stale', authorFollowers: 40_000, publishedAt: minutesAgo(360) }),
  ],
  now,
);
eq(
  ranked.map((r) => r.postId).join(','),
  'big-fresh,small-old,big-stale',
  'ranking orders by priority, not by follower count alone',
);

const tie = rankMentions(
  [
    c({ postId: 'older', authorFollowers: 100, publishedAt: minutesAgo(30) }),
    c({ postId: 'newer', authorFollowers: 100, publishedAt: minutesAgo(30) }),
  ],
  now,
);
eq(tie.length, 2, 'a tie still returns every candidate');

assert(
  rankMentions([], now).length === 0,
  'ranking an empty list is a no-op, not an error',
);

/* -- 4. dedupe: never drafted twice ------------------------------------------ */

const candidates = [c({ postId: 'a' }), c({ postId: 'b' }), c({ postId: 'c' })];
const handled = new Set(['b']);
eq(
  dedupeMentions(candidates, handled)
    .map((m) => m.postId)
    .join(','),
  'a,c',
  'an already-handled mention is dropped, the rest pass through',
);
eq(
  dedupeMentions(candidates, new Set()).length,
  3,
  'nothing handled yet means nothing is filtered',
);
eq(
  dedupeMentions(candidates, new Set(['a', 'b', 'c'])).length,
  0,
  'everything already handled means nothing is drafted again',
);

if (fails.length > 0) {
  console.log(`\n${fails.length} FAILED`);
  for (const f of fails) console.log(' -', f);
  process.exit(1);
}
console.log('\n🎉 mentions-smoke OK');
