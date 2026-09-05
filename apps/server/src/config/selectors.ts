/**
 * Remote DOM-selector overrides for the extension.
 *
 * The extension ships the FULL selector map in its bundle; this file serves only
 * the keys that need to differ from it. That's deliberate — duplicating all 28
 * selectors here would just create two copies to drift apart. Normally
 * `SELECTOR_OVERRIDES` is empty and every user runs on the bundled map.
 *
 * When X changes its DOM:
 *   1. add the corrected selector(s) below and bump SELECTOR_VERSION, then deploy
 *      (minutes), or
 *   2. for a same-minute fix with no deploy, PUT the override through
 *      `/api/admin/selectors`, which is stored in the DB and merged on top of
 *      this file.
 * Either way the extension picks it up within 6 hours, or on its next restart.
 */

/** Every key the extension will accept. Anything else is ignored client-side
 *  too, but rejecting it here catches a typo during an incident. */
export const SELECTOR_KEYS = [
  'postArticle',
  'timestamp',
  'permalink',
  'likeButton',
  'unlikeButton',
  'bookmarkButton',
  'removeBookmarkButton',
  'retweetButton',
  'unretweetButton',
  'retweetConfirm',
  'likeButtonAria',
  'postText',
  'replyComposer',
  'replyButton',
  'replyDialog',
  'replyDialogButton',
  'actionBarRow',
  'caret',
  'dropdownMenu',
  'userCell',
  'userCellLink',
  'followButton',
  'unfollowButton',
  'followButtonAria',
  'primaryColumn',
  'verifiedFollowersLink',
  'followersLink',
  'followingLink',
] as const;

export type SelectorKey = (typeof SELECTOR_KEYS)[number];

export const isSelectorKey = (key: string): key is SelectorKey =>
  (SELECTOR_KEYS as readonly string[]).includes(key);

/**
 * Bump whenever the overrides change — it's what shows up in the extension's
 * console and Diagnostics panel, so support can tell which map a user is on.
 */
export const SELECTOR_VERSION = '2026-09-04.1';

/** Empty in the healthy case. Add entries only to correct a bundled selector. */
export const SELECTOR_OVERRIDES: Partial<Record<SelectorKey, string>> = {};

/**
 * Oldest extension version the API still supports.
 *
 * Served alongside the selector config, which every extension already fetches on
 * boot. There is no versioned URL scheme (`/api/v1`) because nothing has needed
 * one yet — server changes have all been additive. This is the cheaper 90%: when
 * a genuinely breaking change does land, raise this and old installs tell their
 * users to update instead of failing in ways nobody can explain.
 *
 * Compared with a plain numeric semver compare, so keep it "major.minor.patch".
 */
export const MIN_EXTENSION_VERSION = '2.0.0';
