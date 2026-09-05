/* eslint-disable no-console */
/**
 * Keyword-matching smoke. The old substring matcher fired "ai" on "said" — these
 * are the cases that has to stop happening, plus the ones that must keep working.
 * Run with: pnpm --filter @casper/extension relevance-smoke
 */
import { matchesAny, isRelevant, isExcluded } from '../src/platforms/common/relevance.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

// --- the bug this exists to fix --------------------------------------------
const AI = ['ai'];
assert(!matchesAny('she said nothing at all', AI), '"ai" does NOT match "said"');
assert(!matchesAny('pull up a chair', AI), '"ai" does NOT match "chair"');
assert(!matchesAny('here we go again', AI), '"ai" does NOT match "again"');
assert(!matchesAny('I work at openai', AI), '"ai" does NOT match "openai"');
assert(!matchesAny('walking down the aisle', AI), '"ai" does NOT match "aisle"');
assert(!matchesAny('email me about it', AI), '"ai" does NOT match "email"');

// --- but it must still match when it means it ------------------------------
assert(matchesAny('AI is eating software', AI), 'matches at the start');
assert(matchesAny('everything is ai now', AI), 'matches mid-sentence');
assert(matchesAny('thoughts on ai?', AI), 'matches before punctuation');
assert(matchesAny('big week for #ai', AI), 'matches after a hashtag');
assert(matchesAny('(ai)', AI), 'matches inside brackets');
assert(matchesAny('ai', AI), 'matches the whole string');

// --- plurals: users type the singular and mean both ------------------------
assert(matchesAny('a post about indie hackers', ['indie hacker']), 'phrase matches its plural');
assert(matchesAny('one indie hacker', ['indie hacker']), 'phrase matches the singular');
assert(matchesAny('founders are shipping', ['founder']), '"founder" matches "founders"');
assert(matchesAny('the latest news', ['news']), 'a keyword ending in s still matches');
assert(!matchesAny('foundering badly', ['founder']), '"founder" does NOT match "foundering"');

// --- keywords with punctuation ---------------------------------------------
assert(matchesAny('written in c++ mostly', ['c++']), 'matches a keyword ending in punctuation');
assert(matchesAny('doing ai/ml work', ['ai/ml']), 'matches a slashed keyword');
assert(!matchesAny('c++ is fine', ['c#']), 'a different punctuated keyword does not match');
// A keyword full of regex metacharacters must be treated literally, not compiled.
assert(!matchesAny('anything at all', ['.*']), 'regex metacharacters are escaped, not executed');
assert(matchesAny('costs $9.99 today', ['$9.99']), 'a literal price matches');

// --- case and multi-keyword -------------------------------------------------
assert(matchesAny('Building In Public', ['building in public']), 'matching is case-insensitive');
assert(matchesAny('shipping today', ['ai', 'shipping', 'design']), 'any one keyword is enough');
assert(!matchesAny('nothing relevant', ['ai', 'shipping', 'design']), 'no keyword, no match');

// --- empty / whitespace keywords are ignored, not matched-on ---------------
assert(!matchesAny('some text', ['']), 'an empty keyword never matches');
assert(!matchesAny('some text', ['   ']), 'a whitespace keyword never matches');

// --- isRelevant / isExcluded ------------------------------------------------
assert(isRelevant('literally anything', []), 'no keywords = engage with everything');
assert(isRelevant('about ai', AI), 'relevant when a keyword hits');
assert(!isRelevant('about cats', AI), 'not relevant when nothing hits');
assert(!isExcluded('a clean post', []), 'empty blocklist excludes nothing');
assert(isExcluded('some crypto pump', ['crypto']), 'blocklist hit excludes the post');
assert(!isExcluded('cryptography research', ['crypto']), 'blocklist is whole-word too');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 relevance-smoke OK');
