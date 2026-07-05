import type {
  User,
  ExtensionSettings,
  CountersState,
  ActionLogInput,
  XAccountPlan,
  PostLength,
} from '@casper/shared';
import type { QueuedTask, SchedulerState, TargetStateMap } from '../scheduler/types.js';

export const STORAGE_KEYS = {
  auth: 'casper.auth',
  settings: 'casper.settings',
  counters: 'casper.counters',
  queue: 'casper.queue',
  schedulerState: 'casper.schedulerState',
  actionLogBuffer: 'casper.actionLogBuffer',
  targetState: 'casper.targetState',
  likedPosts: 'casper.likedPosts',
  commentedPosts: 'casper.commentedPosts',
  draftedPosts: 'casper.draftedPosts',
  quotedPosts: 'casper.quotedPosts',
  followedHandles: 'casper.followedHandles',
  diagnostics: 'casper.diagnostics',
  pendingReset: 'casper.pendingReset',
  ownHandle: 'casper.ownHandle',
  scheduledPosts: 'casper.scheduledPosts',
} as const;

export interface StoredAuth {
  token: string;
  user: User;
  savedAt: string;
}

const detectTimezone = (): string => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
};

const DEFAULT_SETTINGS: ExtensionSettings = {
  // Paused on first run — the user must explicitly arm the engine (safety).
  isPaused: true,
  timezone: detectTimezone(),
  tone: 'friendly',
  // Replies are one short line (8–10 words) unless the user picks longer.
  commentLength: 1,
  // Auto-pause after an hour of activity to protect the account.
  sessionMinutes: 60,
  // Show the work happening (foreground tabs) by default.
  visibleMode: true,
  activeHours: { startHour: 9, endHour: 22 },
  accountAgeMonths: { twitter: null, linkedin: null },
  targetCreators: [],
  whitelist: [],
  caps: {
    twitter: {
      likesPerDay: 100,
      commentsPerDay: 30,
      followsPerDay: 50,
      bookmarksPerDay: 60,
      repostsPerDay: 30,
      quotesPerDay: 15,
    },
    // LinkedIn is inert (automation removed) but the type requires all platforms.
    linkedin: {
      likesPerDay: 60,
      commentsPerDay: 20,
      followsPerDay: 30,
      bookmarksPerDay: 30,
      repostsPerDay: 15,
      quotesPerDay: 10,
    },
  },
  homeFeed: {
    // Twitter/X only — LinkedIn automation was removed.
    enabled: false,
    platforms: ['twitter'],
    like: true,
    comment: false,
    follow: false,
    bookmark: false,
    repost: false,
    quote: false,
    keywords: [],
    excludeKeywords: [],
  },
  followBack: false,
  // Most accounts are free — default to the 280-char limit for scheduled posts.
  xAccountPlan: 'free',
  // Pro-only length target; harmless default for free accounts.
  postLength: 'short',
};

const DEFAULT_COUNTERS: CountersState = { twitter: null, linkedin: null };
const DEFAULT_SCHEDULER_STATE: SchedulerState = {
  nextEligibleAt: 0,
  lastFlushAt: 0,
  activeSince: null,
};

export const getAuth = async (): Promise<StoredAuth | null> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.auth);
  return (got[STORAGE_KEYS.auth] as StoredAuth | undefined) ?? null;
};

export const setAuth = async (auth: StoredAuth | null): Promise<void> => {
  if (auth === null) {
    await chrome.storage.local.remove(STORAGE_KEYS.auth);
    return;
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.auth]: auth });
};

export const getSettings = async (): Promise<ExtensionSettings> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.settings);
  const stored = got[STORAGE_KEYS.settings] as ExtensionSettings | undefined;
  if (!stored) return DEFAULT_SETTINGS;
  // Twitter/X only now — drop any LinkedIn entries a previous version persisted
  // so the scheduler never opens a LinkedIn tab for stale targets/home scans.
  const onlyTwitter = <T extends { platform: string }>(xs: T[] | undefined): T[] =>
    (xs ?? []).filter((x) => x.platform === 'twitter');
  // Fill in fields a previous version may not have written.
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    // Caps are code-managed (no UI editor), so always use the current defaults —
    // otherwise a previously-persisted value would pin old, lower limits.
    caps: DEFAULT_SETTINGS.caps,
    activeHours: { ...DEFAULT_SETTINGS.activeHours, ...stored.activeHours },
    accountAgeMonths: { ...DEFAULT_SETTINGS.accountAgeMonths, ...stored.accountAgeMonths },
    targetCreators: onlyTwitter(stored.targetCreators),
    whitelist: onlyTwitter(stored.whitelist),
    homeFeed: {
      ...DEFAULT_SETTINGS.homeFeed,
      ...stored.homeFeed,
      platforms: (stored.homeFeed?.platforms ?? DEFAULT_SETTINGS.homeFeed.platforms).filter(
        (p) => p === 'twitter',
      ),
    },
  };
};

export const setSettings = async (settings: ExtensionSettings): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.settings]: settings });
};

// -- counters ---------------------------------------------------------------
export const getCounters = async (): Promise<CountersState> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.counters);
  return (got[STORAGE_KEYS.counters] as CountersState | undefined) ?? DEFAULT_COUNTERS;
};

export const setCounters = async (counters: CountersState): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.counters]: counters });
};

// -- queue ------------------------------------------------------------------
export const getQueue = async (): Promise<QueuedTask[]> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.queue);
  return (got[STORAGE_KEYS.queue] as QueuedTask[] | undefined) ?? [];
};

export const setQueue = async (queue: QueuedTask[]): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.queue]: queue });
};

// -- scheduler state --------------------------------------------------------
export const getSchedulerState = async (): Promise<SchedulerState> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.schedulerState);
  return (
    (got[STORAGE_KEYS.schedulerState] as SchedulerState | undefined) ?? DEFAULT_SCHEDULER_STATE
  );
};

export const setSchedulerState = async (state: SchedulerState): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.schedulerState]: state });
};

// -- action log buffer ------------------------------------------------------
export const getActionLogBuffer = async (): Promise<ActionLogInput[]> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.actionLogBuffer);
  return (got[STORAGE_KEYS.actionLogBuffer] as ActionLogInput[] | undefined) ?? [];
};

export const setActionLogBuffer = async (buffer: ActionLogInput[]): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.actionLogBuffer]: buffer });
};

// -- target state -----------------------------------------------------------
export const getTargetState = async (): Promise<TargetStateMap> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.targetState);
  return (got[STORAGE_KEYS.targetState] as TargetStateMap | undefined) ?? {};
};

export const setTargetState = async (state: TargetStateMap): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.targetState]: state });
};

// -- liked posts dedupe (LRU-capped) ---------------------------------------
const LIKED_POSTS_MAX = 2000;

export interface LikedPostsMap {
  /** key = `${platform}:${postId}` → ms epoch */
  [key: string]: number;
}

export const getLikedPosts = async (): Promise<LikedPostsMap> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.likedPosts);
  return (got[STORAGE_KEYS.likedPosts] as LikedPostsMap | undefined) ?? {};
};

export const setLikedPosts = async (map: LikedPostsMap): Promise<void> => {
  const keys = Object.keys(map);
  if (keys.length > LIKED_POSTS_MAX) {
    // Drop the oldest entries
    const sorted = keys.sort((a, b) => (map[a] ?? 0) - (map[b] ?? 0));
    const toDrop = sorted.slice(0, keys.length - LIKED_POSTS_MAX);
    for (const k of toDrop) delete map[k];
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.likedPosts]: map });
};

export const markLiked = async (platform: string, postId: string): Promise<void> => {
  const map = await getLikedPosts();
  map[`${platform}:${postId}`] = Date.now();
  await setLikedPosts(map);
};

export const isAlreadyLiked = async (platform: string, postId: string): Promise<boolean> => {
  const map = await getLikedPosts();
  return `${platform}:${postId}` in map;
};

// -- commented posts dedupe (same shape as liked) ---------------------------
export const getCommentedPosts = async (): Promise<LikedPostsMap> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.commentedPosts);
  return (got[STORAGE_KEYS.commentedPosts] as LikedPostsMap | undefined) ?? {};
};

export const setCommentedPosts = async (map: LikedPostsMap): Promise<void> => {
  const keys = Object.keys(map);
  if (keys.length > LIKED_POSTS_MAX) {
    const sorted = keys.sort((a, b) => (map[a] ?? 0) - (map[b] ?? 0));
    const toDrop = sorted.slice(0, keys.length - LIKED_POSTS_MAX);
    for (const k of toDrop) delete map[k];
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.commentedPosts]: map });
};

export const markCommented = async (platform: string, postId: string): Promise<void> => {
  const map = await getCommentedPosts();
  map[`${platform}:${postId}`] = Date.now();
  await setCommentedPosts(map);
};

export const isAlreadyCommented = async (
  platform: string,
  postId: string,
): Promise<boolean> => {
  const map = await getCommentedPosts();
  return `${platform}:${postId}` in map;
};

// -- drafted posts dedupe (home-feed auto-draft; avoids re-generating) ------
export const getDraftedPosts = async (): Promise<LikedPostsMap> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.draftedPosts);
  return (got[STORAGE_KEYS.draftedPosts] as LikedPostsMap | undefined) ?? {};
};

export const setDraftedPosts = async (map: LikedPostsMap): Promise<void> => {
  const keys = Object.keys(map);
  if (keys.length > LIKED_POSTS_MAX) {
    const sorted = keys.sort((a, b) => (map[a] ?? 0) - (map[b] ?? 0));
    const toDrop = sorted.slice(0, keys.length - LIKED_POSTS_MAX);
    for (const k of toDrop) delete map[k];
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.draftedPosts]: map });
};

export const markDrafted = async (platform: string, postId: string): Promise<void> => {
  const map = await getDraftedPosts();
  map[`${platform}:${postId}`] = Date.now();
  await setDraftedPosts(map);
};

export const isAlreadyDrafted = async (platform: string, postId: string): Promise<boolean> => {
  const map = await getDraftedPosts();
  return `${platform}:${postId}` in map;
};

// -- quoted posts dedupe (quote-tweets can't be detected from the DOM) --------
export const getQuotedPosts = async (): Promise<LikedPostsMap> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.quotedPosts);
  return (got[STORAGE_KEYS.quotedPosts] as LikedPostsMap | undefined) ?? {};
};

export const setQuotedPosts = async (map: LikedPostsMap): Promise<void> => {
  const keys = Object.keys(map);
  if (keys.length > LIKED_POSTS_MAX) {
    const sorted = keys.sort((a, b) => (map[a] ?? 0) - (map[b] ?? 0));
    const toDrop = sorted.slice(0, keys.length - LIKED_POSTS_MAX);
    for (const k of toDrop) delete map[k];
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.quotedPosts]: map });
};

export const markQuoted = async (platform: string, postId: string): Promise<void> => {
  const map = await getQuotedPosts();
  map[`${platform}:${postId}`] = Date.now();
  await setQuotedPosts(map);
};

export const isAlreadyQuoted = async (platform: string, postId: string): Promise<boolean> => {
  const map = await getQuotedPosts();
  return `${platform}:${postId}` in map;
};

// -- followed handles dedupe (same LRU shape as liked) ----------------------
export const getFollowedHandles = async (): Promise<LikedPostsMap> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.followedHandles);
  return (got[STORAGE_KEYS.followedHandles] as LikedPostsMap | undefined) ?? {};
};

export const setFollowedHandles = async (map: LikedPostsMap): Promise<void> => {
  const keys = Object.keys(map);
  if (keys.length > LIKED_POSTS_MAX) {
    const sorted = keys.sort((a, b) => (map[a] ?? 0) - (map[b] ?? 0));
    const toDrop = sorted.slice(0, keys.length - LIKED_POSTS_MAX);
    for (const k of toDrop) delete map[k];
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.followedHandles]: map });
};

const handleKey = (platform: string, handle: string): string =>
  `${platform}:${handle.replace(/^@/, '').toLowerCase()}`;

export const markFollowed = async (platform: string, handle: string): Promise<void> => {
  const map = await getFollowedHandles();
  map[handleKey(platform, handle)] = Date.now();
  await setFollowedHandles(map);
};

export const isAlreadyFollowed = async (
  platform: string,
  handle: string,
): Promise<boolean> => {
  const map = await getFollowedHandles();
  return handleKey(platform, handle) in map;
};

// -- diagnostics ring buffer (selector misses, network errors) -------------
export type DiagnosticKind =
  | 'selector_miss'
  | 'tab_load_timeout'
  | 'network_error'
  | 'auth_failure'
  | 'rate_limited'
  | 'auto_pause';

export interface DiagnosticEntry {
  at: string; // ISO timestamp
  kind: DiagnosticKind;
  context: string; // human label
  detail?: string;
}

const DIAG_MAX = 100;

export const getDiagnostics = async (): Promise<DiagnosticEntry[]> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.diagnostics);
  return (got[STORAGE_KEYS.diagnostics] as DiagnosticEntry[] | undefined) ?? [];
};

export const appendDiagnostic = async (entry: Omit<DiagnosticEntry, 'at'>): Promise<void> => {
  const list = await getDiagnostics();
  list.unshift({ ...entry, at: new Date().toISOString() });
  if (list.length > DIAG_MAX) list.length = DIAG_MAX;
  await chrome.storage.local.set({ [STORAGE_KEYS.diagnostics]: list });
};

export const clearDiagnostics = async (): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.diagnostics]: [] });
};

// -- pending password reset -------------------------------------------------
// A browser-action popup closes the instant it loses focus (e.g. when the user
// switches to their email to copy the OTP), which destroys the React state. We
// persist the in-progress reset here so reopening the popup resumes at the code
// entry step instead of dropping back to sign-in.
export interface PendingReset {
  email: string;
  expiresAt: number; // ms epoch — mirrors the server's code TTL
}

export const getPendingReset = async (): Promise<PendingReset | null> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.pendingReset);
  const p = got[STORAGE_KEYS.pendingReset] as PendingReset | undefined;
  if (!p) return null;
  if (Date.now() >= p.expiresAt) {
    await chrome.storage.local.remove(STORAGE_KEYS.pendingReset);
    return null;
  }
  return p;
};

export const setPendingReset = async (email: string, ttlMinutes = 15): Promise<void> => {
  const entry: PendingReset = { email, expiresAt: Date.now() + ttlMinutes * 60_000 };
  await chrome.storage.local.set({ [STORAGE_KEYS.pendingReset]: entry });
};

export const clearPendingReset = async (): Promise<void> => {
  await chrome.storage.local.remove(STORAGE_KEYS.pendingReset);
};

// -- scheduled posts (create + schedule original tweets) --------------------
/** The most posts a user may have queued (status 'scheduled') at once. */
export const MAX_SCHEDULED_POSTS = 5;

/** X's per-post character limit for standard (non-Premium / 'free') accounts. */
export const TWEET_CHAR_LIMIT = 280;

/** Character-limit target for each Pro post length (X Premium allows long-form). */
export const PRO_LENGTH_LIMITS: Record<PostLength, number> = {
  short: 280,
  mid: 1_000,
  long: 4_000,
};

/**
 * Character limit for a scheduled post. Free is always 280; Pro uses the chosen
 * length target (short / mid / long).
 */
export const tweetLimitFor = (plan: XAccountPlan, length: PostLength): number =>
  plan === 'pro' ? PRO_LENGTH_LIMITS[length] : TWEET_CHAR_LIMIT;
/**
 * X counts every link as 23 chars (t.co), no matter its real length, and the
 * publisher joins the link to the body with "\n\n" (2 chars) — so an attached
 * link costs 25 characters against the limit regardless of the URL typed.
 */
const LINK_CHAR_COST = 25;

/**
 * Characters a post will actually consume on X = the text plus the link
 * overhead (when a link is attached). This is what the 280-char limit must be
 * checked against — not the text length alone.
 */
export const effectivePostLength = (text: string, link: string): number =>
  text.length + (link.trim() ? LINK_CHAR_COST : 0);
/** Keep total history bounded (drop oldest posted/failed beyond this). */
const SCHEDULED_POSTS_MAX_TOTAL = 25;

export type ScheduledPostStatus = 'scheduled' | 'publishing' | 'posted' | 'failed';

export interface ScheduledPost {
  id: string;
  /** The tweet body (AI-drafted, then user-editable). */
  text: string;
  /** Optional link appended to the tweet so X unfurls it into a card. */
  link: string;
  /** Optional image as a data URL — stored locally, attached at post time. */
  imageDataUrl: string | null;
  /** ms epoch for the START of the day the post should publish on. It becomes due
   *  at this instant and fires on or after it — the next time the extension runs
   *  (so a post whose day was missed goes out the next time the browser opens). */
  scheduledAt: number;
  status: ScheduledPostStatus;
  createdAt: number;
  postedAt?: number;
  /** Failure reason, when status === 'failed'. */
  error?: string;
}

export const getScheduledPosts = async (): Promise<ScheduledPost[]> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.scheduledPosts);
  return (got[STORAGE_KEYS.scheduledPosts] as ScheduledPost[] | undefined) ?? [];
};

export const setScheduledPosts = async (posts: ScheduledPost[]): Promise<void> => {
  // Keep the list bounded: never drop still-pending posts, only trim the oldest
  // finished (posted/failed) history beyond the cap.
  let next = posts;
  if (next.length > SCHEDULED_POSTS_MAX_TOTAL) {
    const pending = next.filter((p) => p.status === 'scheduled' || p.status === 'publishing');
    const finished = next
      .filter((p) => p.status === 'posted' || p.status === 'failed')
      .sort((a, b) => (b.postedAt ?? b.createdAt) - (a.postedAt ?? a.createdAt))
      .slice(0, Math.max(0, SCHEDULED_POSTS_MAX_TOTAL - pending.length));
    next = [...pending, ...finished];
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.scheduledPosts]: next });
};

// -- cached own X handle (for auto follow-back) ------------------------------
export const getOwnHandle = async (): Promise<string | null> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.ownHandle);
  return (got[STORAGE_KEYS.ownHandle] as string | undefined) ?? null;
};

export const setOwnHandle = async (handle: string): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.ownHandle]: handle });
};
