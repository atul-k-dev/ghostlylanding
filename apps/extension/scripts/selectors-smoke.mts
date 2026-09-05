/* eslint-disable no-console */
/**
 * Remote-selector safety smoke. A selector map arrives over the network and is
 * applied to every user at once, so the rules that keep a bad config from
 * bricking the extension are the ones worth pinning down.
 * Run with: pnpm --filter @casper/extension selectors-smoke
 */

// Minimal DOM stub: applySelectorOverrides validates CSS by running it against
// a detached fragment. Node has no document, so approximate the parser — the
// real engine throws a SyntaxError on unbalanced brackets, stray braces, and
// dangling combinators, which is what these cases turn on.
const looksLikeValidCss = (selector: string): boolean => {
  const s = selector.trim();
  if (!s) return false;
  if (/[{}]/.test(s)) return false;
  if (/^[>+~,]|[>+~,]$/.test(s)) return false;
  const balanced = (open: string, close: string): boolean => {
    let depth = 0;
    for (const ch of s) {
      if (ch === open) depth++;
      else if (ch === close) depth--;
      if (depth < 0) return false;
    }
    return depth === 0;
  };
  return balanced('[', ']') && balanced('(', ')');
};

(globalThis as unknown as { document: unknown }).document = {
  createDocumentFragment: () => ({
    querySelector: (selector: string) => {
      if (!looksLikeValidCss(selector)) throw new Error('SyntaxError');
      return null;
    },
  }),
};

const { TWITTER_SELECTORS, TWITTER_SELECTOR_DEFAULTS, applySelectorOverrides, resetSelectors } =
  await import('../src/platforms/twitter/selectors.js');

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

// --- baseline ---------------------------------------------------------------
assert(
  TWITTER_SELECTORS.postArticle === TWITTER_SELECTOR_DEFAULTS.postArticle,
  'starts out matching the bundled map',
);

// --- a good override applies ------------------------------------------------
const applied = applySelectorOverrides({ postArticle: 'article[data-testid="tweet-v2"]' });
assert(applied === 1, 'a valid override reports as applied');
assert(TWITTER_SELECTORS.postArticle === 'article[data-testid="tweet-v2"]', 'the value changes');
assert(
  TWITTER_SELECTORS.likeButton === TWITTER_SELECTOR_DEFAULTS.likeButton,
  'untouched keys keep their bundled value',
);

resetSelectors();
assert(
  TWITTER_SELECTORS.postArticle === TWITTER_SELECTOR_DEFAULTS.postArticle,
  'reset restores the bundled map',
);

// --- the rules that stop a bad config bricking everyone ---------------------
assert(
  applySelectorOverrides({ notARealKey: 'div' }) === 0,
  'an unknown key is ignored (a remote map cannot invent selectors)',
);
assert(
  !('notARealKey' in TWITTER_SELECTORS),
  'the unknown key is not added to the live map',
);

assert(applySelectorOverrides({ likeButton: '' }) === 0, 'an empty value is ignored');
assert(applySelectorOverrides({ likeButton: '   ' }) === 0, 'a whitespace value is ignored');
assert(
  applySelectorOverrides({ likeButton: 42 as unknown as string }) === 0,
  'a non-string value is ignored',
);
assert(
  applySelectorOverrides({ likeButton: null as unknown as string }) === 0,
  'a null value is ignored',
);
assert(
  applySelectorOverrides({ likeButton: 'button[data-testid=' }) === 0,
  'a selector that does not PARSE is ignored (it would throw on every query)',
);
assert(
  TWITTER_SELECTORS.likeButton === TWITTER_SELECTOR_DEFAULTS.likeButton,
  'after every rejected override the bundled value still stands',
);

// --- a partly-bad map applies only its good half ----------------------------
const mixed = applySelectorOverrides({
  likeButton: 'button[data-testid="like-v2"]',
  bogusKey: 'div',
  postText: '[data-testid=',
});
assert(mixed === 1, 'a mixed map applies only the valid entry');
assert(TWITTER_SELECTORS.likeButton === 'button[data-testid="like-v2"]', 'the good one applied');
assert(
  TWITTER_SELECTORS.postText === TWITTER_SELECTOR_DEFAULTS.postText,
  'the malformed one did not',
);

resetSelectors();

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 selectors-smoke OK');
