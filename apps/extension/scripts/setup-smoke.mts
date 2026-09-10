/* eslint-disable no-console */
/**
 * Setup smoke — the proposal logic behind step 1.
 *
 * These are the two functions that decide what a brand-new user is told their
 * account is about. Getting them wrong is worse than getting them empty: a
 * confident wrong topic becomes a keyword the engine matches on for weeks.
 *
 * Everything here is pure — the DOM reading and the tab driving are not
 * testable in node, and are covered by the Manual QA in the plan instead.
 *
 * Run with: pnpm --filter @casper/extension setup-smoke
 */
import type { ScannedProfile } from '../src/platforms/common/content-messages.js';
import { extractTopics, rankTargets } from '../src/lib/topics.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

// --- topics: the signal has to beat the noise ------------------------------
const designerPosts = [
  'Shipped a new design system today. Design tokens everywhere.',
  'A design system is only as good as the people maintaining it',
  'Spent the morning on typography for the new landing page',
  'Typography is the whole design, honestly',
  'The best design advice I ever got: ship it and watch people use it',
];
const designerTopics = extractTopics(designerPosts);
assert(designerTopics.includes('design system'), 'a repeated two-word phrase becomes a topic');
assert(designerTopics.includes('typography'), 'a repeated distinctive word becomes a topic');
assert(
  !designerTopics.some((t) => t === 'design'),
  'the phrase "design system" suppresses the vaguer "design" on its own',
);
assert(designerTopics.length <= 6, 'the list stays short enough to read');

// Hashtags are the user saying the subject outright, so they outrank prose.
const hashtagged = extractTopics([
  '#buildinpublic day 4',
  'another #buildinpublic update',
  'the weather is fine and the coffee is cold',
  'coffee again',
]);
assert(hashtagged[0] === 'buildinpublic', 'a repeated hashtag ranks first');

// --- topics: what must NOT come back ---------------------------------------
const noisy = extractTopics([
  'I think that this is really the best thing I have ever seen today',
  'I think that this is really the best thing I have ever seen today',
  'honestly I just think people should know that this is a great day',
]);
assert(!noisy.includes('think'), 'a stopword-adjacent filler verb is not a topic');
assert(!noisy.includes('really'), '"really" is not a topic');
assert(!noisy.includes('best'), '"best" is not a topic');
assert(!noisy.includes('today'), '"today" is not a topic');

assert(extractTopics([]).length === 0, 'no posts → no topics, not a guess');
assert(extractTopics(['hi', 'ok', 'sure']).length === 0, 'nothing substantial → nothing proposed');
assert(
  extractTopics(['check out https://example.com/design-systems please']).length === 0,
  'a url is stripped rather than mined for words',
);
assert(
  !extractTopics(['thanks @levelsio @dhh @levelsio', 'thanks @levelsio again']).includes('levelsio'),
  'an @mention is never a topic — it is a person',
);
assert(
  extractTopics(['one word appears once here', 'nothing repeats in this second post']).length === 0,
  'a word seen once is not a pattern',
);

// A word repeated six times in ONE post is one topic, not six.
const ranting = extractTopics([
  'rust rust rust rust rust rust',
  'today I wrote python',
  'python again today',
]);
assert(ranting[0] === 'python', 'repetition within one post does not outrank two real mentions');

// --- targets ----------------------------------------------------------------
const profile = (handle: string, bio: string): ScannedProfile => ({
  handle,
  name: handle,
  bio,
  profileUrl: `https://x.com/${handle}`,
});

const following = [
  profile('nobio', ''),
  profile('typographer', 'I write about typography and type design all day'),
  profile('gardener', 'tomatoes, mostly'),
  profile('systems', 'building a design system at a big company'),
];
const targets = rankTargets(following, ['typography', 'design system'], 10);

assert(targets.length === 4, 'everyone the user follows is a candidate');
assert(
  targets[0]?.handle === 'systems' || targets[0]?.handle === 'typographer',
  'a bio matching the topics ranks above one that does not',
);
assert(targets[targets.length - 1]?.handle === 'nobio', 'an empty bio sinks to the bottom');
assert(
  targets.find((t) => t.handle === 'nobio') !== undefined,
  'an empty bio still appears — missing evidence is not bad evidence',
);
assert(
  targets.every((t) => t.followers === null),
  'follower counts start null and are filled in by a real profile read, never guessed',
);
assert(
  targets.find((t) => t.handle === 'typographer')?.reason.includes('typography') === true,
  'the reason names the topic that actually matched',
);
assert(
  targets.find((t) => t.handle === 'gardener')?.reason === 'You follow them already',
  'a non-matching account gets an honest reason, not an invented one',
);
assert(rankTargets(following, ['typography'], 2).length === 2, 'the list respects its limit');
assert(rankTargets([], ['design'], 10).length === 0, 'nobody followed → nobody proposed');

// Ranking must be stable: setup can be re-run, and a list that reshuffles on
// identical input makes the user distrust all of it.
const twice = rankTargets(following, ['typography', 'design system'], 10);
assert(
  twice.map((t) => t.handle).join() === targets.map((t) => t.handle).join(),
  'the same input ranks the same way every time',
);

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 setup-smoke OK');
