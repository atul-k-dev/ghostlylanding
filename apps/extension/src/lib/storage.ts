import type {
  User,
  ExtensionSettings,
  CountersState,
  ActionLogInput,
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
  followedHandles: 'casper.followedHandles',
  diagnostics: 'casper.diagnostics',
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
  isPaused: false,
  timezone: detectTimezone(),
  tone: 'friendly',
  activeHours: { startHour: 9, endHour: 22 },
  accountAgeMonths: { twitter: null, linkedin: null },
  targetCreators: [],
  whitelist: [],
  caps: {
    twitter: { likesPerDay: 80, commentsPerDay: 20, followsPerDay: 30 },
    linkedin: { likesPerDay: 50, commentsPerDay: 15, followsPerDay: 15 },
  },
  homeFeed: {
    enabled: false,
    platforms: ['twitter', 'linkedin'],
    like: true,
    comment: false,
    follow: false,
    keywords: [],
  },
};

const DEFAULT_COUNTERS: CountersState = { twitter: null, linkedin: null };
const DEFAULT_SCHEDULER_STATE: SchedulerState = { nextEligibleAt: 0, lastFlushAt: 0 };

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
  // Fill in fields a previous version may not have written.
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    caps: { ...DEFAULT_SETTINGS.caps, ...stored.caps },
    activeHours: { ...DEFAULT_SETTINGS.activeHours, ...stored.activeHours },
    accountAgeMonths: { ...DEFAULT_SETTINGS.accountAgeMonths, ...stored.accountAgeMonths },
    homeFeed: { ...DEFAULT_SETTINGS.homeFeed, ...stored.homeFeed },
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
  | 'rate_limited';

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
