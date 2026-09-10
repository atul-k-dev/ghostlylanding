/**
 * Keyword matching for feed relevance.
 *
 * This used to be `text.includes(keyword)`, which is wrong in the way that
 * embarrasses a user in public: the keyword "ai" fired on "said", "chair" and
 * "again", so Ghostly replied to posts that had nothing to do with the topic.
 * Matching is now whole-word, with the plural allowed — "indie hacker" should
 * still match "indie hackers", because that's plainly what the user meant.
 */

/** Escape a user-supplied keyword for literal use inside a RegExp. */
const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Word characters for boundary purposes. Deliberately NOT `\b`: `\b` is defined
 * against `\w`, which makes "c++" and "ai/ml" unmatchable at their tail. Testing
 * for an adjacent *word* character instead lets a keyword end in punctuation and
 * still match, while "ai" stays blocked inside "said".
 */
const WORD = '[a-z0-9_]';

const cache = new Map<string, RegExp | null>();

/** Compiled matcher for one keyword, memoised (the feed loop calls this a lot). */
const matcherFor = (keyword: string): RegExp | null => {
  const key = keyword.trim().toLowerCase();
  if (cache.has(key)) return cache.get(key) ?? null;

  let re: RegExp | null = null;
  if (key.length > 0) {
    try {
      // Optional plural so "hacker" matches "hackers" — users write the singular
      // and mean both. A keyword that already ends in "s" is unaffected.
      re = new RegExp(`(?<!${WORD})${escapeRegex(key)}(?:es|s)?(?!${WORD})`, 'i');
    } catch {
      // Lookbehind is available everywhere this extension runs, but never let a
      // regex failure take down the whole feed scan.
      re = null;
    }
  }
  cache.set(key, re);
  return re;
};

/** True when the text contains any of the keywords as a whole word. */
export const matchesAny = (text: string, keywords: string[]): boolean => {
  const hay = text.toLowerCase();
  for (const keyword of keywords) {
    const re = matcherFor(keyword);
    if (re && re.test(hay)) return true;
  }
  return false;
};

/** No keywords = engage with everything (the documented behaviour). */
export const isRelevant = (text: string, keywords: string[]): boolean =>
  keywords.length === 0 || matchesAny(text, keywords);

/**
 * WHICH keyword made a post relevant, first match wins (updateplan 5.1's
 * "which topics are working" needs to know, not just that SOME keyword hit).
 * Null when none matched — including when `keywords` is empty, since "engage
 * with everything" isn't attributable to any one topic.
 */
export const matchedKeyword = (text: string, keywords: string[]): string | null => {
  const hay = text.toLowerCase();
  for (const keyword of keywords) {
    const re = matcherFor(keyword);
    if (re && re.test(hay)) return keyword;
  }
  return null;
};

/** A post is excluded if it contains any blocklist keyword. */
export const isExcluded = (text: string, excludeKeywords: string[]): boolean =>
  excludeKeywords.length > 0 && matchesAny(text, excludeKeywords);

/**
 * Shortest post worth generating a reply to. Below this there's nothing to
 * respond to, and the model invents a reaction to "this." — which reads exactly
 * like a bot. Liking such a post is still fine; only replying is gated.
 */
export const MIN_REPLY_POST_CHARS = 40;
