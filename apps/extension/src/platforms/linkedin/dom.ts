/**
 * LinkedIn DOM operations (content script).
 * LinkedIn doesn't expose absolute timestamps in the DOM consistently — many
 * posts carry only relative times like "3h". We parse those when present and
 * fall back to letting the freshness gate skip the post if we can't tell.
 */
import { LINKEDIN_SELECTORS as S } from './selectors.js';
import type { ScannedPost } from '../common/content-messages.js';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

export const waitFor = async <E extends Element = Element>(
  selector: string,
  timeoutMs = 15_000,
  intervalMs = 300,
): Promise<E | null> => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector<E>(selector);
    if (el) return el;
    await sleep(intervalMs);
  }
  return null;
};

const extractActivityId = (urn: string | null): string | null => {
  if (!urn) return null;
  const m = urn.match(/urn:li:activity:(\d+)/);
  return m?.[1] ?? null;
};

const absoluteUrl = (href: string): string => {
  try {
    return new URL(href, location.origin).toString();
  } catch {
    return href;
  }
};

const parseRelativeTimeToISO = (text: string): string | null => {
  // "3h", "2 hours ago", "1d", "5 days ago" — LinkedIn locales vary
  const t = text.trim().toLowerCase();
  const m = t.match(/(\d+)\s*(m|min|minute|h|hr|hour|d|day|w|week|mo|month|y|year)/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2] ?? '';
  let ms = 0;
  if (unit.startsWith('m') && !unit.startsWith('mo')) ms = n * 60_000;
  else if (unit.startsWith('h')) ms = n * 3_600_000;
  else if (unit.startsWith('d')) ms = n * 86_400_000;
  else if (unit.startsWith('w')) ms = n * 7 * 86_400_000;
  else if (unit.startsWith('mo')) ms = n * 30 * 86_400_000;
  else if (unit.startsWith('y')) ms = n * 365 * 86_400_000;
  else return null;
  return new Date(Date.now() - ms).toISOString();
};

export const collectPostsFromFeed = (max = 15): ScannedPost[] => {
  const articles = Array.from(document.querySelectorAll<HTMLElement>(S.postArticle));
  const out: ScannedPost[] = [];
  const seen = new Set<string>();
  for (const article of articles) {
    if (out.length >= max) break;
    const id = extractActivityId(article.getAttribute('data-urn'));
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const link = article.querySelector<HTMLAnchorElement>(S.permalink);
    const href = link?.getAttribute('href') ?? `/feed/update/urn:li:activity:${id}/`;

    let publishedAt: string | null = null;
    const timeEl = article.querySelector<HTMLElement>(S.timeRelative);
    const datetimeAttr = timeEl?.getAttribute('datetime');
    if (datetimeAttr) publishedAt = datetimeAttr;
    else if (timeEl?.textContent) publishedAt = parseRelativeTimeToISO(timeEl.textContent);

    out.push({
      postUrl: absoluteUrl(href),
      postId: id,
      publishedAt,
      authorHandle: null,
    });
  }
  return out;
};

const parseInHandle = (href: string): string | null => {
  const m = href.match(/\/in\/([^/?#]+)/);
  return m?.[1] ?? null;
};

/** Collect feed posts with body text + author profile URL for the home autopilot. */
const collectHomePosts = (max: number): ScannedPost[] => {
  const articles = Array.from(document.querySelectorAll<HTMLElement>(S.postArticle));
  const out: ScannedPost[] = [];
  const seen = new Set<string>();
  for (const article of articles) {
    if (out.length >= max) break;
    const id = extractActivityId(article.getAttribute('data-urn'));
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const link = article.querySelector<HTMLAnchorElement>(S.permalink);
    const href = link?.getAttribute('href') ?? `/feed/update/urn:li:activity:${id}/`;

    let publishedAt: string | null = null;
    const timeEl = article.querySelector<HTMLElement>(S.timeRelative);
    const datetimeAttr = timeEl?.getAttribute('datetime');
    if (datetimeAttr) publishedAt = datetimeAttr;
    else if (timeEl?.textContent) publishedAt = parseRelativeTimeToISO(timeEl.textContent);

    const text = article.querySelector<HTMLElement>(S.postBody)?.textContent ?? '';
    const actorLink = article.querySelector<HTMLAnchorElement>('a[href*="/in/"]');
    const actorHref = actorLink?.getAttribute('href') ?? '';
    const handle = parseInHandle(actorHref);

    out.push({
      postUrl: absoluteUrl(href),
      postId: id,
      publishedAt,
      authorHandle: handle,
      text: text.trim(),
      profileUrl: handle ? `https://www.linkedin.com/in/${handle}/` : null,
    });
  }
  return out;
};

/** Scroll the LinkedIn home feed to load posts, then collect with text. */
export const scanHomeFeed = async (max = 20): Promise<ScannedPost[]> => {
  await waitFor(S.postArticle, 15_000);
  const collected = new Map<string, ScannedPost>();
  for (let i = 0; i < 5 && collected.size < max; i++) {
    for (const p of collectHomePosts(max)) collected.set(p.postId, p);
    window.scrollBy({ top: 2200, behavior: 'instant' as ScrollBehavior });
    await sleep(1200);
  }
  window.scrollTo({ top: 0 });
  await sleep(300);
  return Array.from(collected.values()).slice(0, max);
};

export const scanProfile = async (max = 15): Promise<ScannedPost[]> => {
  await waitFor(S.postArticle, 15_000);
  for (let i = 0; i < 2; i++) {
    window.scrollBy({ top: 1500, behavior: 'instant' as ScrollBehavior });
    await sleep(1_000);
  }
  window.scrollTo({ top: 0 });
  await sleep(400);
  return collectPostsFromFeed(max);
};

const findReactButton = (root: ParentNode = document): HTMLButtonElement | null => {
  const btns = Array.from(root.querySelectorAll<HTMLButtonElement>(S.reactButton));
  // Prefer one that isn't already pressed
  return btns.find((b) => b.getAttribute(S.reactButtonPressedAttr) !== 'true') ?? btns[0] ?? null;
};

const isCurrentlyLiked = (root: ParentNode = document): boolean => {
  const btn = root.querySelector<HTMLButtonElement>(S.reactButton);
  return btn?.getAttribute(S.reactButtonPressedAttr) === 'true';
};

export const likeCurrentPost = async (): Promise<{
  liked: boolean;
  alreadyLiked: boolean;
  error?: string;
}> => {
  const article = await waitFor<HTMLElement>(S.postArticle, 15_000);
  const root: ParentNode = article ?? document;

  if (isCurrentlyLiked(root)) return { liked: false, alreadyLiked: true };

  const btn = findReactButton(root);
  if (!btn) return { liked: false, alreadyLiked: false, error: 'react button not found' };

  btn.click();
  for (let i = 0; i < 10; i++) {
    await sleep(300);
    if (isCurrentlyLiked(root)) return { liked: true, alreadyLiked: false };
  }
  return { liked: false, alreadyLiked: false, error: 'state did not flip to liked' };
};
