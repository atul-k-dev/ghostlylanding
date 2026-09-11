import type {
  User,
  ExtensionSettings,
  CountersState,
  ActionLogInput,
  XAccountPlan,
  PostLength,
} from '@casper/shared';
import type { PendingReply } from '@casper/shared';
import { REPLY_QUEUE_MAX } from '@casper/shared';
import type { PostOutcome, GrowthMilestone } from '@casper/shared';
import type { QueuedTask, SchedulerState, TargetStateMap } from '../scheduler/types.js';
import { INITIAL_TRUST, normalizeTrust } from './trust.js';
import type { VoiceTuneState } from './voice-tune.js';

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
  pendingReplies: 'casper.pendingReplies',
  selectorConfig: 'casper.selectorConfig',
  /** Why the engine isn't acting — see scheduler/block-reason.ts. */
  blockReason: 'casper.blockReason',
  /** Rolling 60-minute action window — see scheduler/rate-limit.ts. */
  rateWindow: 'casper.rateWindow',
  /** What setup read off the X account, so re-opening the panel doesn't re-scan. */
  setupRead: 'casper.setupRead',
  /** Live progress of that read — the panel watches this via onChanged. */
  setupProgress: 'casper.setupProgress',
  /** Drafts the user rejected, kept for Phase 6.3's voice tuning. */
  rejectedDrafts: 'casper.rejectedDrafts',
  /** (generated, corrected) pairs — the strongest voice signal there is (2.4). */
  correctedDrafts: 'casper.correctedDrafts',
  /** One-shot instruction from a condition card to the page it opens (1.7). */
  panelIntent: 'casper.panelIntent',
  /** Where the floating panel sits, per origin (2.2). */
  floatingPanel: 'casper.floatingPanel',
  /** The user's own post results, cached from the growth scan (3.1). */
  postOutcomes: 'casper.postOutcomes',
  /** Cached follower counts for mention authors (4.1) — avoids a profile visit
   *  per mention every scan. */
  mentionAuthorFollowers: 'casper.mentionAuthorFollowers',
  /** Daily browser-notification budget + per-episode dedupe (4.3). */
  notifyState: 'casper.notifyState',
  /** Change markers for the Growth tab's follower chart (5.1) — decisions the
   *  user made (preset switched, target added, auto-posting started), NOT
   *  the action log (that's likes/replies/follows, a different kind of
   *  event; conflating the two in one store would be a lie about what each
   *  entry means). */
  growthMilestones: 'casper.growthMilestones',
  /** Targets the weekly auto-tune dropped (6.1), kept so Growth can offer
   *  "Undo" — re-adding is a settings write, but the record of WHAT was
   *  dropped and WHEN has to survive that round-trip. */
  autoTuneDropped: 'casper.autoTuneDropped',
  /** Weekly voice-tune gate state (6.3) — when it last ran and how many
   *  corrected drafts existed then, so "5+ new corrections" is a real count. */
  voiceTuneState: 'casper.voiceTuneState',
  /** "Things you've told me" — Ask's standing instructions (5.2). Local-only,
   *  same as every other setting (updateplan §1: no server-authoritative
   *  settings store) — sent to the server on every /api/ask request so the
   *  model honours them without being asked twice. */
  standingInstructions: 'casper.standingInstructions',
  /** The side panel's notification page: when it was last opened, and feed
   *  items the user cleared — so the bell only lights up for what's new. */
  notificationsSeen: 'casper.notificationsSeen',
  /** Non-zero while a side panel is open (kept by the background from the
   *  panel's port) — the floating panel shrinks to its bubble when it opens. */
  sidePanelOpen: 'casper.sidePanelOpen',
} as const;

/**
 * What a condition card (or a Growth-tab button) asked the destination page
 * to do on arrival.
 *
 * Deliberately one-shot and deliberately tiny: "Write two for me" has to send
 * the user to Posts AND make Posts do the writing, and the alternative — a
 * prop threaded through the whole shell — would be a permanent piece of
 * plumbing for a couple of buttons. `write-like` carries the best post's own
 * text (updateplan 5.1's "Write more like this") as an extra topic hint —
 * fed into the SAME `/api/posts/ideas` call as everything else, not a second
 * generation path.
 */
export type PanelIntent = { type: 'write-two' } | { type: 'write-like'; seedText: string };

export const setPanelIntent = async (intent: PanelIntent): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.panelIntent]: intent });
};

/** Read it and clear it, so a page can't run the same instruction twice. */
export const takePanelIntent = async (): Promise<PanelIntent | null> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.panelIntent);
  const intent = (got[STORAGE_KEYS.panelIntent] as PanelIntent | undefined) ?? null;
  if (intent) await chrome.storage.local.remove(STORAGE_KEYS.panelIntent);
  return intent;
};

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
  // Outline the post being acted on, on the page. Defaults on: it is the answer
  // to "is this actually doing anything?", which is the first thing anyone asks.
  spotlight: true,
  // Browse like a human — open profiles/posts to act, then return to the feed.
  interactiveMode: true,
  activeHours: { startHour: 9, endHour: 22 },
  accountAgeMonths: { twitter: null, linkedin: null },
  targetCreators: [],
  // Topic feeds are opt-in — the user has to say what they care about.
  searchQueries: [],
  // Mirrors the home-feed defaults above (updateplan 6.7) — a fresh install
  // that adds a search feed sees the same starting behaviour a home feed
  // would have given it, just on its own budget.
  searchFeed: {
    like: true,
    comment: false,
    follow: false,
    bookmark: false,
    repost: false,
    quote: false,
  },
  contentTopics: [],
  // Early replies are only useful once there are target creators to watch, and
  // they add tab activity, so they're off until the user asks for them.
  earlyReply: false,
  // Skip buried thread-replies by default: they cost the same daily budget as a
  // top-level post and reach a fraction of the audience.
  skipReplies: true,
  whitelist: [],
  followFilter: { keywords: [], excludeKeywords: [] },
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
  // Hold replies for review by default — a new user should see what Ghostly
  // writes under their name before any of it is public.
  replyApproval: true,
  // Most accounts are free — default to the 280-char limit for scheduled posts.
  xAccountPlan: 'free',
  // Pro-only length target; harmless default for free accounts.
  postLength: 'short',
  // Balanced is what every install already runs — choosing it as the default
  // changes nothing for an existing user (see src/lib/presets.ts).
  safetyPreset: 'balanced',
  // No ramp until setup starts one. An install that predates the warm-up keeps
  // the caps it has rather than being throttled for work it already does safely.
  warmupStartedAt: null,
  // Nobody has been through setup on a fresh install, by definition.
  setupCompletedAt: null,
  // Auto-posting is off until the user turns it on. Publishing under someone's
  // name is the one thing this product must never start doing on its own
  // (updateplan §8).
  autoPost: {
    enabled: false,
    quietHours: 20,
    maxQueued: 3,
    lastRunAt: null,
  },
  // Nothing is trusted on day one. `grantedAt` is only ever written in answer
  // to the graduation offer.
  trust: INITIAL_TRUST,
  // On by default (updateplan 4.1) — reading notifications and drafting a
  // reply never posts anything by itself; whether it goes out unread is still
  // replyApproval/trust, same as every other reply.
  mentions: { enabled: true },
  // "Something is broken" alerts on by default (that's the safety class);
  // everything else opt-in (updateplan 4.3).
  notifications: { problems: true, bigReplies: false },
  // Off until the user asks (updateplan 6.1) — it removes target creators
  // automatically, which is exactly the kind of action this product never
  // defaults on.
  autoTune: { enabled: false, lastRunAt: null },
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
    // Reply approval defaults ON for NEW installs (see DEFAULT_SETTINGS) but must
    // not switch on under someone already running: an existing user whose replies
    // suddenly stopped going out would read that as the extension breaking, not
    // as a new safety feature. They opt in from Settings.
    replyApproval: stored.replyApproval ?? false,
    // Caps are code-managed (no UI editor), so always use the current defaults —
    // otherwise a previously-persisted value would pin old, lower limits.
    caps: DEFAULT_SETTINGS.caps,
    // Auto-posting merges field by field so a new bound (added later) applies to
    // an existing install — but `enabled` comes from what the user actually
    // chose, and defaults to off for anyone who has never seen the switch.
    autoPost: { ...DEFAULT_SETTINGS.autoPost, ...stored.autoPost },
    trust: normalizeTrust(stored.trust),
    mentions: { ...DEFAULT_SETTINGS.mentions, ...stored.mentions },
    notifications: { ...DEFAULT_SETTINGS.notifications, ...stored.notifications },
    autoTune: { ...DEFAULT_SETTINGS.autoTune, ...stored.autoTune },
    activeHours: { ...DEFAULT_SETTINGS.activeHours, ...stored.activeHours },
    accountAgeMonths: { ...DEFAULT_SETTINGS.accountAgeMonths, ...stored.accountAgeMonths },
    targetCreators: onlyTwitter(stored.targetCreators),
    searchQueries: stored.searchQueries ?? [],
    // An install that predates 6.7 has no `searchFeed` of its own — seed it
    // from whatever `homeFeed` toggles it was ALREADY running search off of,
    // not from the static default, so decoupling the two doesn't silently
    // change what an existing search feed does the next time it runs.
    searchFeed: stored.searchFeed ?? {
      like: stored.homeFeed?.like ?? DEFAULT_SETTINGS.homeFeed.like,
      comment: stored.homeFeed?.comment ?? DEFAULT_SETTINGS.homeFeed.comment,
      follow: stored.homeFeed?.follow ?? DEFAULT_SETTINGS.homeFeed.follow,
      bookmark: stored.homeFeed?.bookmark ?? DEFAULT_SETTINGS.homeFeed.bookmark,
      repost: stored.homeFeed?.repost ?? DEFAULT_SETTINGS.homeFeed.repost,
      quote: stored.homeFeed?.quote ?? DEFAULT_SETTINGS.homeFeed.quote,
    },
    contentTopics: stored.contentTopics ?? [],
    whitelist: onlyTwitter(stored.whitelist),
    followFilter: stored.followFilter ?? DEFAULT_SETTINGS.followFilter,
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

// -- mention-author follower cache (updateplan 4.1) --------------------------
/**
 * Follower counts for mention authors, so ranking a burst of mentions doesn't
 * mean a burst of profile visits — a real read is cached for a day and reused,
 * the way `setupRead`'s follower counts already are for target creators.
 */
interface FollowerCacheEntry {
  followers: number;
  checkedAt: number;
}
type FollowerCache = Record<string, FollowerCacheEntry>;

const FOLLOWER_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const FOLLOWER_CACHE_MAX = 500;

export const getCachedFollowerCount = async (handle: string): Promise<number | null> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.mentionAuthorFollowers);
  const cache = (got[STORAGE_KEYS.mentionAuthorFollowers] as FollowerCache | undefined) ?? {};
  const entry = cache[handle.replace(/^@/, '').toLowerCase()];
  if (!entry || Date.now() - entry.checkedAt > FOLLOWER_CACHE_TTL_MS) return null;
  return entry.followers;
};

export const setCachedFollowerCount = async (handle: string, followers: number): Promise<void> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.mentionAuthorFollowers);
  const cache = (got[STORAGE_KEYS.mentionAuthorFollowers] as FollowerCache | undefined) ?? {};
  const key = handle.replace(/^@/, '').toLowerCase();
  cache[key] = { followers, checkedAt: Date.now() };
  // Bounded like the other dedupe maps: drop the oldest reads once it grows
  // past a sane ceiling rather than keeping every handle ever mentioned.
  const entries = Object.entries(cache);
  const next: FollowerCache =
    entries.length > FOLLOWER_CACHE_MAX
      ? Object.fromEntries(
          entries.sort((a, b) => b[1].checkedAt - a[1].checkedAt).slice(0, FOLLOWER_CACHE_MAX),
        )
      : cache;
  await chrome.storage.local.set({ [STORAGE_KEYS.mentionAuthorFollowers]: next });
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
  | 'auto_pause'
  /** An unexpected exception. Everything above is a failure we anticipated;
   *  this is the bucket for the ones we didn't, which otherwise vanish. */
  | 'crash';

export interface DiagnosticEntry {
  at: string; // ISO timestamp
  kind: DiagnosticKind;
  context: string; // human label
  detail?: string;
  /** True once reported to the server. Entries stay in the local ring buffer
   *  either way — the user's Diagnostics panel is their own history. */
  sent?: boolean;
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

export const setDiagnostics = async (list: DiagnosticEntry[]): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.diagnostics]: list.slice(0, DIAG_MAX) });
};

export const clearDiagnostics = async (): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.diagnostics]: [] });
};

/* -- remote selector config ------------------------------------------------
 * The server can serve corrected DOM selectors so an X change doesn't wait on a
 * Chrome Web Store review. The cached copy lives here with every other piece of
 * local state; fetching and applying it lives in lib/selector-config.ts.
 * ---------------------------------------------------------------------- */

export interface SelectorConfig {
  /** Server-set version string — shown in logs so support can tell which map a
   *  user is running. */
  version: string;
  /** Partial map of selector key → CSS selector. */
  selectors: Record<string, string>;
  /** ms epoch of the last successful fetch. */
  fetchedAt: number;
}

export const getStoredSelectorConfig = async (): Promise<SelectorConfig | null> => {
  try {
    const got = await chrome.storage.local.get(STORAGE_KEYS.selectorConfig);
    return (got[STORAGE_KEYS.selectorConfig] as SelectorConfig | undefined) ?? null;
  } catch {
    return null;
  }
};

export const setSelectorConfig = async (config: SelectorConfig): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.selectorConfig]: config });
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
/**
 * The most posts a user may have queued (status 'scheduled') at once. A real
 * content calendar is a few weeks deep; the old limit of 5 meant refilling the
 * queue every couple of days, which is the chore scheduling is meant to remove.
 */
export const MAX_SCHEDULED_POSTS = 25;

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
/** Keep total history bounded (drop oldest posted/failed beyond this). Must
 *  exceed MAX_SCHEDULED_POSTS, or a full queue would leave no room for history. */
const SCHEDULED_POSTS_MAX_TOTAL = 60;

/**
 * `draft` (updateplan 3.2) is a post Ghostly wrote and gave a slot, which the
 * user has NOT said yes to. It is deliberately a separate status rather than a
 * flag: `maybePublishDuePost` selects on `status === 'scheduled'`, so a draft
 * cannot publish by accident no matter what else goes wrong. Approving it is
 * what turns it into a `scheduled` post.
 */
export type ScheduledPostStatus = 'draft' | 'scheduled' | 'publishing' | 'posted' | 'failed';

export interface ScheduledPost {
  id: string;
  /** The tweet body (AI-drafted, then user-editable). */
  text: string;
  /** Optional link appended to the tweet so X unfurls it into a card. */
  link: string;
  /** Optional image as a data URL — stored locally, attached at post time. */
  imageDataUrl: string | null;
  /**
   * The rest of a thread: one string per follow-up tweet, posted in order after
   * `text`. Empty or absent for a single post.
   */
  thread?: string[];
  /** ms epoch of the exact moment the post should publish. It becomes due at
   *  this instant and fires on or after it — the next time the extension runs
   *  (so a post whose slot was missed goes out the next time the browser opens). */
  scheduledAt: number;
  status: ScheduledPostStatus;
  createdAt: number;
  postedAt?: number;
  /** Failure reason, when status === 'failed'. */
  error?: string;
  /**
   * Who wrote it. `auto` means the auto-draft loop (3.2) did, which is what the
   * UI needs to label it honestly and what the trust streak counts approvals of.
   */
  origin?: 'user' | 'auto';
  /** What the model produced, kept when the user edits it, so approving an
   *  edited post can tell the trust streak (3.3) that it was edited. */
  generated?: string;
}

/** A post still waiting on a human, or waiting for its slot. */
export const isPendingPost = (p: ScheduledPost): boolean =>
  p.status === 'draft' || p.status === 'scheduled' || p.status === 'publishing';

export const getScheduledPosts = async (): Promise<ScheduledPost[]> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.scheduledPosts);
  return (got[STORAGE_KEYS.scheduledPosts] as ScheduledPost[] | undefined) ?? [];
};

export const setScheduledPosts = async (posts: ScheduledPost[]): Promise<void> => {
  // Keep the list bounded: never drop still-pending posts, only trim the oldest
  // finished (posted/failed) history beyond the cap.
  let next = posts;
  if (next.length > SCHEDULED_POSTS_MAX_TOTAL) {
    // Drafts count as pending: one the user hasn't read yet is exactly the one
    // that must not vanish to make room for a fortnight-old success.
    const pending = next.filter(isPendingPost);
    const finished = next
      .filter((p) => p.status === 'posted' || p.status === 'failed')
      .sort((a, b) => (b.postedAt ?? b.createdAt) - (a.postedAt ?? a.createdAt))
      .slice(0, Math.max(0, SCHEDULED_POSTS_MAX_TOTAL - pending.length));
    next = [...pending, ...finished];
  }
  await chrome.storage.local.set({ [STORAGE_KEYS.scheduledPosts]: next });
};

/**
 * Put a failed post back on the schedule (updateplan 1.7's "Try again" and
 * "Post without image" buttons).
 *
 * Only a `failed` post is eligible: a post mid-publish must never be re-armed
 * from the UI, or the user's timeline gets it twice. `dropImage` exists because
 * `compose.ts` deliberately refuses to publish a post whose image didn't attach
 * — going without the image is the user's call, so it is a button, not a
 * fallback.
 */
export const retryScheduledPost = async (
  id: string,
  opts: { dropImage?: boolean } = {},
): Promise<void> => {
  const posts = await getScheduledPosts();
  await setScheduledPosts(
    posts.map((p) => {
      if (p.id !== id || p.status !== 'failed') return p;
      const { error: _dropped, ...rest } = p;
      return {
        ...rest,
        status: 'scheduled' as const,
        // Due immediately: the user just pressed a button asking for it.
        scheduledAt: Date.now(),
        ...(opts.dropImage ? { imageDataUrl: null } : {}),
      };
    }),
  );
};

/* -- the user's own post results (3.1) ------------------------------------
 * The growth scan already scrapes these off the user's timeline and uploads
 * them to the server, which keeps them for the Growth tab's top five. The
 * best-time model needs the whole history, in the extension, offline — so the
 * scan keeps a local copy on the way past. No new server surface, no round trip
 * to answer "when should I publish", and it works while the API is unreachable.
 *
 * Merged by tweetId rather than appended: a later scan re-reads the same posts
 * with matured numbers, and that update is the point of re-scanning.
 * ---------------------------------------------------------------------- */

/** Roughly six months of daily posting. Old results stop describing the
 *  audience the account has now. */
const POST_OUTCOMES_MAX = 200;

export const getPostOutcomes = async (): Promise<PostOutcome[]> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.postOutcomes);
  return (got[STORAGE_KEYS.postOutcomes] as PostOutcome[] | undefined) ?? [];
};

export const mergePostOutcomes = async (fresh: readonly PostOutcome[]): Promise<number> => {
  if (fresh.length === 0) return 0;
  const byId = new Map<string, PostOutcome>();
  for (const o of await getPostOutcomes()) byId.set(o.tweetId, o);
  for (const o of fresh) byId.set(o.tweetId, o);
  // Newest first, so the trim drops the oldest. A post with no readable
  // timestamp sorts last: it is useless to the best-time model anyway, and
  // NaN in a comparator makes the whole order arbitrary.
  const when = (o: PostOutcome): number => {
    const t = Date.parse(o.publishedAt ?? '');
    return Number.isFinite(t) ? t : 0;
  };
  const merged = [...byId.values()].sort((a, b) => when(b) - when(a)).slice(0, POST_OUTCOMES_MAX);
  await chrome.storage.local.set({ [STORAGE_KEYS.postOutcomes]: merged });
  return merged.length;
};

// -- cached own X handle (for auto follow-back) ------------------------------
/* -- reply approval queue -------------------------------------------------
 * Drafts awaiting the user's yes. Local, not server-side: reviewing a reply
 * needs the source post's text beside it, and the server stores only its hash.
 * ---------------------------------------------------------------------- */

export const getPendingReplies = async (): Promise<PendingReply[]> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.pendingReplies);
  return (got[STORAGE_KEYS.pendingReplies] as PendingReply[] | undefined) ?? [];
};

export const setPendingReplies = async (list: PendingReply[]): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.pendingReplies]: list });
};

/**
 * Add a draft to the review queue. Returns false when the queue is FULL — the
 * caller then stops drafting, rather than us evicting someone's oldest draft
 * (a paid-for model call nobody ever saw). Same-post duplicates are ignored.
 */
export const queuePendingReply = async (reply: PendingReply): Promise<boolean> => {
  const list = await getPendingReplies();
  if (list.length >= REPLY_QUEUE_MAX) return false;
  if (list.some((r) => r.postId === reply.postId && r.platform === reply.platform)) return true;
  list.push(reply);
  await setPendingReplies(list);
  return true;
};

/** Remove one draft by id, returning it so the caller can act on it. */
export const takePendingReply = async (id: string): Promise<PendingReply | null> => {
  const list = await getPendingReplies();
  const found = list.find((r) => r.id === id) ?? null;
  if (found) await setPendingReplies(list.filter((r) => r.id !== id));
  return found;
};

/** How many more drafts the queue can hold right now. */
export const pendingReplySpace = async (): Promise<number> =>
  Math.max(0, REPLY_QUEUE_MAX - (await getPendingReplies()).length);

export const getOwnHandle = async (): Promise<string | null> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.ownHandle);
  return (got[STORAGE_KEYS.ownHandle] as string | undefined) ?? null;
};

export const setOwnHandle = async (handle: string): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.ownHandle]: handle });
};

/** A draft the user turned down, and the post that prompted it. */
export interface RejectedDraft {
  /** The post's text — the input the model was answering. */
  text: string;
  /** What it wrote, when it got that far. */
  draft: string | null;
  at: string;
}

/** Most rejections worth keeping. Old ones stop being about the current voice. */
const REJECTED_DRAFTS_MAX = 50;

/**
 * Remember a rejected draft.
 *
 * Phase 6.3 feeds `(generated, corrected)` pairs back into the voice profile;
 * a flat rejection is the weakest form of that signal, but it is the only one
 * available during setup, and throwing it away would mean asking the user the
 * same question again in six weeks.
 */
export const appendRejectedDraft = async (entry: RejectedDraft): Promise<void> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.rejectedDrafts);
  const existing = (got[STORAGE_KEYS.rejectedDrafts] as RejectedDraft[] | undefined) ?? [];
  const next = [...existing, entry].slice(-REJECTED_DRAFTS_MAX);
  await chrome.storage.local.set({ [STORAGE_KEYS.rejectedDrafts]: next });
};

export const getRejectedDrafts = async (): Promise<RejectedDraft[]> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.rejectedDrafts);
  return (got[STORAGE_KEYS.rejectedDrafts] as RejectedDraft[] | undefined) ?? [];
};

/** A draft the user edited before sending, and what they changed it to. */
export interface CorrectedDraft {
  /** The post being answered. */
  postText: string;
  /** What the model wrote. */
  generated: string;
  /** What the user actually sent. */
  corrected: string;
  at: string;
}

const CORRECTED_DRAFTS_MAX = 50;

/**
 * Remember an edit (updateplan 2.4).
 *
 * A rejection says "not that"; an edit says "this instead", which is the only
 * signal that carries the user's own voice. Phase 6.3 feeds these pairs back
 * into the voice profile, and every one thrown away is a question we have to
 * ask the user again later.
 */
export const appendCorrectedDraft = async (entry: CorrectedDraft): Promise<void> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.correctedDrafts);
  const existing = (got[STORAGE_KEYS.correctedDrafts] as CorrectedDraft[] | undefined) ?? [];
  const next = [...existing, entry].slice(-CORRECTED_DRAFTS_MAX);
  await chrome.storage.local.set({ [STORAGE_KEYS.correctedDrafts]: next });
};

export const getCorrectedDrafts = async (): Promise<CorrectedDraft[]> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.correctedDrafts);
  return (got[STORAGE_KEYS.correctedDrafts] as CorrectedDraft[] | undefined) ?? [];
};

const GROWTH_MILESTONES_MAX = 100;

/**
 * Record a change worth annotating on the Growth tab's follower chart
 * (updateplan 5.1). Called from wherever the underlying decision is actually
 * made (Settings, Who I watch, Posts) — never inferred from a bend in the
 * follower curve, which is evidence of nothing on its own.
 */
export const appendGrowthMilestone = async (entry: GrowthMilestone): Promise<void> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.growthMilestones);
  const existing = (got[STORAGE_KEYS.growthMilestones] as GrowthMilestone[] | undefined) ?? [];
  const next = [...existing, entry].slice(-GROWTH_MILESTONES_MAX);
  await chrome.storage.local.set({ [STORAGE_KEYS.growthMilestones]: next });
};

export const getGrowthMilestones = async (): Promise<GrowthMilestone[]> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.growthMilestones);
  return (got[STORAGE_KEYS.growthMilestones] as GrowthMilestone[] | undefined) ?? [];
};

/** One target the weekly auto-tune dropped (updateplan 6.1). */
export interface AutoTuneDrop {
  handle: string;
  at: string;
  /** Why — always the same reason today (stale), named explicitly rather
   *  than left implicit so a future second reason doesn't have to guess
   *  what old entries meant. */
  reason: 'stale';
}

const AUTO_TUNE_DROPPED_MAX = 100;

export const appendAutoTuneDrops = async (drops: AutoTuneDrop[]): Promise<void> => {
  if (drops.length === 0) return;
  const got = await chrome.storage.local.get(STORAGE_KEYS.autoTuneDropped);
  const existing = (got[STORAGE_KEYS.autoTuneDropped] as AutoTuneDrop[] | undefined) ?? [];
  const next = [...existing, ...drops].slice(-AUTO_TUNE_DROPPED_MAX);
  await chrome.storage.local.set({ [STORAGE_KEYS.autoTuneDropped]: next });
};

export const getAutoTuneDrops = async (): Promise<AutoTuneDrop[]> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.autoTuneDropped);
  return (got[STORAGE_KEYS.autoTuneDropped] as AutoTuneDrop[] | undefined) ?? [];
};

/** Undo removes just this one drop record — the handle itself is re-added to
 *  targetCreators by the caller; this only clears it from the "recently
 *  dropped" list so it doesn't stay listed as droppable-again. */
export const clearAutoTuneDrop = async (handle: string): Promise<void> => {
  const existing = await getAutoTuneDrops();
  const next = existing.filter((d) => d.handle.toLowerCase() !== handle.toLowerCase());
  await chrome.storage.local.set({ [STORAGE_KEYS.autoTuneDropped]: next });
};

const DEFAULT_VOICE_TUNE_STATE: VoiceTuneState = { lastTunedAt: null, lastCorrectionCount: 0 };

export const getVoiceTuneState = async (): Promise<VoiceTuneState> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.voiceTuneState);
  return (got[STORAGE_KEYS.voiceTuneState] as VoiceTuneState | undefined) ?? DEFAULT_VOICE_TUNE_STATE;
};

export const setVoiceTuneState = async (state: VoiceTuneState): Promise<void> => {
  await chrome.storage.local.set({ [STORAGE_KEYS.voiceTuneState]: state });
};

/** "Things you've told me" (updateplan 5.2, rule 4). Capped the same as the
 *  server's own validation (ASK_LIMITS-equivalent), so a full list never gets
 *  silently truncated server-side after the user thought they'd added one. */
const STANDING_INSTRUCTIONS_MAX = 50;

export const getStandingInstructions = async (): Promise<string[]> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.standingInstructions);
  return (got[STORAGE_KEYS.standingInstructions] as string[] | undefined) ?? [];
};

export const addStandingInstruction = async (instruction: string): Promise<string[]> => {
  const existing = await getStandingInstructions();
  const trimmed = instruction.trim();
  if (!trimmed || existing.some((i) => i.toLowerCase() === trimmed.toLowerCase())) return existing;
  const next = [...existing, trimmed].slice(-STANDING_INSTRUCTIONS_MAX);
  await chrome.storage.local.set({ [STORAGE_KEYS.standingInstructions]: next });
  return next;
};

export const removeStandingInstruction = async (instruction: string): Promise<string[]> => {
  const existing = await getStandingInstructions();
  const next = existing.filter((i) => i.toLowerCase() !== instruction.trim().toLowerCase());
  await chrome.storage.local.set({ [STORAGE_KEYS.standingInstructions]: next });
  return next;
};
