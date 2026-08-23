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
import { followCurrentProfile } from './follow.js';
import type { HomeAutopilotOptions, HomeAutopilotResult } from '../common/content-messages.js';

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Report one completed action to the background the instant it lands, so the
 *  dashboard counters update live during a long session (instead of only when
 *  the whole session returns). Best-effort — a dropped message just undercounts. */
const recordAction = async (
  platform: string,
  actionType: ActionType,
  data: { postUrl?: string; postId?: string; handle?: string; profileUrl?: string; draftId?: string },
): Promise<void> => {
  try {
    await chrome.runtime.sendMessage({ type: 'RECORD_ACTION', payload: { platform, actionType, ...data } });
  } catch {
    /* background unreachable — ignore */
  }
};

interface PostMeta {
  postId: string;
  postUrl: string;
  /** In-app path of the post (`/handle/status/id`) — the href on the anchor we
   *  click to open it without a full page load. */
  permalinkPath: string;
  authorHandle: string | null;
  text: string;
  publishedAt: string | null;
}

const readArticle = (article: HTMLElement): PostMeta | null => {
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

/** Re-find a post in the CURRENT DOM by id. After an in-app navigation the feed
 *  re-renders, so every element captured before the trip is detached — anything
 *  that wants to keep working on a post has to look it up again. */
const findArticleById = (postId: string): HTMLElement | null => {
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

const matchesAny = (text: string, keywords: string[]): boolean => {
  const hay = text.toLowerCase();
  return keywords.some((k) => {
    const needle = k.trim().toLowerCase();
    return needle.length > 0 && hay.includes(needle);
  });
};

const isRelevant = (text: string, keywords: string[]): boolean =>
  keywords.length === 0 || matchesAny(text, keywords);

/** A post is excluded if it contains any blocklist keyword. */
const isExcluded = (text: string, excludeKeywords: string[]): boolean =>
  excludeKeywords.length > 0 && matchesAny(text, excludeKeywords);

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
const commentInArticle = async (
  article: HTMLElement,
  meta: PostMeta,
  platform: string,
): Promise<{ posted: boolean; draftId?: string; error?: string }> => {
  const replyBtn = article.querySelector<HTMLButtonElement>('button[data-testid="reply"]');
  if (!replyBtn) return { posted: false, error: 'reply button not found on post' };

  const draft = await generateDraft(platform, meta.text, meta.postUrl);
  if (!draft.ok) {
    console.log('[casper] comment: generation failed —', draft.error);
    return { posted: false, error: draft.error };
  }
  console.log('[casper] comment: drafted, opening reply box…');

  replyBtn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await wait(400);
  replyBtn.click();

  // The reply opens a MODAL. Scope the composer + Send button to it — the home
  // timeline also has a top-of-feed composer with the same testid, so an
  // unscoped query types into the wrong box and the modal's Send never enables.
  const dialog = await waitFor<HTMLElement>(S.replyDialog, 8_000);
  if (!dialog) {
    dismissComposer();
    return { posted: false, draftId: draft.id, error: 'reply dialog never opened' };
  }

  let composer: HTMLElement | null = null;
  for (let i = 0; i < 20; i++) {
    composer = dialog.querySelector<HTMLElement>(S.replyComposer);
    if (composer) break;
    await wait(200);
  }
  if (!composer) {
    dismissComposer();
    return { posted: false, draftId: draft.id, error: 'reply composer never opened' };
  }

  await typeIntoComposer(composer, draft.draftText);

  let btn: HTMLButtonElement | null = null;
  for (let i = 0; i < 16; i++) {
    btn = dialog.querySelector<HTMLButtonElement>(S.replyDialogButton);
    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') break;
    await wait(220);
  }
  if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') {
    console.log('[casper] comment: Send stayed disabled — text may not have registered');
    dismissComposer();
    return { posted: false, draftId: draft.id, error: 'reply submit button never enabled' };
  }
  btn.click();

  // Confirm the modal goes away (reply submitted, dialog closed).
  for (let i = 0; i < 16; i++) {
    await wait(350);
    if (!document.querySelector(S.replyDialog)) {
      console.log('[casper] comment: posted ✓');
      return { posted: true, draftId: draft.id };
    }
  }
  dismissComposer();
  return { posted: false, draftId: draft.id, error: 'composer did not clear after submit' };
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
  const pause = (): Promise<void> => wait(randomInt(opts.minDelayMs, opts.maxDelayMs));

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
  const stopRequested = async (): Promise<boolean> => {
    try {
      const got = await chrome.storage.local.get('casper.settings');
      return (got['casper.settings'] as { isPaused?: boolean } | undefined)?.isPaused === true;
    } catch {
      return false;
    }
  };

  // Profile visits set stopAfterStaleRun > 0: once we've scrolled past a run of
  // posts older than the freshness window, the (reverse-chronological) profile
  // has no more fresh posts, so we stop instead of scrolling its whole history.
  let staleStreak = 0;
  let staleStop = false;

  let emptyPasses = 0;
  while (timeLeft() && budgetLeft() && !staleStop) {
    if (await stopRequested()) break;

    let seenNew = 0;
    const articles = Array.from(document.querySelectorAll<HTMLElement>(S.postArticle));
    for (const article of articles) {
      if (!timeLeft() || !budgetLeft()) break;

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
      if (!isRelevant(meta.text, opts.keywords)) continue;
      if (isExcluded(meta.text, opts.excludeKeywords)) continue;

      // Only check the kill switch for posts we're about to act on (these are
      // what incur the real delays); skipped posts fly by in microseconds.
      if (await stopRequested()) break;

      article.scrollIntoView({ behavior: 'smooth', block: 'center' });
      await wait(600);

      // LIKE
      if (opts.like && likes < opts.maxLikes && total() < opts.totalBudget) {
        try {
          const r = await likeInArticle(article);
          if (r === 'liked') {
            result.liked.push({
              postUrl: meta.postUrl,
              postId: meta.postId,
              authorHandle: meta.authorHandle,
            });
            likes++;
            await recordAction(opts.platform, 'like', {
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
      if (opts.bookmark && bookmarks < opts.maxBookmarks && total() < opts.totalBudget) {
        try {
          if ((await bookmarkInArticle(article)) === 'bookmarked') {
            result.bookmarked.push({ postUrl: meta.postUrl, postId: meta.postId });
            bookmarks++;
            await recordAction(opts.platform, 'bookmark', {
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
        meta.text &&
        !skipQuote.has(meta.postId) &&
        quotes < opts.maxQuotes &&
        total() < opts.totalBudget
      ) {
        try {
          const r = await quoteInArticle(article, meta, opts.platform);
          if (r.posted) {
            result.quoted.push({
              postUrl: meta.postUrl,
              postId: meta.postId,
              ...(r.draftId ? { draftId: r.draftId } : {}),
            });
            quotes++;
            quotedThisPost = true;
            skipQuote.add(meta.postId);
            await recordAction(opts.platform, 'quote', {
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
      if (opts.repost && !quotedThisPost && reposts < opts.maxReposts && total() < opts.totalBudget) {
        try {
          if ((await repostInArticle(article)) === 'reposted') {
            result.reposted.push({ postUrl: meta.postUrl, postId: meta.postId });
            reposts++;
            await recordAction(opts.platform, 'repost', {
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
        meta.text &&
        !skip.has(meta.postId) &&
        comments < opts.maxComments &&
        total() < opts.totalBudget
      ) {
        try {
          const r = opts.interactive
            ? await replyOnPostPage(article, meta, opts.platform)
            : { navigated: false, ...(await commentInArticle(article, meta, opts.platform)) };
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
            await recordAction(opts.platform, 'comment', {
              postUrl: meta.postUrl,
              postId: meta.postId,
              ...(r.draftId ? { draftId: r.draftId } : {}),
            });
            await pause();
          } else if (r.error) {
            result.commentError = r.error;
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
      if (
        opts.follow &&
        live &&
        follows < opts.maxFollows &&
        meta.authorHandle &&
        total() < opts.totalBudget
      ) {
        const profileUrl = `https://x.com/${meta.authorHandle}`;
        try {
          if (opts.interactive) {
            // Give their latest post a like while we're on the profile — but
            // only if liking is on and both budgets can absorb the extra action.
            const alsoLike =
              opts.like && likes < opts.maxLikes && total() + 1 < opts.totalBudget;
            const visit = await visitProfileAndFollow(live, meta.authorHandle, alsoLike);
            if (visit.navigated) didNavigate = true;
            if (visit.followed) {
              result.followed.push({ handle: meta.authorHandle, profileUrl });
              follows++;
              await recordAction(opts.platform, 'follow', {
                handle: meta.authorHandle,
                profileUrl,
              });
            }
            if (visit.liked) {
              result.liked.push({ ...visit.liked, authorHandle: meta.authorHandle });
              likes++;
              await recordAction(opts.platform, 'like', visit.liked);
            }
            if (visit.followed || visit.liked) await pause();
          } else if ((await followAuthorInline(live)) === 'followed') {
            result.followed.push({ handle: meta.authorHandle, profileUrl });
            follows++;
            await recordAction(opts.platform, 'follow', {
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

    if (!budgetLeft()) break;

    // Keep scrolling so a long session keeps pulling in fresh posts. Twitter
    // virtualizes the timeline, so the DOM stays bounded as we go.
    await smoothScrollBy(700);
    await wait(650);

    // If several passes in a row surface nothing new, we've caught up to the
    // feed — nudge harder and wait a beat before trying again, rather than
    // spinning, then keep going until the session's time/budget is spent.
    if (seenNew === 0) {
      emptyPasses++;
      if (emptyPasses >= 3) {
        window.scrollBy({ top: 1600, behavior: 'instant' as ScrollBehavior });
        await wait(2_000);
        emptyPasses = 0;
      }
    } else {
      emptyPasses = 0;
    }
  }

  return result;
};
