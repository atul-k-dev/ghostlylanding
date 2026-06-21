import { TWITTER_SELECTORS as S } from './selectors.js';
import { waitFor } from './dom.js';
import type { ScannedFollower } from '../common/content-messages.js';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const cleanHandleFromHref = (href: string): string | null => {
  // /<handle> — drop sub-paths
  const m = href.match(/^\/([A-Za-z0-9_]{1,15})(?:[/?#].*)?$/);
  return m?.[1] ?? null;
};

/** The logged-in user's own @handle, read from the left-nav profile link (or the
 *  account-switcher button as a fallback). Null if not signed in / not found. */
export const getOwnHandle = (): string | null => {
  const link = document.querySelector<HTMLAnchorElement>('a[data-testid="AppTabBar_Profile_Link"]');
  const fromLink = (link?.getAttribute('href') ?? '').match(/^\/([A-Za-z0-9_]{1,15})$/);
  if (fromLink?.[1]) return fromLink[1];
  const acct = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
  const fromAcct = (acct?.textContent ?? '').match(/@([A-Za-z0-9_]{1,15})/);
  return fromAcct?.[1] ?? null;
};

/** Stop promptly when the user toggles the Active pill off mid-run. */
const isPaused = async (): Promise<boolean> => {
  try {
    const got = await chrome.storage.local.get('casper.settings');
    return (got['casper.settings'] as { isPaused?: boolean } | undefined)?.isPaused === true;
  } catch {
    return false;
  }
};

/**
 * On the user's own followers page, follow back people who aren't already
 * followed (their cell shows a "Follow" button rather than "Following"). Records
 * each follow live via RECORD_ACTION so the dashboard + caps stay in sync.
 */
export const followBackInList = async (
  max: number,
  minDelayMs: number,
  maxDelayMs: number,
  skipHandles: string[] = [],
): Promise<{ handle: string; profileUrl: string }[]> => {
  await waitFor(S.userCell, 15_000);
  const skip = new Set(skipHandles.map((h) => h.toLowerCase()));
  const done: { handle: string; profileUrl: string }[] = [];
  const seen = new Set<string>();
  for (let pass = 0; pass < 14 && done.length < max; pass++) {
    if (await isPaused()) break;
    const cells = Array.from(document.querySelectorAll<HTMLElement>(S.userCell));
    for (const cell of cells) {
      if (done.length >= max) break;
      const link = cell.querySelector<HTMLAnchorElement>('a[role="link"][href^="/"]');
      const href = link?.getAttribute('href') ?? '';
      const handle = cleanHandleFromHref(href);
      if (!handle || seen.has(handle.toLowerCase())) continue;
      seen.add(handle.toLowerCase());
      if (skip.has(handle.toLowerCase())) continue;
      // Already following → nothing to follow back.
      if (cell.querySelector(S.unfollowButton)) continue;
      const followBtn = Array.from(cell.querySelectorAll<HTMLButtonElement>(S.followButton)).find(
        (b) => {
          const id = b.getAttribute('data-testid') ?? '';
          return id.endsWith('-follow') || id === 'follow';
        },
      );
      if (!followBtn) continue;
      followBtn.scrollIntoView({ behavior: 'auto', block: 'center' });
      await sleep(400);
      followBtn.click();
      let ok = false;
      for (let i = 0; i < 10; i++) {
        await sleep(250);
        if (cell.querySelector(S.unfollowButton)) {
          ok = true;
          break;
        }
      }
      if (!ok) continue;
      let profileUrl = `https://x.com/${handle}`;
      try {
        profileUrl = new URL(href, location.origin).toString();
      } catch {
        /* keep fallback */
      }
      done.push({ handle, profileUrl });
      try {
        await chrome.runtime.sendMessage({
          type: 'RECORD_ACTION',
          payload: { platform: 'twitter', actionType: 'follow', handle, profileUrl },
        });
      } catch {
        /* background unreachable */
      }
      await sleep(randomInt(minDelayMs, maxDelayMs));
    }
    window.scrollBy({ top: 1400, behavior: 'instant' as ScrollBehavior });
    await sleep(900);
  }
  return done;
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
