import { driveTab } from '../platforms/common/tab-driver.js';
import type { ScannedProfile } from '../platforms/common/content-messages.js';
import { getOwnHandle, setOwnHandle, STORAGE_KEYS } from '../lib/storage.js';
import { extractTopics, rankTargets, type ProposedTarget } from '../lib/topics.js';

/**
 * Setup step 1 — read the signed-in X account and propose what to work on.
 *
 * Everything here is read off the user's own account: their bio, their last
 * thirty posts, the accounts they already follow. Nothing is invented, and
 * nothing is a template. If a number can't be read it comes back null and the
 * UI says so, because the whole point of showing this screen is that the user
 * can check it against what they know about themselves.
 *
 * It is slow — a dozen tab visits, most of a minute — so progress is written to
 * storage as it goes and the panel watches it. The result is persisted too:
 * closing the panel mid-read must not mean starting over.
 */

/** Posts to read. The voice trainer uses its own limit; this is for topics. */
const MAX_POSTS = 30;
/** How deep to read the Following list before ranking it. */
const MAX_FOLLOWING = 60;
/** How many proposals to make. The plan's number, and about a screenful. */
const MAX_TARGETS = 10;

export interface SetupProgress {
  phase: 'profile' | 'posts' | 'following' | 'targets' | 'done' | 'failed';
  /** Human-readable, present tense — the panel renders this verbatim. */
  label: string;
  done: number;
  total: number;
}

export interface SetupRead {
  handle: string;
  bio: string | null;
  followers: number | null;
  postsRead: number;
  topics: string[];
  targets: ProposedTarget[];
  readAt: string;
}

const setProgress = async (progress: SetupProgress): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.setupProgress]: progress });
};

export const getSetupRead = async (): Promise<SetupRead | null> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.setupRead);
  return (got[STORAGE_KEYS.setupRead] as SetupRead | undefined) ?? null;
};

const profileUrl = (handle: string): string => `https://x.com/${encodeURIComponent(handle)}`;

/** The signed-in handle, from cache or by asking the page once. */
const resolveOwnHandle = async (): Promise<string | null> => {
  const cached = await getOwnHandle();
  if (cached) return cached;
  const detect = await driveTab(
    'https://x.com/home',
    { type: 'GET_OWN_HANDLE', payload: {} },
    { settleMs: 3_000, forceBackground: true },
  );
  if (detect.type === 'OWN_HANDLE_RESULT' && detect.payload.handle) {
    await setOwnHandle(detect.payload.handle);
    return detect.payload.handle;
  }
  return null;
};

export const readAccountForSetup = async (): Promise<
  { ok: true; data: SetupRead } | { ok: false; error: { code: string; message: string } }
> => {
  const fail = async (code: string, message: string) => {
    await setProgress({ phase: 'failed', label: message, done: 0, total: 0 });
    return { ok: false as const, error: { code, message } };
  };

  await setProgress({ phase: 'profile', label: 'Looking for your account', done: 0, total: 4 });

  let handle: string | null;
  try {
    handle = await resolveOwnHandle();
  } catch (err) {
    return await fail('read_failed', err instanceof Error ? err.message : 'Could not open x.com');
  }
  if (!handle) {
    return await fail(
      'signed_out',
      'I could not find your X account. Open x.com, sign in, and try again.',
    );
  }

  // --- the profile header: bio and follower count --------------------------
  await setProgress({ phase: 'profile', label: `Reading @${handle}`, done: 1, total: 4 });
  let bio: string | null = null;
  let followers: number | null = null;
  try {
    const resp = await driveTab(
      profileUrl(handle),
      { type: 'READ_PROFILE_STATS', payload: {} },
      { settleMs: 3_500, forceBackground: true },
    );
    if (resp.type === 'PROFILE_STATS_RESULT' && resp.payload.stats) {
      bio = resp.payload.stats.bio ?? null;
      followers = resp.payload.stats.followers;
    }
  } catch {
    // A profile that won't render its header is not fatal — topics come from
    // the posts, which are read separately below.
  }

  // --- the last thirty posts: what they write about ------------------------
  await setProgress({ phase: 'posts', label: 'Reading what you post about', done: 2, total: 4 });
  let posts: string[] = [];
  try {
    const resp = await driveTab(
      profileUrl(handle),
      { type: 'COLLECT_OWN_POSTS', payload: { handle, max: MAX_POSTS } },
      { settleMs: 3_500, forceBackground: true },
    );
    if (resp.type === 'OWN_POSTS_RESULT') {
      posts = resp.payload.outcomes.map((o) => o.text.trim()).filter((t) => t.length > 0);
    }
  } catch (err) {
    return await fail('read_failed', err instanceof Error ? err.message : 'Could not read posts');
  }

  // The bio is one more sample of how they describe themselves, and on a quiet
  // account it may be the only one.
  const topics = extractTopics(bio ? [...posts, bio, bio] : posts);

  // --- who they already follow ---------------------------------------------
  await setProgress({
    phase: 'following',
    label: 'Looking at who you follow',
    done: 3,
    total: 4,
  });
  let following: ScannedProfile[] = [];
  try {
    const resp = await driveTab(
      `${profileUrl(handle)}/following`,
      { type: 'SCAN_FOLLOWING', payload: { max: MAX_FOLLOWING } },
      { settleMs: 3_500, forceBackground: true },
    );
    if (resp.type === 'FOLLOWING_RESULT') following = resp.payload.profiles;
  } catch {
    // A private or empty following list just means no proposals to make.
  }

  const targets = rankTargets(following, topics, MAX_TARGETS);

  // --- follower counts, one profile at a time ------------------------------
  // X does not put follower counts on the Following list, so the only honest
  // way to show one is to go and look. Bounded to the ten being proposed, and
  // failures leave the count null rather than guessing.
  for (const [i, target] of targets.entries()) {
    await setProgress({
      phase: 'targets',
      label: `Checking @${target.handle}`,
      done: i,
      total: targets.length,
    });
    try {
      const resp = await driveTab(
        profileUrl(target.handle),
        { type: 'READ_PROFILE_STATS', payload: {} },
        { settleMs: 2_500, forceBackground: true },
      );
      if (resp.type === 'PROFILE_STATS_RESULT' && resp.payload.stats) {
        target.followers = resp.payload.stats.followers;
      }
    } catch {
      /* leave it null — the card says "follower count unavailable" */
    }
  }

  const data: SetupRead = {
    handle,
    bio,
    followers,
    postsRead: posts.length,
    topics,
    targets,
    readAt: new Date().toISOString(),
  };
  await chrome.storage.local.set({ [STORAGE_KEYS.setupRead]: data });
  await setProgress({ phase: 'done', label: 'Ready', done: 4, total: 4 });
  return { ok: true, data };
};
