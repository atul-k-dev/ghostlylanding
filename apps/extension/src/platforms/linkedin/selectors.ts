/**
 * LinkedIn selectors. LinkedIn ships classnames that include hashes
 * (e.g. .feed-shared-update-v2--xyz123). We always prefer attribute-based
 * selectors and data-urn patterns over classnames.
 */

export const LINKEDIN_SELECTORS = {
  /** A single feed-style update (post). data-urn always starts with urn:li:activity:<id>. */
  postArticle: '[data-urn^="urn:li:activity:"]',
  /** Anchors that wrap the post's permalink — match update URLs. */
  permalink: 'a[href*="/feed/update/"], a[href*="/posts/"]',
  /** Some post bodies show a relative "x minutes ago" element rather than a <time>. */
  timeRelative:
    'time, .update-components-actor__sub-description, .update-components-actor__sub-description-link',
  /**
   * Like button — LinkedIn rotates between aria-label variants:
   *   "React Like", "Like" (unreacted), "Liked".
   * We click only when the aria-pressed isn't already "true".
   */
  reactButton:
    'button.react-button__trigger, button[aria-label="Like"], button[aria-label*="React Like" i]',
  reactButtonPressedAttr: 'aria-pressed',
  /** Text body of a post (best-effort across LI variations). */
  postBody:
    '.feed-shared-update-v2__description, .update-components-text, [data-test-id="main-feed-activity-card__commentary"]',
  /** Comment button on the post — opens the comment composer. */
  commentTriggerButton:
    'button[aria-label="Comment"], button.comment-button, button[data-test-id*="comment-button"]',
  /** Composer (contenteditable div). */
  commentComposer:
    'div.ql-editor[contenteditable="true"], div[contenteditable="true"][data-placeholder*="comment" i]',
  /** Submit button inside the comment box (labeled "Post"). */
  commentSubmitButton:
    'button.comments-comment-box__submit-button, button[aria-label="Post comment"], button.comments-comment-box__submit-button--cr',
  /** Item in the followers/connections list. */
  followersListItem:
    'li.reusable-search__result-container, li.org-people-profile-card, .scaffold-finite-scroll__content li',
  /** Profile link inside a follower list item. */
  followersListLink: 'a.app-aware-link[href*="/in/"]',
  /** Follow / Connect / Pending button on a profile page. LinkedIn uses different
   *  CTAs depending on relationship. We click "Follow" preferentially. */
  followButton:
    'button[aria-label^="Follow" i], button.follow, button.pvs-profile-actions__action[aria-label*="Follow" i]',
  /** "Following" toggled state. */
  followingButton:
    'button[aria-label^="Following" i], button[aria-label^="Unfollow" i]',
  /** Connect button (LinkedIn alternative to Follow on personal profiles). */
  connectButton: 'button[aria-label^="Invite" i][aria-label*="to connect" i]',
} as const;

export const buildFollowersUrl = (handle: string): string => {
  const clean = handle.replace(/^@/, '').replace(/^\/?in\//, '').trim();
  // LinkedIn doesn't have a public followers list URL — the "Follow list" lives
  // under recent-activity → followers tab on creator mode profiles. Fallback to
  // the profile itself; the scanner pulls visible "People you may know" / "People
  // who viewed" cards on the profile page.
  return `https://www.linkedin.com/in/${encodeURIComponent(clean)}/`;
};

export const buildProfileFromHandle = (handle: string): string => {
  const clean = handle.replace(/^@/, '').replace(/^\/?in\//, '').trim();
  return `https://www.linkedin.com/in/${encodeURIComponent(clean)}/`;
};

export const buildProfileFeedUrl = (handle: string): string => {
  const clean = handle.replace(/^@/, '').replace(/^\/?in\//, '').trim();
  return `https://www.linkedin.com/in/${encodeURIComponent(clean)}/recent-activity/all/`;
};
