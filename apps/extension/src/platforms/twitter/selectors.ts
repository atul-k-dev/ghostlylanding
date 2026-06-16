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
  /** Inner text container of a tweet. */
  postText: '[data-testid="tweetText"]',
  /** Reply composer — the contenteditable rich textbox. */
  replyComposer: 'div[data-testid="tweetTextarea_0"]',
  /** Reply submit button (Reply / Post). */
  replyButton: 'button[data-testid="tweetButton"], button[data-testid="tweetButtonInline"]',
  /** The modal reply dialog opened when replying from the timeline. Scope the
   *  composer + Send button to THIS — the home page also has a top-of-feed
   *  composer with the same testids, which otherwise steals the query. */
  replyDialog: '[role="dialog"][aria-modal="true"]',
  /** Reply Send button *inside the modal* (always "tweetButton", not inline). */
  replyDialogButton: 'button[data-testid="tweetButton"]',
  /** Action bar row inside an article (reply / retweet / like / share group). */
  actionBarRow: 'div[role="group"]',
  /** The ••• "more" button on a tweet — opens the per-tweet dropdown menu. */
  caret: 'button[data-testid="caret"]',
  /** The dropdown menu portal opened by the caret (contains Follow/Unfollow). */
  dropdownMenu: '[data-testid="Dropdown"], [role="menu"]',
  /** Cells on the followers list — each contains a UserCell. */
  userCell: '[data-testid="UserCell"]',
  /** Profile link inside a UserCell. */
  userCellLink: '[data-testid="UserCell"] a[role="link"][href^="/"]',
  /** Follow button (when not following). data-testid examples include
   *  "<handle>-follow" and just "follow". Use suffix match. */
  followButton: 'button[data-testid$="-follow"], button[data-testid="follow"]',
  /** Unfollow button — appears when already following. */
  unfollowButton: 'button[data-testid$="-unfollow"], button[data-testid="unfollow"]',
  /** Fallback for older variants via aria-label. */
  followButtonAria: 'button[aria-label^="Follow @" i]',
} as const;

export const buildProfileUrl = (handle: string): string => {
  const clean = handle.replace(/^@/, '').trim();
  return `https://x.com/${encodeURIComponent(clean)}`;
};

export const buildFollowersUrl = (handle: string): string => {
  const clean = handle.replace(/^@/, '').trim();
  // /verified_followers is more curated, but not every profile has it.
  // /followers always exists on a public profile.
  return `https://x.com/${encodeURIComponent(clean)}/followers`;
};
