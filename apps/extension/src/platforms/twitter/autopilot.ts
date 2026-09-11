/**
 * Inline home-feed autopilot for Twitter/X.
 *
 * Runs entirely inside ONE tab: smoothly scrolls the timeline and likes /
 * comments / follows in place as it goes — so the user can watch a single,
 * continuous session instead of tabs popping open for each action.
 *
 * Safety budgets (daily caps, monthly cap) are computed by the executor and
 * passed in; this module just stops when a budget is hit. Every per-post action
 * is wrapped so a single failure never breaks the smooth scroll.
 */
import type { ActionType } from '@casper/shared';
import { TWITTER_SELECTORS as S } from './selectors.js';
import { waitFor, smoothScrollBy, wait } from './dom.js';
import { typeIntoComposer, submitComment } from './comment.js';
import { followCurrentProfile, getOwnHandle } from './follow.js';
import { looksLikeReply } from './stats.js';
import { isRelevant, isExcluded, matchedKeyword, MIN_REPLY_POST_CHARS } from '../common/relevance.js';
import type {
  DryRunCandidate,
  HomeAutopilotOptions,
  HomeAutopilotResult,
} from '../common/content-messages.js';
import { canActNow, msUntilSlotNow, slotsLeftNow } from '../../scheduler/rate-limit.js';
import {
  randomInt,
  nextScrollDistancePx,
  nextScrollPauseMs,
  readDwellMs,
} from '../common/pacing.js';
import { spotlightOn, spotlightDone, type SpotlightAction } from '../../floating/spotlight.js';
import { isStopped, stoppableWait, syncStopSignal } from '../common/stop-signal.js';

/** Report one completed action to the background the instant it lands, so the
 *  dashboard counters update live during a long session (instead of only when
 *  the whole session returns). Best-effort — a dropped message just undercounts. */
const recordAction = async (
  platform: string,
  actionType: ActionType,
  data: {
    postUrl?: string;
    postId?: string;
    handle?: string;
    profileUrl?: string;
    draftId?: string;
    /** Set when this action came from a search feed (updateplan 6.7 — D8), so
     *  the background spends it from the search budget, not the shared one. */
    source?: 'search';
    /** Which home-feed keyword this action matched on (updateplan 5.1). */
    matchedKeyword?: string;
  },
): Promise<void> => {
  try {
    await chrome.runtime.sendMessage({ type: 'RECORD_ACTION', payload: { platform, actionType, ...data } });
  } catch {
    /* background unreachable — ignore */
  }
};

/**
 * Point Spotlight (2.3) at the post we're reading or acting on, and when the
 * action ends, say how it went — the outline stays until the next post.
 *
 * It sits here because this is the only code that knows what it is about to
 * do, and it's a no-op when the user has Spotlight off — so every call site
 * can be unconditional.
 */
const outcomeOf = (action: SpotlightAction, r: unknown): 'done' | 'drafted' | 'skipped' | null => {
  if (action === 'reading') return null; // the next step (or post) decides
  if (r === 'skip' || r === false || r === null || r === undefined) return 'skipped';
  if (typeof r === 'object') {
    const o = r as { ok?: boolean; posted?: boolean; followed?: boolean; draftText?: string };
    if (o.ok === false || o.posted === false || o.followed === false) return 'skipped';
    // A reply held for review was written, not posted.
    if (action === 'reply' && typeof o.draftText === 'string' && o.posted === undefined) return 'drafted';
  }
  return 'done';
};

const withSpotlight = async <T>(
  el: HTMLElement | null,
  action: SpotlightAction,
  meta: { authorHandle: string | null; postUrl: string; text: string },
  fn: () => Promise<T>,
): Promise<T> => {
  if (el) {
    await spotlightOn(el, {
      action,
      authorHandle: meta.authorHandle,
      postUrl: meta.postUrl,
      text: meta.text.slice(0, 140),
    });
  }
  try {
    const r = await fn();
    const outcome = outcomeOf(action, r);
    if (outcome) spotlightDone(outcome);
    return r;
  } catch (err) {
    spotlightDone('skipped');
    throw err;
  }
};

export interface PostMeta {
  postId: string;
  postUrl: string;
  /** In-app path of the post (`/handle/status/id`) — the href on the anchor we
   *  click to open it without a full page load. */
  permalinkPath: string;
  authorHandle: string | null;
  text: string;
  publishedAt: string | null;
}

export const readArticle = (article: HTMLElement): PostMeta | null => {
  const time = article.querySelector<HTMLTimeElement>(S.timestamp);
  const link =
    time?.closest<HTMLAnchorElement>(S.permalink) ??
    article.querySelector<HTMLAnchorElement>(S.permalink);
  const href = link?.getAttribute('href') ?? '';
  const idMatch = href.match(/\/status\/(\d+)/);
  if (!idMatch?.[1]) return null;
  const handleMatch = href.match(/^\/([^/]+)\/status\//);
  let postUrl = href;
  try {
    postUrl = new URL(href, location.origin).toString();
  } catch {
    /* keep raw href */
  }
  return {
    postId: idMatch[1],
    postUrl,
    permalinkPath: (href.split('?')[0] ?? href).replace(/\/$/, ''),
    authorHandle: handleMatch?.[1] ?? null,
    text: (article.querySelector<HTMLElement>(S.postText)?.textContent ?? '').trim(),
    publishedAt: time?.getAttribute('datetime') ?? null,
  };
};

/**
 * Everything `readArticle`'s plain text selector misses (updateplan 6.4 —
 * D4/D5): a truncated "Show more" post, an image's alt text, a link card's
 * title, and a quoted tweet's own words. Returns `meta` unchanged in text
 * except for the (possibly longer) `text` field — every other field is
 * `readArticle`'s, since none of it can have changed by clicking "Show more".
 *
 * Selectors and DOM shape verified live against x.com before this was
 * written (see the Phase 6 progress log): `tweetPhoto`/`videoPlayer` exist
 * exactly as named, `cardWrapper`'s `.innerText` is the card's title + domain,
 * and `quotedTweetText` returns nothing at all on a non-quote post rather than
 * false-matching the article's own click-through wrapper.
 */
export const enrichArticleText = async (
  article: HTMLElement,
  meta: PostMeta,
): Promise<PostMeta> => {
  const showMore = article.querySelector<HTMLElement>(S.showMoreButton);
  if (showMore) {
    showMore.click();
    await wait(300);
  }

  const parts: string[] = [
    (article.querySelector<HTMLElement>(S.postText)?.textContent ?? meta.text).trim(),
  ];

  for (const img of Array.from(article.querySelectorAll<HTMLImageElement>(`${S.tweetPhoto} img[alt]`))) {
    const alt = img.getAttribute('alt')?.trim();
    if (alt) parts.push(alt);
  }

  const cardText = article.querySelector<HTMLElement>(S.cardWrapper)?.innerText?.trim();
  if (cardText) parts.push(cardText);

  const quotedText = article.querySelector<HTMLElement>(S.quotedTweetText)?.textContent?.trim();
  if (quotedText) parts.push(quotedText);

  return { ...meta, text: parts.filter((p) => p.length > 0).join(' · ') };
};

/** Re-find a post in the CURRENT DOM by id. After an in-app navigation the feed
 *  re-renders, so every element captured before the trip is detached — anything
 *  that wants to keep working on a post has to look it up again. */
export const findArticleById = (postId: string): HTMLElement | null => {
  for (const el of Array.from(document.querySelectorAll<HTMLElement>(S.postArticle))) {
    if (readArticle(el)?.postId === postId) return el;
  }
  return null;
};

const isFresh = (publishedAt: string | null, hours: number): boolean => {
  if (!publishedAt) return false;
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= hours * 60 * 60 * 1000;
};


/** Like the post inside this article. Returns the outcome. */
const likeInArticle = async (article: HTMLElement): Promise<'liked' | 'already' | 'skip'> => {
  if (article.querySelector(S.unlikeButton)) return 'already';
  const btn = article.querySelector<HTMLButtonElement>(S.likeButton);
  if (!btn) return 'skip';
  btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await wait(500);
  btn.click();
  for (let i = 0; i < 10; i++) {
    await wait(220);
    if (article.querySelector(S.unlikeButton)) return 'liked';
  }
  return 'skip';
};

/** Ask the service worker to generate a comment draft for this post. */
const generateDraft = async (
  platform: string,
  postText: string,
  postUrl: string,
): Promise<{ ok: true; id: string; draftText: string } | { ok: false; error: string }> => {
  try {
    const resp = (await chrome.runtime.sendMessage({
      type: 'DRAFT_COMMENT',
      payload: { platform, postText, postUrl },
    })) as
      | { ok?: boolean; data?: { id: string; draftText: string }; error?: { message?: string } | string }
      | undefined;
    if (resp && resp.ok && resp.data) {
      return { ok: true, id: resp.data.id, draftText: resp.data.draftText };
    }
    const e = resp?.error;
    const msg = typeof e === 'string' ? e : (e?.message ?? 'comment generation failed');
    return { ok: false, error: msg };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'background unreachable' };
  }
};

/**
 * Park a generated reply in the review queue instead of posting it.
 *
 * Returns 'full' when the queue has no room — the caller stops drafting rather
 * than burning model calls on drafts that would be dropped.
 */
const queueDraftForReview = async (
  platform: string,
  meta: PostMeta,
  draft: { id: string; draftText: string },
  /** Threaded through to the queued reply so the topic-attribution figure in
   *  the Growth tab (updateplan 5.1) is real for approval-mode users too —
   *  most installs default to `replyApproval: true`, so this is the common
   *  path, not the edge case. */
  matchedTopic: string | null,
): Promise<'queued' | 'full' | 'error'> => {
  try {
    const resp = (await chrome.runtime.sendMessage({
      type: 'QUEUE_REPLY',
      payload: {
        id: draft.id,
        platform,
        postId: meta.postId,
        postUrl: meta.postUrl,
        postText: meta.text,
        authorHandle: meta.authorHandle,
        draftText: draft.draftText,
        ...(matchedTopic ? { matchedKeyword: matchedTopic } : {}),
      },
    })) as { ok?: boolean; data?: { queued?: boolean; full?: boolean } } | undefined;
    if (resp?.ok && resp.data?.queued) return 'queued';
    if (resp?.data?.full) return 'full';
    return 'error';
  } catch {
    return 'error';
  }
};

const dismissComposer = (): void => {
  // Close the reply dialog if it's still open (Escape is what X listens for).
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
  );
};

/**
 * Reply to the post inside this article using the inline composer modal.
 * Returns the posted state plus the draft id (so the executor can mark it).
 */
/**
 * Type one exact reply into a post's own reply modal and send it.
 *
 * Split out of `commentInArticle` in updateplan 2.4 so “Reply for me” can post
 * the text the USER approved rather than re-drafting one of its own. The DOM
 * dance is identical either way, and a second copy of it would be a second thing
 * to fix the next time X moves the Send button.
 */
export const postReplyInArticle = async (
  article: HTMLElement,
  text: string,
): Promise<{ posted: boolean; error?: string }> => {
  const replyBtn = article.querySelector<HTMLButtonElement>('button[data-testid="reply"]');
  if (!replyBtn) return { posted: false, error: 'reply button not found on post' };

  replyBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await wait(400);
  replyBtn.click();

  // The reply opens a MODAL. Scope the composer + Send button to it — the home
  // timeline also has a top-of-feed composer with the same testid, so an
  // unscoped query types into the wrong box and the modal's Send never enables.
  const dialog = await waitFor<HTMLElement>(S.replyDialog, 8_000);
  if (!dialog) {
    dismissComposer();
    return { posted: false, error: 'reply dialog never opened' };
  }

  let composer: HTMLElement | null = null;
  for (let i = 0; i < 20; i++) {
    composer = dialog.querySelector<HTMLElement>(S.replyComposer);
    if (composer) break;
    await wait(200);
  }
  if (!composer) {
    dismissComposer();
    return { posted: false, error: 'reply composer never opened' };
  }

  await typeIntoComposer(composer, text);

  let btn: HTMLButtonElement | null = null;
  for (let i = 0; i < 16; i++) {
    btn = dialog.querySelector<HTMLButtonElement>(S.replyDialogButton);
    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') break;
    await wait(220);
  }
  if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') {
    console.log('[casper] comment: Send stayed disabled — text may not have registered');
    dismissComposer();
    return { posted: false, error: 'reply submit button never enabled' };
  }
  btn.click();

  // Confirm the modal goes away (reply submitted, dialog closed).
  for (let i = 0; i < 16; i++) {
    await wait(350);
    if (!document.querySelector(S.replyDialog)) {
      console.log('[casper] comment: posted ✓');
      return { posted: true };
    }
  }
  dismissComposer();
  return { posted: false, error: 'composer did not clear after submit' };
};

/** Draft a reply to this post and send it — the autopilot's own path. */
const commentInArticle = async (
  article: HTMLElement,
  meta: PostMeta,
  platform: string,
): Promise<{ posted: boolean; draftId?: string; error?: string }> => {
  const draft = await generateDraft(platform, meta.text, meta.postUrl);
  if (!draft.ok) {
    console.log('[casper] comment: generation failed —', draft.error);
    return { posted: false, error: draft.error };
  }
  console.log('[casper] comment: drafted, opening reply box…');
  const r = await postReplyInArticle(article, draft.draftText);
  return { ...r, draftId: draft.id };
};

/** Close any open dropdown menu (Escape is what X listens for). */
const dismissMenu = (): void => {
  document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
};

/**
 * Inline follow via the tweet's ••• menu. X has no per-tweet follow button, and
 * the author hovercard won't open from synthetic hover events — but the caret
 * menu is plain click-driven, so it's reliable. We open it and click the
 * "Follow @handle" item (absent when already following, which shows "Unfollow").
 * Returns 'followed' on success, 'skip' otherwise (never throws).
 */
const followAuthorInline = async (article: HTMLElement): Promise<'followed' | 'skip'> => {
  const caret = article.querySelector<HTMLButtonElement>(S.caret);
  if (!caret) {
    console.log('[casper] follow: no ••• caret on post');
    return 'skip';
  }
  caret.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await wait(400);
  caret.click();

  const menu = await waitFor<HTMLElement>(S.dropdownMenu, 3_000);
  if (!menu) {
    console.log('[casper] follow: caret menu never opened');
    return 'skip';
  }

  // The menu items render a beat after the menu container, so poll for them.
  // "Follow @x" starts with Follow; "Unfollow @x"/"Following" (already
  // following) do not — so we also detect that to stop polling early.
  let followItem: HTMLElement | undefined;
  for (let i = 0; i < 12; i++) {
    const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    followItem = items.find((it) => /^\s*follow\b/i.test((it.textContent ?? '').trim()));
    const alreadyFollowing = items.some((it) =>
      /^\s*(unfollow|following)\b/i.test((it.textContent ?? '').trim()),
    );
    if (followItem || alreadyFollowing) break;
    await wait(200);
  }
  if (!followItem) {
    dismissMenu();
    console.log('[casper] follow: no Follow option (already following or own post)');
    return 'skip';
  }
  followItem.click();
  await wait(700);
  dismissMenu();
  console.log('[casper] follow: followed ✓');
  return 'followed';
};

/** Bookmark the post (private save-for-later). Mirrors the like flow. */
const bookmarkInArticle = async (
  article: HTMLElement,
): Promise<'bookmarked' | 'already' | 'skip'> => {
  if (article.querySelector(S.removeBookmarkButton)) return 'already';
  const btn = article.querySelector<HTMLButtonElement>(S.bookmarkButton);
  if (!btn) return 'skip';
  btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await wait(400);
  btn.click();
  for (let i = 0; i < 10; i++) {
    await wait(220);
    if (article.querySelector(S.removeBookmarkButton)) return 'bookmarked';
  }
  return 'skip';
};

/** Repost/retweet: click the repost button, then "Repost" in the dropdown. */
const repostInArticle = async (article: HTMLElement): Promise<'reposted' | 'already' | 'skip'> => {
  if (article.querySelector(S.unretweetButton)) return 'already';
  const btn = article.querySelector<HTMLButtonElement>(S.retweetButton);
  if (!btn) return 'skip';
  btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await wait(400);
  btn.click();
  const confirm = await waitFor<HTMLElement>(S.retweetConfirm, 3_000);
  if (!confirm) {
    dismissMenu();
    return 'skip';
  }
  confirm.click();
  for (let i = 0; i < 10; i++) {
    await wait(250);
    if (article.querySelector(S.unretweetButton)) return 'reposted';
  }
  return 'skip';
};

/**
 * Quote-tweet: open the repost menu, click "Quote", then type an AI commentary
 * into the compose dialog and post it (same compose flow as a reply).
 */
const quoteInArticle = async (
  article: HTMLElement,
  meta: PostMeta,
  platform: string,
): Promise<{ posted: boolean; draftId?: string; error?: string }> => {
  const rtBtn = article.querySelector<HTMLButtonElement>(S.retweetButton);
  if (!rtBtn) return { posted: false, error: 'repost button not found (already reposted?)' };

  const draft = await generateDraft(platform, meta.text, meta.postUrl);
  if (!draft.ok) return { posted: false, error: draft.error };

  rtBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await wait(400);
  rtBtn.click();

  const menu = await waitFor<HTMLElement>(S.dropdownMenu, 3_000);
  if (!menu) return { posted: false, draftId: draft.id, error: 'repost menu never opened' };
  let quoteItem: HTMLElement | undefined;
  for (let i = 0; i < 12; i++) {
    const items = Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    quoteItem = items.find((it) => /\bquote\b/i.test((it.textContent ?? '').trim()));
    if (quoteItem) break;
    await wait(200);
  }
  if (!quoteItem) {
    dismissMenu();
    return { posted: false, draftId: draft.id, error: 'Quote option not found in repost menu' };
  }
  quoteItem.click();

  // Quote opens the tweet compose dialog (same testids as the reply modal).
  const dialog = await waitFor<HTMLElement>(S.replyDialog, 8_000);
  if (!dialog) {
    dismissComposer();
    return { posted: false, draftId: draft.id, error: 'quote composer never opened' };
  }
  let composer: HTMLElement | null = null;
  for (let i = 0; i < 20; i++) {
    composer = dialog.querySelector<HTMLElement>(S.replyComposer);
    if (composer) break;
    await wait(200);
  }
  if (!composer) {
    dismissComposer();
    return { posted: false, draftId: draft.id, error: 'quote composer never opened' };
  }
  await typeIntoComposer(composer, draft.draftText);

  let btn: HTMLButtonElement | null = null;
  for (let i = 0; i < 16; i++) {
    btn = dialog.querySelector<HTMLButtonElement>(S.replyDialogButton);
    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') break;
    await wait(220);
  }
  if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') {
    dismissComposer();
    return { posted: false, draftId: draft.id, error: 'quote submit never enabled' };
  }
  btn.click();
  for (let i = 0; i < 16; i++) {
    await wait(350);
    if (!document.querySelector(S.replyDialog)) {
      console.log('[casper] quote: posted ✓');
      return { posted: true, draftId: draft.id };
    }
  }
  dismissComposer();
  return { posted: false, draftId: draft.id, error: 'quote composer did not clear after submit' };
};

/* ---------------------------------------------------------------------------
 * Interactive browsing — leaving the feed and coming back.
 *
 * X is a single-page app: clicking a link it already rendered routes with
 * pushState and never reloads the document, so THIS content script stays alive
 * for the whole trip. That matters — the service worker is awaiting our single
 * RUN_HOME reply, and a full page load would tear us down and kill the session.
 * So we always travel by clicking a real anchor, never by assigning location.
 * ------------------------------------------------------------------------- */

/** The in-app link inside this post that points at `path`, if X rendered one. */
const anchorTo = (article: HTMLElement, path: string): HTMLAnchorElement | null => {
  const want = path.toLowerCase();
  const links = Array.from(
    article.querySelectorAll<HTMLAnchorElement>('a[role="link"][href^="/"], a[href^="/"]'),
  );
  return (
    links.find((a) => (a.getAttribute('href') ?? '').split('?')[0]?.toLowerCase() === want) ?? null
  );
};

const pathIs = (path: string): boolean =>
  location.pathname.toLowerCase().replace(/\/$/, '') === path.toLowerCase().replace(/\/$/, '');

/** Click an in-app link and wait for the router to land on `expectedPath`. */
const clickThrough = async (
  anchor: HTMLAnchorElement,
  expectedPath: string,
  timeoutMs = 8_000,
): Promise<boolean> => {
  anchor.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await wait(500);
  anchor.click();
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (pathIs(expectedPath)) return true;
    await wait(200);
  }
  return false;
};

/**
 * Head back to the feed we came from and wait for it to render, restoring the
 * scroll position so the session resumes where it left off instead of starting
 * over from the top of the timeline.
 */
const returnToFeed = async (fromPath: string, scrollY: number): Promise<boolean> => {
  if (!pathIs(fromPath)) {
    history.back();
    const start = Date.now();
    while (Date.now() - start < 10_000 && !pathIs(fromPath)) {
      await wait(250);
    }
  }
  if (!pathIs(fromPath)) {
    // Back didn't land where we expected — fall back to the Home nav link.
    const home = document.querySelector<HTMLAnchorElement>('a[data-testid="AppTabBar_Home_Link"]');
    if (!home) return false;
    home.click();
    await wait(1_500);
  }
  if (!(await waitFor(S.postArticle, 12_000))) return false;
  window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
  await wait(700);
  return true;
};

interface ProfileVisit {
  /** True once we've left the feed — every element captured before the trip is
   *  detached by the time we're back, so the caller must re-query. */
  navigated: boolean;
  followed: boolean;
  /** Their latest post, if we liked it while we were there. */
  liked: { postUrl: string; postId: string } | null;
  error?: string;
}

/**
 * Open the author's profile, follow them from the profile header, optionally
 * like their most recent post while we're there, then come back to the feed —
 * the way a person who spotted someone interesting in their timeline behaves.
 * Always returns to the feed, even when the follow fails.
 */
const visitProfileAndFollow = async (
  article: HTMLElement,
  handle: string,
  alsoLike: boolean,
): Promise<ProfileVisit> => {
  const profilePath = `/${handle}`;
  const anchor = anchorTo(article, profilePath);
  if (!anchor) {
    return { navigated: false, followed: false, liked: null, error: 'no author link on post' };
  }

  const fromPath = location.pathname;
  const scrollY = window.scrollY;

  if (!(await clickThrough(anchor, profilePath))) {
    await returnToFeed(fromPath, scrollY);
    return { navigated: true, followed: false, liked: null, error: 'profile never opened' };
  }

  const visit: ProfileVisit = { navigated: true, followed: false, liked: null };
  try {
    // Look at the profile for a beat before acting, like a person reading it.
    await wait(randomInt(1_200, 2_400));
    const outcome = await followCurrentProfile();
    visit.followed = outcome.followed;
    if (!outcome.followed && outcome.error) visit.error = outcome.error;

    if (alsoLike) {
      const top = await waitFor<HTMLElement>(S.postArticle, 6_000);
      const topMeta = top ? readArticle(top) : null;
      if (top && topMeta && (await likeInArticle(top)) === 'liked') {
        visit.liked = { postUrl: topMeta.postUrl, postId: topMeta.postId };
      }
    }
  } catch (err) {
    visit.error = err instanceof Error ? err.message : 'profile visit failed';
  } finally {
    await wait(randomInt(600, 1_400));
    await returnToFeed(fromPath, scrollY);
  }
  return visit;
};

/**
 * Open the post's own page and reply there, then come back — what someone does
 * when a post is worth more than a scroll-past. The draft is generated BEFORE
 * we navigate so we're never parked on the post page waiting on the network.
 */
const replyOnPostPage = async (
  article: HTMLElement,
  meta: PostMeta,
  platform: string,
): Promise<{ navigated: boolean; posted: boolean; draftId?: string; error?: string }> => {
  const anchor = anchorTo(article, meta.permalinkPath);
  if (!anchor) return { navigated: false, posted: false, error: 'no permalink on post' };

  const draft = await generateDraft(platform, meta.text, meta.postUrl);
  if (!draft.ok) return { navigated: false, posted: false, error: draft.error };

  const fromPath = location.pathname;
  const scrollY = window.scrollY;

  if (!(await clickThrough(anchor, meta.permalinkPath))) {
    await returnToFeed(fromPath, scrollY);
    return { navigated: true, posted: false, draftId: draft.id, error: 'post page never opened' };
  }

  try {
    // Read the post first, then reply in its own inline composer.
    await wait(randomInt(1_000, 2_000));
    const r = await submitComment(draft.draftText);
    return {
      navigated: true,
      posted: r.posted,
      draftId: draft.id,
      ...(r.error ? { error: r.error } : {}),
    };
  } catch (err) {
    return {
      navigated: true,
      posted: false,
      draftId: draft.id,
      error: err instanceof Error ? err.message : 'reply flow error',
    };
  } finally {
    await wait(randomInt(600, 1_200));
    await returnToFeed(fromPath, scrollY);
  }
};

export const runHomeAutopilot = async (
  opts: HomeAutopilotOptions,
): Promise<HomeAutopilotResult> => {
  const result: HomeAutopilotResult = {
    liked: [],
    commented: [],
    queued: [],
    followed: [],
    bookmarked: [],
    reposted: [],
    quoted: [],
    scanned: 0,
  };
  // If the timeline never renders (logged out / wrong page), don't sit here
  // scrolling an empty page for the whole session — bail and let the executor
  // report it. Otherwise we keep one tab open and working until time's up.
  const firstArticle = await waitFor(S.postArticle, 12_000);
  if (!firstArticle) return result;

  // Resolved once per session from the sidebar — cheap, and it lets us skip our
  // own posts without a round-trip to the service worker for every article.
  const ownHandle = getOwnHandle();

  const processed = new Set<string>();
  const skip = new Set(opts.skipCommentIds);
  const skipQuote = new Set(opts.skipQuoteIds);
  let likes = 0;
  let comments = 0;
  let follows = 0;
  let bookmarks = 0;
  let reposts = 0;
  let quotes = 0;
  const total = (): number => likes + comments + follows + bookmarks + reposts + quotes;
  // Pausing stops a real run within a fraction of a second — every wait below
  // ends early when it flips. A dry run is meant to work while paused.
  const respectStop = !opts.dryRun;
  await syncStopSignal();
  const stopNow = (): boolean => respectStop && isStopped();
  const pause = async (): Promise<void> => {
    await stoppableWait(randomInt(opts.minDelayMs, opts.maxDelayMs), respectStop);
  };
  // Tags every action this session records with its source (updateplan 6.7 —
  // D8), so the background spends search-feed actions from the search budget
  // instead of the one home/profile sessions share.
  const record = (
    actionType: ActionType,
    data: Parameters<typeof recordAction>[2],
  ): Promise<void> =>
    recordAction(opts.platform, actionType, opts.isSearchFeed ? { ...data, source: 'search' } : data);

  const startedAt = Date.now();
  const deadline = startedAt + Math.max(0, opts.maxRunMs);
  const timeLeft = (): boolean => Date.now() < deadline;
  // Stop once every enabled action type has spent its daily budget, or the
  // overall (free-tier / combined) ceiling is hit.
  const allMaxed = (): boolean =>
    likes >= opts.maxLikes &&
    comments >= opts.maxComments &&
    follows >= opts.maxFollows &&
    bookmarks >= opts.maxBookmarks &&
    reposts >= opts.maxReposts &&
    quotes >= opts.maxQuotes;
  const budgetLeft = (): boolean => total() < opts.totalBudget && !allMaxed();

  // The kill switch lives in storage: toggling the Active pill off flips
  // settings.isPaused. Poll it so a long session stops within a couple seconds
  // instead of running to its deadline. (Key mirrors STORAGE_KEYS.settings.)
  const stopRequested = async (): Promise<boolean> => stopNow();

  /**
   * The per-hour ceiling, checked before EVERY action rather than once at the
   * start — a session runs up to an hour, so a start-of-session check would let
   * the whole hour's worth land in its first five minutes.
   *
   * When the ceiling is reached we WAIT instead of returning: closing the tab
   * and reopening it later is both more suspicious and more expensive than a
   * person putting their phone down for a few minutes. Polling in short chunks
   * keeps the kill switch and the session deadline responsive while we sit.
   * Returns false only when the session should stop entirely.
   */
  const RATE_POLL_MS = 15_000;
  let announcedCeiling = false;
  const rateGate = async (): Promise<boolean> => {
    if (await canActNow()) return true;
    if (!announcedCeiling) {
      console.log('[casper] hourly ceiling reached — pausing until the window rolls');
      announcedCeiling = true;
    }
    while (timeLeft()) {
      if (await stopRequested()) return false;
      const due = await msUntilSlotNow();
      await stoppableWait(Math.min(Math.max(due, 1_000), RATE_POLL_MS), respectStop);
      if (await canActNow()) return true;
    }
    return false;
  };

  // Profile visits set stopAfterStaleRun > 0: once we've scrolled past a run of
  // posts older than the freshness window, the (reverse-chronological) profile
  // has no more fresh posts, so we stop instead of scrolling its whole history.
  let staleStreak = 0;
  let staleStop = false;

  // A dry run ignores the action budgets entirely (it spends none of them), so
  // it needs its own reason to stop.
  let dryRunFull = false;

  let emptyPasses = 0;
  while (timeLeft() && budgetLeft() && !staleStop && !dryRunFull) {
    if (await stopRequested()) break;

    let seenNew = 0;
    const articles = Array.from(document.querySelectorAll<HTMLElement>(S.postArticle));
    for (const article of articles) {
      if (!timeLeft() || !budgetLeft() || stopNow()) break;

      const meta = readArticle(article);
      if (!meta || processed.has(meta.postId)) continue;
      processed.add(meta.postId);
      result.scanned++;
      seenNew++;

      if (!isFresh(meta.publishedAt, opts.freshnessHours)) {
        if (opts.stopAfterStaleRun > 0 && ++staleStreak >= opts.stopAfterStaleRun) {
          staleStop = true;
          break;
        }
        continue;
      }
      staleStreak = 0;
      // Never act on our own posts. They show up in the home timeline and on our
      // own profile, and liking or replying to yourself is the single most
      // obvious "this account is automated" tell there is.
      if (
        ownHandle &&
        meta.authorHandle &&
        meta.authorHandle.toLowerCase() === ownHandle.toLowerCase()
      ) {
        continue;
      }
      // A post that is itself a reply is buried in someone else's thread —
      // engaging it spends the day's budget on the lowest-reach posts around.
      if (opts.skipReplies && looksLikeReply(article)) continue;

      // Media-aware reading (updateplan 6.4 — D4/D5): a captionless video or
      // image-only post reads as '' from S.postText alone, and `isRelevant('')`
      // is false whenever keywords are set — so it was skipped outright. Click
      // through "Show more" and fold in alt text / a link card's title / a
      // quoted tweet's own words BEFORE the dwell and the relevance check, so
      // both are computed from what the post is actually about.
      const enriched = await enrichArticleText(article, meta);

      // READ IT. This dwell is spent on every post that gets this far, whether
      // or not anything comes of it — a reader who only ever pauses on the posts
      // they are about to like has a very distinctive rhythm. Proportional to
      // length, so a thread costs more attention than a one-liner.
      //
      // Spotlighted as 'reading' the same as an action, so the engine is
      // visibly doing something for every post it considers, not only the
      // rare one it acts on — a session spent mostly reading looked
      // completely idle in between without this. `withSpotlight` clears it
      // the instant the dwell ends regardless of what happens next; if this
      // post goes on to be acted on, that action's own `withSpotlight` call
      // replaces it with the real (coral) outline a moment later.
      await withSpotlight(
        article,
        'reading',
        { authorHandle: meta.authorHandle, postUrl: meta.postUrl, text: enriched.text },
        () => stoppableWait(readDwellMs(enriched.text), respectStop),
      );
      if (stopNow()) break;

      // Relevance is relaxed for media exactly the way the plan asks: an
      // author already on the watch list is relevant regardless of caption —
      // for a home/search scan (the only sources where `opts.keywords` is ever
      // non-empty) that's the one case a thin caption used to wrongly filter
      // out someone the user explicitly chose to watch.
      const authorIsWatched = Boolean(
        enriched.authorHandle &&
          opts.targetHandles.includes(enriched.authorHandle.toLowerCase()),
      );
      // Topic match is the open home feed's filter only (see `matchKeywords`).
      if (opts.matchKeywords && !authorIsWatched && !isRelevant(enriched.text, opts.keywords)) continue;
      if (isExcluded(enriched.text, opts.excludeKeywords)) continue;
      meta.text = enriched.text;
      // Which keyword actually matched (updateplan 5.1's "which topics are
      // working") — null when the post matched via `authorIsWatched` instead,
      // or when there were no keywords to begin with. Never guessed.
      const matchedTopic = matchedKeyword(enriched.text, opts.keywords);

      // DRY RUN — everything above this line is the real selection logic, and
      // everything below it is the part that touches X. A dry run stops here:
      // it records what it WOULD have done and moves on, so the preview is
      // produced by the same code that does the work rather than by a second
      // implementation that would quietly drift out of agreement with it.
      if (opts.dryRun) {
        const wouldDo: string[] = [];
        if (opts.like) wouldDo.push('like');
        if (opts.follow && meta.authorHandle) wouldDo.push('follow');
        const candidate: DryRunCandidate = {
          postUrl: meta.postUrl,
          postId: meta.postId,
          authorHandle: meta.authorHandle,
          text: meta.text.slice(0, 400),
          wouldDo,
        };
        // The reply is really generated. A previewed reply the model did not
        // write would misrepresent the one thing the user is here to judge.
        if (opts.comment && meta.text.length >= MIN_REPLY_POST_CHARS) {
          wouldDo.unshift('reply');
          const draft = await generateDraft(opts.platform, meta.text, meta.postUrl);
          if (draft.ok) candidate.draft = draft.draftText;
          else candidate.draftError = draft.error;
        }
        (result.wouldEngage ??= []).push(candidate);
        if ((result.wouldEngage?.length ?? 0) >= (opts.dryRunMax ?? 10)) {
          dryRunFull = true;
          break;
        }
        continue;
      }

      // Only check the kill switch for posts we're about to act on (these are
      // what incur the real delays); skipped posts fly by in microseconds.
      if (await stopRequested()) break;

      article.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await wait(600);

      // LIKE
      if (
        opts.like &&
        likes < opts.maxLikes &&
        total() < opts.totalBudget &&
        (await rateGate())
      ) {
        try {
          const r = await withSpotlight(article, 'like', meta, () => likeInArticle(article));
          if (r === 'liked') {
            result.liked.push({
              postUrl: meta.postUrl,
              postId: meta.postId,
              authorHandle: meta.authorHandle,
            });
            likes++;
            await record('like', {
              postUrl: meta.postUrl,
              postId: meta.postId,
            });
            await pause();
          }
        } catch {
          /* skip this like */
        }
      }

      // BOOKMARK
      if (
        opts.bookmark &&
        bookmarks < opts.maxBookmarks &&
        total() < opts.totalBudget &&
        (await rateGate())
      ) {
        try {
          const bookmarked = await withSpotlight(article, 'bookmark', meta, () =>
            bookmarkInArticle(article),
          );
          if (bookmarked === 'bookmarked') {
            result.bookmarked.push({ postUrl: meta.postUrl, postId: meta.postId });
            bookmarks++;
            await record('bookmark', {
              postUrl: meta.postUrl,
              postId: meta.postId,
            });
            await pause();
          }
        } catch {
          /* skip this bookmark */
        }
      }

      // QUOTE (before repost — a quote amplifies the post on its own)
      let quotedThisPost = false;
      if (
        opts.quote &&
        meta.text.length >= MIN_REPLY_POST_CHARS &&
        !skipQuote.has(meta.postId) &&
        quotes < opts.maxQuotes &&
        total() < opts.totalBudget &&
        (await rateGate())
      ) {
        try {
          const r = await withSpotlight(article, 'quote', meta, () =>
            quoteInArticle(article, meta, opts.platform),
          );
          if (r.posted) {
            result.quoted.push({
              postUrl: meta.postUrl,
              postId: meta.postId,
              ...(r.draftId ? { draftId: r.draftId } : {}),
            });
            quotes++;
            quotedThisPost = true;
            skipQuote.add(meta.postId);
            await record('quote', {
              postUrl: meta.postUrl,
              postId: meta.postId,
              ...(r.draftId ? { draftId: r.draftId } : {}),
            });
            await pause();
          } else if (r.error) {
            console.log('[casper] quote:', r.error);
          }
        } catch (err) {
          dismissComposer();
          console.log('[casper] quote flow error', err);
        }
      }

      // REPOST (skipped if we just quoted this same post)
      if (
        opts.repost &&
        !quotedThisPost &&
        reposts < opts.maxReposts &&
        total() < opts.totalBudget &&
        (await rateGate())
      ) {
        try {
          const reposted = await withSpotlight(article, 'repost', meta, () =>
            repostInArticle(article),
          );
          if (reposted === 'reposted') {
            result.reposted.push({ postUrl: meta.postUrl, postId: meta.postId });
            reposts++;
            await record('repost', {
              postUrl: meta.postUrl,
              postId: meta.postId,
            });
            await pause();
          }
        } catch {
          /* skip this repost */
        }
      }

      // AUTO-REPLY — on the post's own page when interactive, otherwise in the
      // timeline's reply modal. `live` is this post's element in the CURRENT
      // DOM: a trip off the feed detaches `article`, so anything after an
      // excursion has to work from the re-queried node instead.
      let live: HTMLElement | null = article;
      let didNavigate = false;
      if (
        opts.comment &&
        // Too short to answer: the model would be inventing a reaction to "this."
        meta.text.length >= MIN_REPLY_POST_CHARS &&
        !skip.has(meta.postId) &&
        comments < opts.maxComments &&
        total() < opts.totalBudget
      ) {
        try {
          if (opts.replyApproval) {
            // Approval mode: draft it and park it for review. Nothing is typed
            // into X, so no action is recorded and no daily cap is spent — that
            // happens later, when the user approves and it posts normally.
            const draft = await withSpotlight(article, 'reply', meta, () =>
              generateDraft(opts.platform, meta.text, meta.postUrl),
            );
            if (!draft.ok) {
              result.commentError = draft.error;
            } else {
              const outcome = await queueDraftForReview(opts.platform, meta, draft, matchedTopic);
              if (outcome === 'queued') {
                result.queued.push({
                  postUrl: meta.postUrl,
                  postId: meta.postId,
                  draftId: draft.id,
                });
                comments++;
                skip.add(meta.postId);
                await pause();
              } else if (outcome === 'full') {
                // Nowhere to put further drafts — stop drafting for the rest of
                // this session, but keep liking/following as we scroll.
                comments = opts.maxComments;
                result.commentError = 'Review queue is full — approve or skip a few replies.';
              } else {
                result.commentError = 'Could not queue the draft for review.';
              }
            }
          } else if (await rateGate()) {
            // Only this branch is gated: approval mode above drafts to the
            // review queue and types nothing into X, so it costs the hourly
            // window nothing. Posting the draft later goes through the queued
            // path, which is gated and counted there.
            const r = await withSpotlight(article, 'reply', meta, async () =>
              opts.interactive
                ? await replyOnPostPage(article, meta, opts.platform)
                : { navigated: false, ...(await commentInArticle(article, meta, opts.platform)) },
            );
            if (r.navigated) {
              didNavigate = true;
              live = findArticleById(meta.postId);
            }
            if (r.posted) {
              result.commented.push({
                postUrl: meta.postUrl,
                postId: meta.postId,
                ...(r.draftId ? { draftId: r.draftId } : {}),
              });
              comments++;
              skip.add(meta.postId);
              await record('comment', {
                postUrl: meta.postUrl,
                postId: meta.postId,
                ...(r.draftId ? { draftId: r.draftId } : {}),
                ...(matchedTopic ? { matchedKeyword: matchedTopic } : {}),
              });
              await pause();
            } else if (r.error) {
              result.commentError = r.error;
            }
          }
        } catch (err) {
          dismissComposer();
          // An interactive reply that threw may have left the feed anyway, so
          // treat this post's element as stale rather than clicking a dead node.
          if (opts.interactive) {
            didNavigate = true;
            live = findArticleById(meta.postId);
          }
          result.commentError = err instanceof Error ? err.message : 'comment flow error';
        }
      }

      // FOLLOW — open their profile and follow from the header the way a person
      // would (interactive), otherwise use the tweet's ••• menu without leaving.
      // Whitelist checked here too (updateplan 6.6 — D7): this inline path used
      // to have no whitelist check at all, unlike the standalone follow-list
      // runner in executor.ts — "will never follow accounts on this list" has
      // to hold for every path that can follow, not just one of them.
      if (
        opts.follow &&
        live &&
        follows < opts.maxFollows &&
        meta.authorHandle &&
        !opts.whitelist.includes(meta.authorHandle.toLowerCase()) &&
        total() < opts.totalBudget &&
        (await rateGate())
      ) {
        const profileUrl = `https://x.com/${meta.authorHandle}`;
        try {
          if (opts.interactive) {
            // Give their latest post a like while we're on the profile — but
            // only if liking is on and both budgets can absorb the extra action.
            // A profile visit can land two actions (the follow and a like) but
            // it only passed one gate, so require the window to have room for
            // both rather than letting the second one ride in free.
            const alsoLike =
              opts.like &&
              likes < opts.maxLikes &&
              total() + 1 < opts.totalBudget &&
              (await slotsLeftNow()) >= 2;
            const visit = await withSpotlight(live, 'follow', meta, () =>
              visitProfileAndFollow(live, meta.authorHandle as string, alsoLike),
            );
            if (visit.navigated) didNavigate = true;
            if (visit.followed) {
              result.followed.push({ handle: meta.authorHandle, profileUrl });
              follows++;
              await record('follow', {
                handle: meta.authorHandle,
                profileUrl,
              });
            }
            if (visit.liked) {
              result.liked.push({ ...visit.liked, authorHandle: meta.authorHandle });
              likes++;
              await record('like', visit.liked);
            }
            if (visit.followed || visit.liked) await pause();
          } else if (
            (await withSpotlight(live, 'follow', meta, () => followAuthorInline(live))) ===
            'followed'
          ) {
            result.followed.push({ handle: meta.authorHandle, profileUrl });
            follows++;
            await record('follow', {
              handle: meta.authorHandle,
              profileUrl,
            });
            await pause();
          }
        } catch {
          /* skip this follow */
        }
      }

      // A trip off the feed re-renders the timeline, so every element captured
      // for this pass is detached now. Restart the pass and re-query.
      if (didNavigate) break;
    }

    if (!budgetLeft() || dryRunFull) break;

    // Keep scrolling so a long session keeps pulling in fresh posts. Twitter
    // virtualizes the timeline, so the DOM stays bounded as we go. Distance and
    // pause are drawn fresh each pass: an exact 700px / 650ms metronome is a
    // fingerprint whatever the delays around it look like.
    if (stopNow()) break;
    await smoothScrollBy(nextScrollDistancePx());
    if (await stoppableWait(nextScrollPauseMs(), respectStop)) break;

    // If several passes in a row surface nothing new, we've caught up to the
    // feed — nudge harder and wait a beat before trying again, rather than
    // spinning, then keep going until the session's time/budget is spent.
    if (seenNew === 0) {
      emptyPasses++;
      if (emptyPasses >= 3) {
        window.scrollBy({ top: 1600, behavior: 'instant' as ScrollBehavior });
        if (await stoppableWait(2_000, respectStop)) break;
        emptyPasses = 0;
      }
    } else {
      emptyPasses = 0;
    }
  }

  // Spotlight is left on the last post on purpose: it shows where Ghostly
  // left off. Only the setting (or leaving the page) takes it down.
  return result;
};
