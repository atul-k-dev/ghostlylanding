import { TWITTER_SELECTORS as S } from './selectors.js';
import { waitFor } from './dom.js';
import type { ScannedFollower } from '../common/content-messages.js';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const cleanHandleFromHref = (href: string): string | null => {
  // /<handle> — drop sub-paths
  const m = href.match(/^\/([A-Za-z0-9_]{1,15})(?:[/?#].*)?$/);
  return m?.[1] ?? null;
};

export const scanFollowers = async (max = 20): Promise<ScannedFollower[]> => {
  await waitFor(S.userCell, 15_000);

  for (let i = 0; i < 3; i++) {
    window.scrollBy({ top: 1400, behavior: 'instant' as ScrollBehavior });
    await sleep(900);
  }
  window.scrollTo({ top: 0 });
  await sleep(300);

  const cells = Array.from(document.querySelectorAll<HTMLElement>(S.userCell));
  const out: ScannedFollower[] = [];
  const seen = new Set<string>();
  for (const cell of cells) {
    if (out.length >= max) break;
    const link = cell.querySelector<HTMLAnchorElement>('a[role="link"][href^="/"]');
    const href = link?.getAttribute('href') ?? '';
    const handle = cleanHandleFromHref(href);
    if (!handle || seen.has(handle.toLowerCase())) continue;
    // Skip if there's an unfollow button in this cell (already following)
    if (cell.querySelector(S.unfollowButton)) continue;
    seen.add(handle.toLowerCase());
    out.push({
      handle,
      profileUrl: new URL(href, location.origin).toString(),
    });
  }
  return out;
};

const findFollowButton = (root: ParentNode = document): HTMLButtonElement | null => {
  // Prefer testid match on the focal profile header.
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>(S.followButton));
  // Filter out '-unfollow' suffix that also matches '$="-follow"' via greedy match guard
  const real = buttons.filter((b) => {
    const id = b.getAttribute('data-testid') ?? '';
    return id.endsWith('-follow') || id === 'follow';
  });
  if (real.length > 0) return real[0] ?? null;
  return root.querySelector<HTMLButtonElement>(S.followButtonAria);
};

const isCurrentlyFollowing = (root: ParentNode = document): boolean => {
  return !!root.querySelector(S.unfollowButton);
};

export const followCurrentProfile = async (): Promise<{
  followed: boolean;
  alreadyFollowing: boolean;
  error?: string;
}> => {
  // Wait for the profile primary column to render at least one follow/unfollow button.
  const start = Date.now();
  while (Date.now() - start < 15_000) {
    if (isCurrentlyFollowing()) return { followed: false, alreadyFollowing: true };
    if (findFollowButton()) break;
    await sleep(300);
  }

  if (isCurrentlyFollowing()) return { followed: false, alreadyFollowing: true };

  const btn = findFollowButton();
  if (!btn) return { followed: false, alreadyFollowing: false, error: 'follow button not found' };

  btn.click();

  for (let i = 0; i < 14; i++) {
    await sleep(350);
    if (isCurrentlyFollowing()) return { followed: true, alreadyFollowing: false };
  }
  return { followed: false, alreadyFollowing: false, error: 'state did not flip to following' };
};
