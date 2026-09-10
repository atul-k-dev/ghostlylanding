/* eslint-disable no-console */
/**
 * Follow quality + whitelist smoke (updateplan 6.5/6.6 — D7/D9).
 *
 * Covers the two pure pieces: the bio-keyword filter, and the whitelist check
 * shared by every follow path (`isWhitelisted`). Deliberately does NOT cover
 * follower-count or recent-activity filtering — neither is built. A
 * followers-list cell never renders either figure, so filtering on them would
 * mean a profile visit per candidate, which contradicts `runInlineFollowList`'s
 * whole "no more per-candidate tabs" design (see the Phase 6 progress log).
 *
 * Run with: pnpm --filter @casper/extension follow-filter-smoke
 */
import { passesFollowFilter } from '../src/lib/follow-filter.js';
import { isWhitelisted, normalizeHandle } from '../src/lib/whitelist.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

// --- passesFollowFilter ------------------------------------------------------
const NONE = { keywords: [], excludeKeywords: [] };
assert(passesFollowFilter('literally anything', NONE), 'empty filter passes everyone, as today');
assert(passesFollowFilter('', NONE), 'even an empty bio passes an empty filter');

const DESIGN = { keywords: ['design'], excludeKeywords: [] };
assert(passesFollowFilter('I write about design systems', DESIGN), 'bio matching a keyword passes');
assert(!passesFollowFilter('I love cooking', DESIGN), 'bio not matching any keyword fails');
assert(!passesFollowFilter('', DESIGN), 'an empty bio fails a keyword filter (nothing to match)');

const NO_CRYPTO = { keywords: [], excludeKeywords: ['crypto'] };
assert(passesFollowFilter('indie hacker, building in public', NO_CRYPTO), 'clean bio passes an exclude-only filter');
assert(!passesFollowFilter('crypto degen, wagmi', NO_CRYPTO), 'excluded keyword fails even with no include list');

const BOTH = { keywords: ['design', 'startups'], excludeKeywords: ['nsfw'] };
assert(passesFollowFilter('startups and design', BOTH), 'matches an include keyword, no exclude hit');
assert(!passesFollowFilter('design, but also nsfw content', BOTH), 'exclude wins even when an include keyword also matches');
assert(!passesFollowFilter('cooking and travel', BOTH), 'no include match fails even with no exclude hit');

// Whole-word matching (reused from relevance.ts) — same guarantee as the home
// feed's keyword filter, not a looser substring check.
assert(!passesFollowFilter('I work at designation inc', DESIGN), 'whole-word: "design" does not match "designation"');
assert(!passesFollowFilter('proud designer', DESIGN), 'whole-word: "design" does not match "designer" either — only a bare plural (design/designs) is allowed');
assert(passesFollowFilter('I design things', DESIGN), 'still matches the bare word itself');

// --- isWhitelisted / normalizeHandle -----------------------------------------
assert(normalizeHandle('@Levelsio') === 'levelsio', 'strips @ and lower-cases');
assert(normalizeHandle('levelsio') === 'levelsio', 'idempotent without @');

const WL = [
  { platform: 'twitter' as const, handle: '@levelsio' },
  { platform: 'twitter' as const, handle: 'naval' },
];
assert(isWhitelisted('levelsio', 'twitter', WL), 'bare handle matches a whitelisted @handle');
assert(isWhitelisted('@LEVELSIO', 'twitter', WL), 'case- and @-insensitive match');
assert(isWhitelisted('naval', 'twitter', WL), 'matches a whitelisted bare handle');
assert(!isWhitelisted('elonmusk', 'twitter', WL), 'a handle not on the list is not whitelisted');
assert(!isWhitelisted('levelsio', 'linkedin', WL), 'platform-scoped: same handle on a different platform is not whitelisted');
assert(!isWhitelisted('levelsio', 'twitter', []), 'an empty whitelist whitelists nobody');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 follow-filter-smoke OK');
