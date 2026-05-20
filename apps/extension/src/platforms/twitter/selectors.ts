/**
 * Twitter/X selectors — kept centralized so we can patch one place when the
 * DOM changes. Always try the data-testid first, then aria-label fallbacks.
 *
 * NOTE: Twitter ships UI changes frequently. Expect to maintain this file.
 */

export const TWITTER_SELECTORS = {
  /** A single tweet article in any timeline. */
  postArticle: 'article[data-testid="tweet"]',
  /** Timestamp element on a post — its <a> ancestor is the permalink. */
  timestamp: 'time[datetime]',
  /** Permalink anchor — contains /status/<id>. */
  permalink: 'a[href*="/status/"]',
  /** Like buttons: not-yet-liked. */
  likeButton: 'button[data-testid="like"]',
  /** Like buttons: already liked (unlike action). */
  unlikeButton: 'button[data-testid="unlike"]',
  /** Aria fallbacks if data-testid disappears. */
  likeButtonAria: 'button[aria-label*="Like" i][role="button"]',
} as const;

export const buildProfileUrl = (handle: string): string => {
  const clean = handle.replace(/^@/, '').trim();
  return `https://x.com/${encodeURIComponent(clean)}`;
};
