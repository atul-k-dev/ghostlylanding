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
} as const;

export const buildProfileFeedUrl = (handle: string): string => {
  const clean = handle.replace(/^@/, '').replace(/^\/?in\//, '').trim();
  return `https://www.linkedin.com/in/${encodeURIComponent(clean)}/recent-activity/all/`;
};
