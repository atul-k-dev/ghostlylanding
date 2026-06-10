/**
 * Twitter DOM operations run inside the content script.
 *
 * Public helpers:
 *   - waitFor: poll-and-wait for a selector
 *   - collectPostsFromTimeline: scrape the visible timeline into ScannedPost[]
 *   - likeCurrentPost: locate + click the like button on a status page
 */
import { TWITTER_SELECTORS as S } from './selectors.js';
import type { ScannedPost } from '../common/content-messages.js';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Smoothly scroll the window by `distance` px over `duration` ms (eased), so
 *  the autopilot reads like a human scanning the feed rather than jumping. */
const smoothScrollBy = (distance: number, duration = 850): Promise<void> =>
  new Promise((resolve) => {
    const startY = window.scrollY;
    const startedAt = performance.now();
    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
    const tick = (now: number): void => {
      const t = Math.min(1, (now - startedAt) / duration);
      window.scrollTo(0, startY + distance * easeOutCubic(t));
      if (t < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });

export const waitFor = async <E extends Element = Element>(
  selector: string,
  timeoutMs = 12_000,
  intervalMs = 250,
): Promise<E | null> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector<E>(selector);
    if (el) return el;
    await sleep(intervalMs);
  }
  return null;
};

const extractStatusId = (href: string): string | null => {
  const m = href.match(/\/status\/(\d+)/);
  return m?.[1] ?? null;
};

const absoluteUrl = (href: string): string => {
  try {
    return new URL(href, location.origin).toString();
  } catch {
    return href;
  }
};

export const collectPostsFromTimeline = (max = 20): ScannedPost[] => {
  const articles = Array.from(document.querySelectorAll<HTMLElement>(S.postArticle));
  const out: ScannedPost[] = [];
  const seen = new Set<string>();
  for (const article of articles) {
    if (out.length >= max) break;
    const time = article.querySelector<HTMLTimeElement>(S.timestamp);
    const link = time?.closest<HTMLAnchorElement>(S.permalink)
      ?? article.querySelector<HTMLAnchorElement>(S.permalink);
    if (!link) continue;
    const id = extractStatusId(link.getAttribute('href') ?? '');
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({
      postUrl: absoluteUrl(link.getAttribute('href') ?? ''),
      postId: id,
      publishedAt: time?.getAttribute('datetime') ?? null,
      authorHandle: parseAuthorHandleFromUrl(link.getAttribute('href') ?? ''),
    });
  }
  return out;
};

const parseAuthorHandleFromUrl = (href: string): string | null => {
  // /<handle>/status/<id>
  const m = href.match(/^\/([^/]+)\/status\//);
  return m?.[1] ?? null;
};

/** Like collectPostsFromTimeline, but also grabs the post text + author URL —
 *  used by the home-feed autopilot for relevance matching and follows. */
const collectHomePosts = (max: number): ScannedPost[] => {
  const articles = Array.from(document.querySelectorAll<HTMLElement>(S.postArticle));
  const out: ScannedPost[] = [];
  const seen = new Set<string>();
  for (const article of articles) {
    if (out.length >= max) break;
    const time = article.querySelector<HTMLTimeElement>(S.timestamp);
    const link =
      time?.closest<HTMLAnchorElement>(S.permalink) ??
      article.querySelector<HTMLAnchorElement>(S.permalink);
    if (!link) continue;
    const href = link.getAttribute('href') ?? '';
    const id = extractStatusId(href);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    const handle = parseAuthorHandleFromUrl(href);
    const text = article.querySelector<HTMLElement>(S.postText)?.textContent ?? '';
    out.push({
      postUrl: absoluteUrl(href),
      postId: id,
      publishedAt: time?.getAttribute('datetime') ?? null,
      authorHandle: handle,
      text: text.trim(),
      profileUrl: handle ? `https://x.com/${handle}` : null,
    });
  }
  return out;
};

/** Smoothly scroll the home timeline, collecting posts as we go. We do NOT
 *  jump back to the top afterwards — the feed is left where the scroll ended. */
export const scanHomeFeed = async (max = 25): Promise<ScannedPost[]> => {
  await waitFor(S.postArticle, 12_000);
  const collected = new Map<string, ScannedPost>();
  for (let i = 0; i < 8 && collected.size < max; i++) {
    for (const p of collectHomePosts(max)) collected.set(p.postId, p);
    await smoothScrollBy(700);
    await sleep(650);
  }
  // Final pass to catch whatever rendered after the last scroll.
  for (const p of collectHomePosts(max)) collected.set(p.postId, p);
  return Array.from(collected.values()).slice(0, max);
};

/** Smoothly scroll a profile to coax Twitter into rendering more tweets. */
export const scanProfile = async (max = 20): Promise<ScannedPost[]> => {
  // Wait for at least one article to render
  await waitFor(S.postArticle, 12_000);

  // Gentle smooth scroll to nudge the virtualized list into loading more.
  for (let i = 0; i < 3; i++) {
    await smoothScrollBy(900);
    await sleep(700);
  }

  return collectPostsFromTimeline(max);
};

const findLikeButtonOnPage = (): HTMLButtonElement | null => {
  // Prefer the testid that's on the focal article — first one on a status page
  // is usually the post itself (replies appear after).
  const article = document.querySelector<HTMLElement>(S.postArticle);
  if (article) {
    const btn = article.querySelector<HTMLButtonElement>(S.likeButton);
    if (btn) return btn;
    const ariaBtn = article.querySelector<HTMLButtonElement>(S.likeButtonAria);
    if (ariaBtn) return ariaBtn;
  }
  return document.querySelector<HTMLButtonElement>(S.likeButton);
};

const isCurrentlyLiked = (): boolean => {
  const article = document.querySelector<HTMLElement>(S.postArticle);
  return !!(article ?? document).querySelector(S.unlikeButton);
};

export const likeCurrentPost = async (): Promise<{
  liked: boolean;
  alreadyLiked: boolean;
  error?: string;
}> => {
  // Wait for the focal article
  const article = await waitFor<HTMLElement>(S.postArticle, 12_000);
  if (!article) return { liked: false, alreadyLiked: false, error: 'no article found' };

  if (isCurrentlyLiked()) {
    return { liked: false, alreadyLiked: true };
  }

  const btn = findLikeButtonOnPage();
  if (!btn) return { liked: false, alreadyLiked: false, error: 'like button not found' };

  // Bring the button into view and pause so the click is visible to the user.
  btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  await sleep(700);
  btn.click();
  // Confirm state flip
  for (let i = 0; i < 8; i++) {
    await sleep(250);
    if (isCurrentlyLiked()) return { liked: true, alreadyLiked: false };
  }
  return { liked: false, alreadyLiked: false, error: 'state did not flip to liked' };
};
