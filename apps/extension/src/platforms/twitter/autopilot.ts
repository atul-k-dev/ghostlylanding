/**
 * Inline home-feed autopilot for Twitter/X.
 *
 * Runs entirely inside ONE tab: smoothly scrolls the timeline and likes /
 * comments / follows in place as it goes — so the user can watch a single,
 * continuous session instead of tabs popping open for each action.
 *
 * Safety budgets (daily caps, lifetime cap) are computed by the executor and
 * passed in; this module just stops when a budget is hit. Every per-post action
 * is wrapped so a single failure never breaks the smooth scroll.
 */
import { TWITTER_SELECTORS as S } from './selectors.js';
import { waitFor, smoothScrollBy, wait } from './dom.js';
import { typeIntoComposer } from './comment.js';
import type { HomeAutopilotOptions, HomeAutopilotResult } from '../common/content-messages.js';

const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

interface PostMeta {
  postId: string;
  postUrl: string;
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
    authorHandle: handleMatch?.[1] ?? null,
    text: (article.querySelector<HTMLElement>(S.postText)?.textContent ?? '').trim(),
    publishedAt: time?.getAttribute('datetime') ?? null,
  };
};

const isFresh = (publishedAt: string | null, hours: number): boolean => {
  if (!publishedAt) return false;
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= hours * 60 * 60 * 1000;
};

const isRelevant = (text: string, keywords: string[]): boolean => {
  if (keywords.length === 0) return true;
  const hay = text.toLowerCase();
  return keywords.some((k) => {
    const needle = k.trim().toLowerCase();
    return needle.length > 0 && hay.includes(needle);
  });
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

  const composer = await waitFor<HTMLElement>(S.replyComposer, 8_000);
  if (!composer) {
    dismissComposer();
    return { posted: false, draftId: draft.id, error: 'reply composer never opened' };
  }

  await typeIntoComposer(composer, draft.draftText);

  let btn: HTMLButtonElement | null = null;
  for (let i = 0; i < 12; i++) {
    btn = document.querySelector<HTMLButtonElement>(S.replyButton);
    if (btn && !btn.disabled && btn.getAttribute('aria-disabled') !== 'true') break;
    await wait(220);
  }
  if (!btn || btn.disabled || btn.getAttribute('aria-disabled') === 'true') {
    dismissComposer();
    return { posted: false, draftId: draft.id, error: 'reply submit button never enabled' };
  }
  btn.click();

  // Confirm the composer goes away (reply submitted, dialog closed).
  for (let i = 0; i < 16; i++) {
    await wait(350);
    if (!document.querySelector(S.replyComposer)) {
      console.log('[casper] comment: posted ✓');
      return { posted: true, draftId: draft.id };
    }
  }
  dismissComposer();
  return { posted: false, draftId: draft.id, error: 'composer did not clear after submit' };
};

/**
 * Best-effort inline follow via the author's hovercard. X has no per-tweet
 * follow button, so we hover the author link and click Follow in the card.
 * Returns 'followed' on success, 'skip' otherwise (never throws).
 */
const followAuthorInline = async (article: HTMLElement): Promise<'followed' | 'skip'> => {
  const link = article.querySelector<HTMLAnchorElement>('a[role="link"][href^="/"]');
  if (!link) return 'skip';
  link.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await wait(300);
  for (const type of ['pointerover', 'mouseover', 'mouseenter']) {
    link.dispatchEvent(new MouseEvent(type, { bubbles: true }));
  }
  const card = await waitFor<HTMLElement>('[data-testid="HoverCard"]', 2_500);
  if (!card) return 'skip';
  if (card.querySelector(S.unfollowButton)) return 'skip'; // already following
  const followBtn = card.querySelector<HTMLButtonElement>(S.followButton);
  if (!followBtn) return 'skip';
  followBtn.click();
  await wait(700);
  // Move the pointer away so the card dismisses.
  document.body.dispatchEvent(new MouseEvent('mousemove', { bubbles: true }));
  return 'followed';
};

export const runHomeAutopilot = async (
  opts: HomeAutopilotOptions,
): Promise<HomeAutopilotResult> => {
  const result: HomeAutopilotResult = {
    liked: [],
    commented: [],
    followed: [],
    scanned: 0,
  };
  await waitFor(S.postArticle, 12_000);

  const processed = new Set<string>();
  const skip = new Set(opts.skipCommentIds);
  let likes = 0;
  let comments = 0;
  let follows = 0;
  const total = (): number => likes + comments + follows;
  const pause = (): Promise<void> => wait(randomInt(opts.minDelayMs, opts.maxDelayMs));
  const startedAt = Date.now();
  const MAX_SESSION_MS = 200_000; // stay well under the MV3 worker lifetime

  for (let scrollPass = 0; scrollPass < 10; scrollPass++) {
    if (Date.now() - startedAt > MAX_SESSION_MS) break;
    const articles = Array.from(document.querySelectorAll<HTMLElement>(S.postArticle));
    for (const article of articles) {
      if (total() >= opts.totalBudget) break;
      if (Date.now() - startedAt > MAX_SESSION_MS) break;
      const allDone =
        likes >= opts.maxLikes && comments >= opts.maxComments && follows >= opts.maxFollows;
      if (allDone) break;

      const meta = readArticle(article);
      if (!meta || processed.has(meta.postId)) continue;
      processed.add(meta.postId);
      result.scanned++;

      if (!isFresh(meta.publishedAt, opts.freshnessHours)) continue;
      if (!isRelevant(meta.text, opts.keywords)) continue;

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
            await pause();
          }
        } catch {
          /* skip this like */
        }
      }

      // AUTO-REPLY (generate + post inline)
      if (
        opts.comment &&
        meta.text &&
        !skip.has(meta.postId) &&
        comments < opts.maxComments &&
        total() < opts.totalBudget
      ) {
        try {
          const r = await commentInArticle(article, meta, opts.platform);
          if (r.posted) {
            result.commented.push({
              postUrl: meta.postUrl,
              postId: meta.postId,
              ...(r.draftId ? { draftId: r.draftId } : {}),
            });
            comments++;
            skip.add(meta.postId);
            await pause();
          } else if (r.error) {
            result.commentError = r.error;
          }
        } catch (err) {
          dismissComposer();
          result.commentError = err instanceof Error ? err.message : 'comment flow error';
        }
      }

      // FOLLOW (best-effort inline)
      if (opts.follow && follows < opts.maxFollows && meta.authorHandle && total() < opts.totalBudget) {
        try {
          const r = await followAuthorInline(article);
          if (r === 'followed') {
            result.followed.push({
              handle: meta.authorHandle,
              profileUrl: `https://x.com/${meta.authorHandle}`,
            });
            follows++;
            await pause();
          }
        } catch {
          /* skip this follow */
        }
      }
    }

    if (total() >= opts.totalBudget) break;
    if (likes >= opts.maxLikes && comments >= opts.maxComments && follows >= opts.maxFollows) break;
    await smoothScrollBy(700);
    await wait(650);
  }

  return result;
};
