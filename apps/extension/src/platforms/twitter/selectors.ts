/**
 * Twitter/X selectors — kept centralized so we can patch one place when the
 * DOM changes. Always try the data-testid first, then aria-label fallbacks.
 *
 * NOTE: Twitter ships UI changes frequently. Expect to maintain this file.
 */

/**
 * The selectors we ship in the bundle. Treated as the FALLBACK: the server can
 * serve a newer map (see lib/selector-config.ts), so an X DOM change is fixed by
 * a server deploy in minutes rather than a Chrome Web Store review in days.
 */
export const TWITTER_SELECTOR_DEFAULTS = {
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
  /** Bookmark button (not-yet-bookmarked) and its already-bookmarked state. */
  bookmarkButton: 'button[data-testid="bookmark"]',
  removeBookmarkButton: 'button[data-testid="removeBookmark"]',
  /** Repost/retweet button; the already-reposted state; and the "Repost"
   *  confirm item in the dropdown the retweet button opens. */
  retweetButton: 'button[data-testid="retweet"]',
  unretweetButton: 'button[data-testid="unretweet"]',
  retweetConfirm: '[data-testid="retweetConfirm"]',
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

  /* -- Composer: threads --------------------------------------------------- */
  /** The "+" that appends another tweet to the thread in the composer. */
  composeAddButton: '[data-testid="addButton"]',

  /* -- Growth scoreboard: profile header counters -------------------------- */
  /** The main content column — where the "N posts" subtitle lives. */
  primaryColumn: '[data-testid="primaryColumn"]',
  /** "N Followers" link on a profile header. X uses /verified_followers on
   *  accounts that have it and plain /followers everywhere else. */
  verifiedFollowersLink: 'a[href$="/verified_followers"]',
  followersLink: 'a[href$="/followers"]',
  /** "N Following" link on a profile header. */
  followingLink: 'a[href$="/following"]',

  /* -- Setup: reading the signed-in account -------------------------------- */
  /** The bio block. Appears both on a profile header and inside a UserCell,
   *  which is why scanning the Following list scopes this to the cell. */
  userDescription: '[data-testid="UserDescription"]',
} as const;

export type SelectorKey = keyof typeof TWITTER_SELECTOR_DEFAULTS;

/**
 * The live selector map every DOM module reads. Deliberately mutable and
 * accessed as `S.someKey` at call time, so applying a remote override updates
 * every consumer at once without threading config through six modules.
 */
export const TWITTER_SELECTORS: Record<SelectorKey, string> = { ...TWITTER_SELECTOR_DEFAULTS };

/** Is this a syntactically valid CSS selector? Checked against a detached node
 *  so it costs nothing and never touches the page. */
const isValidSelector = (selector: string): boolean => {
  try {
    document.createDocumentFragment().querySelector(selector);
    return true;
  } catch {
    return false;
  }
};

/**
 * Merge a remote selector map over the bundled one.
 *
 * Hostile-input rules, because this arrives over the network and a bad value
 * would break automation for every user at once:
 *   - unknown keys are ignored (a remote map can never invent new selectors)
 *   - non-string / empty values are ignored
 *   - selectors that don't PARSE are ignored — an invalid one would make every
 *     querySelector call throw, which is worse than the stale selector it
 *     replaces
 * Returns how many overrides were actually applied.
 */
export const applySelectorOverrides = (overrides: Record<string, unknown>): number => {
  let applied = 0;
  for (const [key, value] of Object.entries(overrides)) {
    if (!(key in TWITTER_SELECTOR_DEFAULTS)) continue;
    if (typeof value !== 'string' || value.trim().length === 0) continue;
    if (!isValidSelector(value)) continue;
    TWITTER_SELECTORS[key as SelectorKey] = value;
    applied++;
  }
  return applied;
};

/** Drop every override and go back to what shipped in the bundle. */
export const resetSelectors = (): void => {
  Object.assign(TWITTER_SELECTORS, TWITTER_SELECTOR_DEFAULTS);
};

export const buildProfileUrl = (handle: string): string => {
  const clean = handle.replace(/^@/, '').trim();
  return `https://x.com/${encodeURIComponent(clean)}`;
};

/**
 * X search on the **Latest** tab (`f=live`) — reverse-chronological, so the top
 * of the page is what was posted seconds ago. That ordering is the whole point:
 * it's what lets Ghostly reply early instead of four hundredth.
 */
export const buildSearchUrl = (query: string): string =>
  `https://x.com/search?q=${encodeURIComponent(query.trim())}&f=live`;

export const buildFollowersUrl = (handle: string): string => {
  const clean = handle.replace(/^@/, '').trim();
  // /verified_followers is more curated, but not every profile has it.
  // /followers always exists on a public profile.
  return `https://x.com/${encodeURIComponent(clean)}/followers`;
};

/** The Mentions sub-tab of Notifications (updateplan 4.1). */
export const MENTIONS_URL = 'https://x.com/notifications/mentions';
