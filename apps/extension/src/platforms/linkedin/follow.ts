import { LINKEDIN_SELECTORS as S } from './selectors.js';
import { waitFor } from './dom.js';
import type { ScannedFollower } from '../common/content-messages.js';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

const handleFromLinkedInPath = (href: string): string | null => {
  const m = href.match(/\/in\/([^/?#]+)/);
  return m?.[1] ?? null;
};

export const scanFollowers = async (max = 15): Promise<ScannedFollower[]> => {
  // LinkedIn doesn't expose a true public "followers" list. We scrape profile
  // cards visible on the creator's profile page — these are "people you may
  // know" / "more profiles for you" surfaces that LinkedIn injects.
  await waitFor(S.followersListItem, 15_000);

  for (let i = 0; i < 3; i++) {
    window.scrollBy({ top: 1500, behavior: 'instant' as ScrollBehavior });
    await sleep(1_100);
  }
  window.scrollTo({ top: 0 });
  await sleep(300);

  const items = Array.from(document.querySelectorAll<HTMLElement>(S.followersListItem));
  const out: ScannedFollower[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (out.length >= max) break;
    const link = item.querySelector<HTMLAnchorElement>(S.followersListLink);
    const href = link?.getAttribute('href') ?? '';
    const handle = handleFromLinkedInPath(href);
    if (!handle || seen.has(handle.toLowerCase())) continue;
    // Skip if there's already a "Following"/"Pending" state in the card
    if (item.querySelector(S.followingButton)) continue;
    seen.add(handle.toLowerCase());
    out.push({
      handle,
      profileUrl: new URL(href, location.origin).toString(),
    });
  }
  return out;
};

const isCurrentlyFollowing = (root: ParentNode = document): boolean => {
  return !!root.querySelector(S.followingButton);
};

const findFollowOrConnect = (
  root: ParentNode = document,
): HTMLButtonElement | null => {
  return (
    root.querySelector<HTMLButtonElement>(S.followButton) ??
    root.querySelector<HTMLButtonElement>(S.connectButton)
  );
};

export const followCurrentProfile = async (): Promise<{
  followed: boolean;
  alreadyFollowing: boolean;
  error?: string;
}> => {
  const start = Date.now();
  while (Date.now() - start < 15_000) {
    if (isCurrentlyFollowing()) return { followed: false, alreadyFollowing: true };
    if (findFollowOrConnect()) break;
    await sleep(350);
  }

  if (isCurrentlyFollowing()) return { followed: false, alreadyFollowing: true };

  const btn = findFollowOrConnect();
  if (!btn) {
    return { followed: false, alreadyFollowing: false, error: 'follow/connect button not found' };
  }

  btn.click();

  // LinkedIn sometimes opens a "Send invite?" modal — try to dismiss / send
  await sleep(700);
  const sendBtn = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Send now" i], button[aria-label="Send invitation" i], button[aria-label="Send" i]',
  );
  if (sendBtn) {
    try {
      sendBtn.click();
    } catch {
      /* ignore */
    }
  }

  for (let i = 0; i < 16; i++) {
    await sleep(400);
    if (isCurrentlyFollowing()) return { followed: true, alreadyFollowing: false };
  }
  // Pending invitation is the success case on LinkedIn — treat as followed
  const pending = document.querySelector('button[aria-label^="Pending" i]');
  if (pending) return { followed: true, alreadyFollowing: false };
  return { followed: false, alreadyFollowing: false, error: 'state did not flip to following' };
};
