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

/** Scroll a bit to coax Twitter into rendering more tweets, then collect. */
export const scanProfile = async (max = 20): Promise<ScannedPost[]> => {
  // Wait for at least one article to render
  await waitFor(S.postArticle, 12_000);

  // Light scroll to nudge virtualized list
  for (let i = 0; i < 2; i++) {
    window.scrollBy({ top: 1200, behavior: 'instant' as ScrollBehavior });
    await sleep(900);
  }
  window.scrollTo({ top: 0 });
  await sleep(400);

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

  btn.click();
  // Confirm state flip
  for (let i = 0; i < 8; i++) {
    await sleep(250);
    if (isCurrentlyLiked()) return { liked: true, alreadyLiked: false };
  }
  return { liked: false, alreadyLiked: false, error: 'state did not flip to liked' };
};
