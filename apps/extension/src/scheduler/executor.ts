/**
 * Task executor — real platform dispatch for M4+.
 *
 * Each queued task is one of:
 *   - 'like'  (action) → opens post URL, content script clicks like
 *   - 'scan-profile-likes' (scan) → opens profile, collects fresh posts,
 *                                   enqueues `like` tasks for non-duplicates
 *   - 'comment', 'follow' → stub for now (M5/M6)
 */
import type { ActionType } from '@casper/shared';
import { FREE_TIER, isPro, monthlyActionsUsed } from '@casper/shared';
import type { ExecutorResult, QueuedTask } from './types.js';
import { driveTab } from '../platforms/common/tab-driver.js';
import { FRESH_WINDOW_HOURS } from '../platforms/common/freshness.js';
import { extractPostId } from '../platforms/common/dedupe.js';
import {
  isAlreadyLiked,
  markLiked,
  isAlreadyCommented,
  markCommented,
  isAlreadyFollowed,
  markFollowed,
  isAlreadyDrafted,
  markDrafted,
  getTargetState,
  setTargetState,
  getSettings,
  getSchedulerState,
  getAuth,
  getOwnHandle,
  setOwnHandle,
  getCommentedPosts,
  getDraftedPosts,
  getQuotedPosts,
  pendingReplySpace,
  queuePendingReply,
  getFollowedHandles,
  appendDiagnostic,
  mergePostOutcomes,
  getCachedFollowerCount,
  setCachedFollowerCount,
} from '../lib/storage.js';
import { isWhitelisted } from '../lib/whitelist.js';
import {
  buildProfileUrl as twitterProfileUrl,
  buildFollowersUrl as twitterFollowersUrl,
  buildSearchUrl as twitterSearchUrl,
  MENTIONS_URL,
} from '../platforms/twitter/selectors.js';
import { apiFetch } from '../lib/api.js';
import { ensureToday } from './counters.js';
import { localDate } from './timegate.js';
import { actionDelayFor } from '../lib/presets.js';
import { GROWTH_LIMITS } from '@casper/shared';
import type { ScrapedOutcome } from '../platforms/common/content-messages.js';
import { MIN_REPLY_POST_CHARS } from '../platforms/common/relevance.js';
import { requestCommentDraft } from '../lib/comment-draft.js';
import { isTrusted } from '../lib/trust.js';
import { classifyMention, rankMentions, type MentionCandidate } from '../lib/mentions.js';
import { enqueue } from './queue.js';
import { maybeNotifyBigReply } from '../lib/browser-notify.js';

// Twitter/X is the only automated platform. (LinkedIn automation was removed.)
const profileUrlFor = (handle: string): string => twitterProfileUrl(handle);
const followersUrlFor = (handle: string): string => twitterFollowersUrl(handle);
const candidateProfileUrl = (handle: string): string => twitterProfileUrl(handle);
const HOME_URL = 'https://x.com/home';
/**
 * Freshness window for an early-reply visit. The normal sweep engages anything
 * from the last 48h; early replies only want what's minutes-to-hours old, since
 * the whole value is being near the top of the replies rather than buried.
 */
const EARLY_FRESH_HOURS = 3;

const executeLike = async (task: QueuedTask): Promise<ExecutorResult> => {
  const postUrl = task.payload.postUrl as string | undefined;
  const postId = task.payload.postId as string | undefined;
  if (!postUrl) {
    return { success: false, errorMessage: 'missing postUrl' };
  }

  if (postId && (await isAlreadyLiked(task.platform, postId))) {
    return {
      success: true,
      logEntry: {
        platform: task.platform,
        actionType: 'like',
        targetUrl: postUrl,
        success: true,
        errorMessage: 'already_liked',
        timestamp: new Date().toISOString(),
      },
    };
  }

  let resp;
  try {
    resp = await driveTab(postUrl, { type: 'LIKE_POST', payload: { postUrl } });
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : 'tab driver failed',
      logEntry: {
        platform: task.platform,
        actionType: 'like',
        targetUrl: postUrl,
        success: false,
        errorMessage: err instanceof Error ? err.message : 'tab driver failed',
        timestamp: new Date().toISOString(),
      },
    };
  }

  if (resp.type === 'LIKE_RESULT') {
    const { liked, alreadyLiked, error } = resp.payload;
    const success = liked || alreadyLiked;
    if (success && postId) {
      await markLiked(task.platform, postId);
    }
    if (!success && error) {
      await appendDiagnostic({
        kind: 'selector_miss',
        context: `${task.platform}:like`,
        detail: error,
      });
    }
    return {
      success,
      ...(error ? { errorMessage: error } : {}),
      logEntry: {
        platform: task.platform,
        actionType: 'like',
        targetUrl: postUrl,
        success,
        ...(error ? { errorMessage: error } : alreadyLiked ? { errorMessage: 'already_liked' } : {}),
        timestamp: new Date().toISOString(),
      },
    };
  }

  return {
    success: false,
    errorMessage: resp.type === 'ERROR' ? resp.payload.message : 'unexpected content response',
  };
};

/**
 * Profile visit — runs the inline autopilot ON the creator's profile: ONE tab
 * smoothly scrolls their timeline and likes their recent posts in place (plus
 * any other enabled content actions), then stops once it's past their fresh
 * posts. No more "scan a few posts, close, then like in separate tabs."
 */
const executeScan = async (task: QueuedTask): Promise<ExecutorResult> => {
  const handle = task.payload.handle as string | undefined;
  if (!handle) return { success: false, errorMessage: 'missing handle' };
  return runInlineAutopilot(task, {
    kind: 'profile',
    handle,
    early: task.payload.early === true,
  });
};

/** Live-search feed — work X's "Latest" tab for one saved query. */
const executeSearchScan = async (task: QueuedTask): Promise<ExecutorResult> => {
  const query = task.payload.query as string | undefined;
  if (!query) return { success: false, errorMessage: 'missing query' };
  return runInlineAutopilot(task, { kind: 'search', query });
};

const executeComment = async (task: QueuedTask): Promise<ExecutorResult> => {
  const postUrl = task.payload.postUrl as string | undefined;
  const commentText = task.payload.commentText as string | undefined;
  const draftId = task.payload.draftId as string | undefined;
  const postId = (task.payload.postId as string | undefined) ?? extractPostId(task.platform, postUrl ?? '');
  if (!postUrl || !commentText) {
    return { success: false, errorMessage: 'missing postUrl or commentText' };
  }
  if (postId && (await isAlreadyCommented(task.platform, postId))) {
    return {
      success: true,
      logEntry: {
        platform: task.platform,
        actionType: 'comment',
        targetUrl: postUrl,
        success: true,
        errorMessage: 'already_commented',
        timestamp: new Date().toISOString(),
      },
    };
  }

  let resp;
  try {
    resp = await driveTab(
      postUrl,
      { type: 'SUBMIT_COMMENT', payload: { postUrl, commentText } },
      { settleMs: 3_500 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'tab driver failed';
    if (draftId) await markDraft(draftId, 'failed');
    return {
      success: false,
      errorMessage: msg,
      logEntry: {
        platform: task.platform,
        actionType: 'comment',
        targetUrl: postUrl,
        success: false,
        errorMessage: msg,
        timestamp: new Date().toISOString(),
      },
    };
  }

  if (resp.type !== 'COMMENT_RESULT') {
    const msg = resp.type === 'ERROR' ? resp.payload.message : 'unexpected content response';
    if (draftId) await markDraft(draftId, 'failed');
    return { success: false, errorMessage: msg };
  }

  const { posted, error } = resp.payload;
  if (posted && postId) await markCommented(task.platform, postId);
  if (draftId) await markDraft(draftId, posted ? 'posted' : 'failed');
  if (!posted && error) {
    await appendDiagnostic({
      kind: 'selector_miss',
      context: `${task.platform}:comment`,
      detail: error,
    });
  }

  return {
    success: posted,
    ...(error ? { errorMessage: error } : {}),
    logEntry: {
      platform: task.platform,
      actionType: 'comment',
      targetUrl: postUrl,
      success: posted,
      ...(error ? { errorMessage: error } : {}),
      timestamp: new Date().toISOString(),
    },
  };
};

const markDraft = async (id: string, state: 'posted' | 'failed'): Promise<void> => {
  try {
    await apiFetch(`/api/comments/drafts/${encodeURIComponent(id)}/${state}`, { method: 'POST' });
  } catch (e) {
    console.warn('[casper] failed to mark draft', state, e);
  }
};

type FollowListOutcome =
  | { kind: 'ok'; followed: number }
  | { kind: 'budget' }
  | { kind: 'error'; message: string };

/**
 * Shared inline follow-list runner. Opens a followers list — your own (auto
 * follow-back) or a creator's (the "Followers" button) — scrolls it, and follows
 * people IN PLACE: clicks the Follow button on each cell in ONE tab, paced, and
 * records each follow live (RECORD_ACTION → caps + monthly count + log). Honors
 * the follow daily cap, the free-tier monthly cap, the whitelist, and anyone
 * already followed. No more per-candidate tabs.
 */
const runInlineFollowList = async (
  task: QueuedTask,
  url: string,
): Promise<FollowListOutcome> => {
  const settings = await getSettings();
  const auth = await getAuth();
  const pro = isPro(auth?.user.subscriptionStatus ?? 'free');
  const counters = await ensureToday(settings);
  const c = counters[task.platform];
  const remainingFollows = c ? Math.max(0, c.effectiveCap.followsPerDay - c.byActionType.follow) : 0;
  const monthlyLeft = pro
    ? Number.MAX_SAFE_INTEGER
    : Math.max(0, FREE_TIER.monthlyActions - monthlyActionsUsed(auth?.user));
  const max = Math.min(remainingFollows, monthlyLeft, 30);
  if (max <= 0) return { kind: 'budget' };

  // Never re-follow: skip the whitelist + anyone we've already followed.
  const prefix = `${task.platform}:`;
  const wl = settings.whitelist
    .filter((w) => w.platform === task.platform)
    .map((w) => w.handle.replace(/^@/, '').toLowerCase());
  const followedMap = await getFollowedHandles();
  const already = Object.keys(followedMap)
    .filter((k) => k.startsWith(prefix))
    .map((k) => k.slice(prefix.length));
  const skipHandles = [...new Set([...wl, ...already])].slice(0, 2_000);

  let resp;
  try {
    resp = await driveTab(
      url,
      {
        type: 'FOLLOW_BACK',
        payload: {
          max,
          minDelayMs: actionDelayFor(settings).min,
          maxDelayMs: actionDelayFor(settings).max,
          skipHandles,
          // Bio quality filter (6.5 — D9); omitted entirely when unset so a
          // fresh install's behaviour is unchanged rather than filtering on
          // an empty list (harmless either way, but explicit beats implicit).
          ...(settings.followFilter.keywords.length > 0 ||
          settings.followFilter.excludeKeywords.length > 0
            ? { bioFilter: settings.followFilter }
            : {}),
        },
      },
      { settleMs: 3_500 },
    );
  } catch (err) {
    return { kind: 'error', message: err instanceof Error ? err.message : 'tab driver failed' };
  }
  if (resp.type !== 'FOLLOW_BACK_RESULT') {
    return {
      kind: 'error',
      message: resp.type === 'ERROR' ? resp.payload.message : 'unexpected follow-list response',
    };
  }
  return { kind: 'ok', followed: resp.payload.followed.length };
};

/** Turn a follow-list outcome into an ExecutorResult with a human label. */
const followOutcomeResult = (o: FollowListOutcome, label: string): ExecutorResult => {
  if (o.kind === 'error') return { success: false, errorMessage: o.message };
  if (o.kind === 'budget') return { success: true, errorMessage: `${label}: no follow budget left` };
  return {
    success: true,
    errorMessage:
      o.followed === 0 ? `${label}: nobody new to follow` : `${label}: ${o.followed} followed`,
  };
};

/**
 * "Followers" button (and the periodic auto-rescan) — visit a creator's
 * followers list and follow them INLINE in one tab. Same engine as auto
 * follow-back, just pointed at the target creator's followers page.
 */
const executeFollowScan = async (task: QueuedTask): Promise<ExecutorResult> => {
  const handle = task.payload.handle as string | undefined;
  if (!handle) return { success: false, errorMessage: 'missing handle' };
  const clean = handle.replace(/^@/, '');

  const outcome = await runInlineFollowList(task, followersUrlFor(handle));

  if (outcome.kind === 'ok' && outcome.followed === 0) {
    await appendDiagnostic({
      kind: 'selector_miss',
      context: `${task.platform}:profile-followers`,
      detail: `Followed nobody new on @${clean}'s followers (already followed / private / DOM changed).`,
    });
  }

  // Pace re-scans (matches the refill loop's per-target key).
  const state = await getTargetState();
  const key = `${task.platform}:${clean}`;
  state[key] = { ...(state[key] ?? { lastScannedAt: 0 }), lastFollowScanAt: Date.now() };
  await setTargetState(state);

  return followOutcomeResult(outcome, `followers @${clean}`);
};

const executeFollow = async (task: QueuedTask): Promise<ExecutorResult> => {
  const handle = task.payload.handle as string | undefined;
  const profileUrl =
    (task.payload.profileUrl as string | undefined) ??
    (handle ? candidateProfileUrl(handle) : undefined);
  if (!handle || !profileUrl) {
    return { success: false, errorMessage: 'missing handle/profileUrl' };
  }

  // Whitelist (updateplan 6.6 — D7): this single-handle follow task (used for
  // setup-proposed targets, among others) had NO whitelist check at all —
  // unlike `runInlineFollowList`, which is the only path that ever read it.
  // "Will never follow accounts on this list" has to hold everywhere a follow
  // can originate, not just the list-scanning path.
  const settings = await getSettings();
  if (isWhitelisted(handle, task.platform, settings.whitelist)) {
    return {
      success: true,
      logEntry: {
        platform: task.platform,
        actionType: 'follow',
        targetUrl: profileUrl,
        targetHandle: handle,
        success: true,
        errorMessage: 'whitelisted',
        timestamp: new Date().toISOString(),
      },
    };
  }

  if (await isAlreadyFollowed(task.platform, handle)) {
    return {
      success: true,
      logEntry: {
        platform: task.platform,
        actionType: 'follow',
        targetUrl: profileUrl,
        targetHandle: handle,
        success: true,
        errorMessage: 'already_followed',
        timestamp: new Date().toISOString(),
      },
    };
  }

  let resp;
  try {
    resp = await driveTab(
      profileUrl,
      { type: 'FOLLOW_HANDLE', payload: { handle } },
      { settleMs: 3_000 },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'tab driver failed';
    return {
      success: false,
      errorMessage: msg,
      logEntry: {
        platform: task.platform,
        actionType: 'follow',
        targetUrl: profileUrl,
        targetHandle: handle,
        success: false,
        errorMessage: msg,
        timestamp: new Date().toISOString(),
      },
    };
  }

  if (resp.type !== 'FOLLOW_RESULT') {
    return {
      success: false,
      errorMessage:
        resp.type === 'ERROR' ? resp.payload.message : 'unexpected follow response',
    };
  }

  const { followed, alreadyFollowing, error } = resp.payload;
  const success = followed || alreadyFollowing;
  if (success) await markFollowed(task.platform, handle);
  if (!success && error) {
    await appendDiagnostic({
      kind: 'selector_miss',
      context: `${task.platform}:follow`,
      detail: error,
    });
  }

  return {
    success,
    ...(error ? { errorMessage: error } : {}),
    logEntry: {
      platform: task.platform,
      actionType: 'follow',
      targetUrl: profileUrl,
      targetHandle: handle,
      success,
      ...(error
        ? { errorMessage: error }
        : alreadyFollowing
          ? { errorMessage: 'already_followed' }
          : {}),
      timestamp: new Date().toISOString(),
    },
  };
};

/** Where the inline autopilot runs: the user's home timeline, or one creator's
 *  profile (the "Posts" button / auto-rescan). */
type AutopilotSource =
  | { kind: 'home' }
  | { kind: 'profile'; handle: string; /** Early-reply visit: only brand-new posts. */ early?: boolean }
  | { kind: 'search'; query: string };

/**
 * Inline autopilot (Twitter/X) — ONE tab smoothly scrolls the timeline (home OR
 * a creator's profile) and likes / comments / follows / bookmarks / reposts /
 * quotes IN PLACE (no per-action tabs). Daily caps, the free-tier monthly cap,
 * and the session length are enforced via budgets passed to the content script;
 * results come back here and are logged + counted + de-duped.
 *
 * Profile visits differ from home: we always Like (that's the promise), never
 * Follow (it's a single author), ignore relevance keywords (the user explicitly
 * targeted this creator), and STOP once we've scrolled past their fresh posts —
 * so the tab doesn't sit open scrolling an old timeline for the whole session.
 */
const runInlineAutopilot = async (
  task: QueuedTask,
  source: AutopilotSource = { kind: 'home' },
): Promise<ExecutorResult> => {
  const settings = await getSettings();
  const hf = settings.homeFeed;
  const platform = task.platform;
  const isProfile = source.kind === 'profile';
  const isSearch = source.kind === 'search';
  const targetUrl = isProfile
    ? profileUrlFor(source.handle)
    : isSearch
      ? twitterSearchUrl(source.query)
      : HOME_URL;
  const label = isProfile
    ? `profile @${source.handle.replace(/^@/, '')}${source.early ? ' (early)' : ''}`
    : isSearch
      ? `search "${source.query}"`
      : 'home';

  // What to do. Home mirrors the home-feed toggles; a profile visit always Likes
  // (and mirrors the other content toggles) but never Follows the single author.
  // A search feed has its OWN toggles now (updateplan 6.7 — D8) — it used to
  // silently mirror home-feed toggles, so a query added with home engagement
  // off just never did anything, with no card explaining why.
  const sf = settings.searchFeed;
  const doLike = isProfile ? true : isSearch ? sf.like : hf.like;
  const doComment = isSearch ? sf.comment : hf.comment;
  const doFollow = isProfile ? false : isSearch ? sf.follow : hf.follow;
  const doBookmark = isSearch ? sf.bookmark : hf.bookmark;
  const doRepost = isSearch ? sf.repost : hf.repost;
  const doQuote = isSearch ? sf.quote : hf.quote;
  // On a profile the user chose this creator, and a search query IS the filter —
  // so neither needs the home-feed keywords. The blocklist applies to all three.
  const keywords = isProfile || isSearch ? [] : hf.keywords;
  // Profiles and the search Latest tab are both reverse-chronological: once we
  // pass a run of older-than-fresh posts there's nothing newer below, so stop.
  // 0 = never (the home feed is ranked, not chronological).
  const stopAfterStaleRun = isProfile || isSearch ? 8 : 0;
  // An early-reply visit only cares about what was posted in the last few hours —
  // that's what makes the reply early rather than just eventual.
  const freshnessHours = isProfile && source.early ? EARLY_FRESH_HOURS : FRESH_WINDOW_HOURS;

  const auth = await getAuth();
  const pro = isPro(auth?.user.subscriptionStatus ?? 'free');

  const counters = await ensureToday(settings);
  const c = counters[platform];
  // Search feeds draw from their OWN budget (updateplan 6.7 — D8) — computed
  // from `searchCap`/`searchByActionType` rather than the shared daily ones,
  // so a home-feed session that has already spent today's comments can't
  // starve a search feed of its share, and vice versa.
  const remaining = (action: ActionType): number => {
    if (!c) return 0;
    if (isSearch) {
      const searchCaps: Record<ActionType, number> = {
        like: c.searchCap.likesPerDay,
        comment: c.searchCap.commentsPerDay,
        follow: c.searchCap.followsPerDay,
        bookmark: c.searchCap.bookmarksPerDay,
        repost: c.searchCap.repostsPerDay,
        quote: c.searchCap.quotesPerDay,
      };
      return Math.max(0, searchCaps[action] - c.searchByActionType[action]);
    }
    const caps: Record<ActionType, number> = {
      like: c.effectiveCap.likesPerDay,
      comment: c.effectiveCap.commentsPerDay,
      follow: c.effectiveCap.followsPerDay,
      bookmark: c.effectiveCap.bookmarksPerDay,
      repost: c.effectiveCap.repostsPerDay,
      quote: c.effectiveCap.quotesPerDay,
    };
    return Math.max(0, caps[action] - c.byActionType[action]);
  };

  // ONE continuous session keeps a single tab open and acts until the user's
  // chosen session length elapses, the daily caps run out, or they hit Pause —
  // instead of 4-minute tabs churning open and closed. Daily caps (age +
  // variance) stay the real ceiling and the random per-action delays pace it,
  // so we hand the content script the FULL remaining daily budget, not a slice.
  const maxLikes = doLike ? remaining('like') : 0;
  const maxFollows = doFollow ? remaining('follow') : 0;
  // With approval on, a "reply" costs a model call and a queue slot rather than
  // a post — so the session's drafting budget is ALSO bounded by the room left
  // in the review queue. Without this we'd pay to generate drafts the queue
  // would refuse, and drafting far past the daily cap would leave the user a
  // backlog they can't post today anyway.
  const queueSpace = settings.replyApproval ? await pendingReplySpace() : Number.MAX_SAFE_INTEGER;
  const maxComments = doComment ? Math.min(remaining('comment'), queueSpace) : 0;
  const maxBookmarks = doBookmark ? remaining('bookmark') : 0;
  const maxReposts = doRepost ? remaining('repost') : 0;
  const maxQuotes = doQuote ? remaining('quote') : 0;
  const anyActionEnabled = doLike || doComment || doFollow || doBookmark || doRepost || doQuote;

  // Wall-clock budget for this tab = whatever is left of the active session,
  // minus a small buffer so the tab finishes and closes itself a beat BEFORE
  // the scheduler's session auto-pause tick fires (clean teardown, no SW race).
  const sched = await getSchedulerState();
  const sessionStartedAt = sched.activeSince ?? Date.now();
  const sessionMs = Math.max(1, settings.sessionMinutes) * 60_000;
  const SESSION_END_BUFFER_MS = 15_000;
  const maxRunMs = Math.max(
    30_000,
    sessionMs - (Date.now() - sessionStartedAt) - SESSION_END_BUFFER_MS,
  );
  // The only free-tier limit: 50 actions per month (likes + replies + follows
  // combined). Pro is uncapped. Every feature works for both.
  const monthlyLeft = pro
    ? Number.MAX_SAFE_INTEGER
    : Math.max(0, FREE_TIER.monthlyActions - monthlyActionsUsed(auth?.user));
  const totalBudget = Math.min(
    monthlyLeft,
    maxLikes + maxComments + maxFollows + maxBookmarks + maxReposts + maxQuotes,
  );

  // Pre-flight: if a run can't do anything, say WHY in Diagnostics rather than
  // opening a tab that silently sits there (no scroll, no actions, no error).
  // These are the usual "nothing happened" causes.
  if (!anyActionEnabled) {
    await appendDiagnostic({
      kind: 'selector_miss',
      context: `${platform}:${label}`,
      detail: 'No actions enabled — turn on an action in Home feed autopilot.',
    });
    return { success: true, errorMessage: `${label}: no actions enabled` };
  }
  if (totalBudget === 0) {
    const detail =
      !pro && monthlyLeft === 0
        ? `Free plan: ${FREE_TIER.monthlyActions} actions/month used. Upgrade to Pro to keep going.`
        : 'Daily caps already reached for every enabled action — resets at your local midnight.';
    await appendDiagnostic({ kind: 'rate_limited', context: `${platform}:${label}`, detail });
    return { success: true, errorMessage: `${label}: ${detail}` };
  }

  // Surface *why* auto-reply won't happen so it shows in Diagnostics.
  if (hf.comment && maxComments === 0) {
    await appendDiagnostic({
      kind: 'rate_limited',
      context: `${platform}:comment`,
      detail:
        settings.replyApproval && queueSpace === 0
          ? 'Review queue is full — approve or skip a few replies to free up room.'
          : 'Daily reply cap reached for today.',
    });
  }

  // Skip posts we've already replied to / quoted (recent slice is enough).
  const prefix = `${platform}:`;
  const stripPrefix = (map: Record<string, number>): string[] =>
    Object.keys(map)
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length))
      .slice(0, 500);
  // Posts we've already replied to, plus any whose draft is sitting in the
  // review queue — re-drafting a reply the user hasn't answered yet would pay
  // for the same post twice and clutter the queue with duplicates.
  const skipCommentIds = [
    ...new Set([...stripPrefix(await getCommentedPosts()), ...stripPrefix(await getDraftedPosts())]),
  ].slice(0, 500);
  const skipQuoteIds = stripPrefix(await getQuotedPosts());

  // Bare, lower-cased handles for the two cross-cutting checks that used to be
  // honored in only ONE follow path: `targetHandles` relaxes relevance for a
  // watched creator's thin-caption media post (6.4 — D4/D5), and `whitelist`
  // is now checked in the inline follow gate too, not just the standalone
  // follow-list runner (6.6 — D7).
  const targetHandles = settings.targetCreators
    .filter((t) => t.platform === platform)
    .map((t) => t.handle.replace(/^@/, '').toLowerCase());
  const whitelistHandles = settings.whitelist
    .filter((w) => w.platform === platform)
    .map((w) => w.handle.replace(/^@/, '').toLowerCase());

  console.log(
    `[casper] ${label} ${platform}: opening tab — like=${doLike} comment=${doComment} ` +
      `follow=${doFollow} bookmark=${doBookmark} repost=${doRepost} quote=${doQuote} ` +
      `budget=${totalBudget} caps(L${maxLikes}/C${maxComments}/F${maxFollows}/B${maxBookmarks}/R${maxReposts}/Q${maxQuotes}) ` +
      `runMs=${maxRunMs} keywords=[${keywords.join(',')}]`,
  );
  let resp;
  try {
    resp = await driveTab(
      targetUrl,
      {
        type: 'RUN_HOME',
        payload: {
          platform,
          like: doLike,
          comment: doComment,
          follow: doFollow,
          bookmark: doBookmark,
          repost: doRepost,
          quote: doQuote,
          keywords,
          excludeKeywords: hf.excludeKeywords,
          targetHandles,
          whitelist: whitelistHandles,
          isSearchFeed: isSearch,
          interactive: settings.interactiveMode !== false,
          replyApproval: settings.replyApproval !== false,
          skipReplies: settings.skipReplies !== false,
          freshnessHours,
          maxLikes,
          maxComments,
          maxFollows,
          maxBookmarks,
          maxReposts,
          maxQuotes,
          totalBudget,
          maxRunMs,
          stopAfterStaleRun,
          skipCommentIds,
          skipQuoteIds,
          minDelayMs: actionDelayFor(settings).min,
          maxDelayMs: actionDelayFor(settings).max,
        },
      },
      { settleMs: 3_500 },
    );
  } catch (err) {
    console.warn(`[casper] ${label} ${platform}: tab driver failed —`, err);
    return {
      success: false,
      health: 'degraded',
      errorMessage: err instanceof Error ? err.message : 'tab driver failed',
    };
  }

  if (resp.type !== 'HOME_AUTOPILOT_RESULT') {
    console.warn(`[casper] ${label} ${platform}: unexpected response`, resp);
    return {
      success: false,
      health: 'degraded',
      errorMessage: resp.type === 'ERROR' ? resp.payload.message : 'unexpected home response',
    };
  }

  const { liked, commented, queued, followed, bookmarked, reposted, quoted, scanned } =
    resp.payload;
  console.log(
    `[casper] ${label} ${platform}: result — scanned=${scanned} liked=${liked.length} ` +
      `commented=${commented.length} queued=${queued.length} followed=${followed.length} ` +
      `bookmarked=${bookmarked.length} ` +
      `reposted=${reposted.length} quoted=${quoted.length}` +
      (resp.payload.commentError ? ` commentError="${resp.payload.commentError}"` : ''),
  );
  // DOM selector probe — logged to the (clean) SW console always; folded into
  // the Diagnostics entry below when a run does nothing.
  if (resp.payload.debug) {
    console.log(`[casper] ${label} ${platform}: dom probe ${resp.payload.debug}`);
  }
  // Every action was counted, logged, de-duped, and monthly-bumped LIVE during
  // the session — the content script fires a RECORD_ACTION message per action
  // (handled in the background) so the dashboard updates as it goes, not only
  // when the (possibly hour-long) session ends. Here we just summarize.
  const performed =
    liked.length +
    commented.length +
    queued.length +
    followed.length +
    bookmarked.length +
    reposted.length +
    quoted.length;

  // If replies were attempted but none landed, record the reason for the user.
  if (resp.payload.commentError && commented.length === 0) {
    await appendDiagnostic({
      kind: 'network_error',
      context: `${platform}:comment`,
      detail: resp.payload.commentError,
    });
  }

  // Record scan time so the refill loop paces re-scans. Home keys on the feed;
  // a profile keys on its handle (matches the refill loop's per-target key).
  const state = await getTargetState();
  if (isProfile) {
    // Early visits keep their OWN clock. Sharing the normal key would let the
    // fast rotation keep resetting it, so the 6-hourly deep sweep (which uses
    // the full 48h freshness window) would never come due again.
    const handleKey = `${platform}:${source.handle.replace(/^@/, '')}`;
    const key = source.early ? `early:${handleKey}` : handleKey;
    state[key] = { ...(state[key] ?? { lastScannedAt: 0 }), lastScannedAt: Date.now() };
  } else if (isSearch) {
    const key = `search:${source.query}`;
    state[key] = { ...(state[key] ?? { lastScannedAt: 0 }), lastSearchScanAt: Date.now() };
  } else {
    const key = `home:${platform}`;
    state[key] = { ...(state[key] ?? { lastScannedAt: 0 }), lastHomeScanAt: Date.now() };
  }
  await setTargetState(state);

  // Surface a 0-action pass in Diagnostics so selector/feed problems are
  // visible: "saw posts but couldn't act" points at action selectors, while
  // "0 posts" points at the feed not rendering / post-container selector.
  if (performed === 0) {
    const reason =
      scanned === 0
        ? `No posts detected on ${label}.`
        : `Saw ${scanned} posts but completed no actions.`;
    await appendDiagnostic({
      kind: 'selector_miss',
      context: `${platform}:${label}`,
      detail: resp.payload.debug ? `${reason} probe=${resp.payload.debug}` : reason,
    });
  }

  return {
    success: true,
    // Zero posts seen means we never got a timeline — signed out, or the post
    // selector broke. Seeing posts and acting on none is just a quiet feed.
    health: scanned === 0 ? 'degraded' : 'ok',
    // What the 'nothing-matched' card counts: posts read, and how many of them
    // were worth doing something about.
    scanned,
    acted: performed,
    errorMessage:
      performed === 0
        ? `${label}: no actions (scanned ${scanned})`
        : `${label}: ${liked.length} likes · ${commented.length} replies · ` +
          (queued.length > 0 ? `${queued.length} awaiting review · ` : '') +
          `${followed.length} follows · ${bookmarked.length} bookmarks · ` +
          `${reposted.length} reposts · ${quoted.length} quotes`,
  };
};

/** Home-feed autopilot — runs the inline single-tab session on the home feed. */
const executeHomeScan = async (task: QueuedTask): Promise<ExecutorResult> =>
  runInlineAutopilot(task, { kind: 'home' });

type OwnHandleOutcome =
  | { kind: 'ok'; handle: string }
  /** `recoverable` = expected condition (signed out), not a task failure. */
  | { kind: 'error'; message: string; recoverable: boolean };

/**
 * The signed-in user's @handle — cached after the first detection, otherwise
 * read once off x.com. Several flows need it (follow-back, the growth scan) and
 * they all want the same diagnostic when the user simply isn't signed in.
 */
const ensureOwnHandle = async (context: string): Promise<OwnHandleOutcome> => {
  const cached = await getOwnHandle();
  if (cached) return { kind: 'ok', handle: cached };

  let detect;
  try {
    detect = await driveTab(HOME_URL, { type: 'GET_OWN_HANDLE', payload: {} }, { settleMs: 3_000 });
  } catch (err) {
    return {
      kind: 'error',
      message: err instanceof Error ? err.message : 'tab driver failed',
      recoverable: false,
    };
  }
  if (detect.type === 'OWN_HANDLE_RESULT' && detect.payload.handle) {
    await setOwnHandle(detect.payload.handle);
    return { kind: 'ok', handle: detect.payload.handle };
  }
  await appendDiagnostic({
    kind: 'selector_miss',
    context,
    detail: 'Could not detect your @handle on x.com — are you signed in?',
  });
  return { kind: 'error', message: 'could not detect your @handle', recoverable: true };
};

/**
 * Growth scoreboard — the once-a-day read of what the automation actually GOT.
 *
 * Three looks, no clicks: the profile header (follower counters), the user's own
 * "Posts & replies" timeline (how each reply performed), and a sample of their
 * recent followers (how many were people Ghostly followed first). Because it
 * only reads, it costs no daily cap and no free-tier allowance — it's a 'scan'
 * task, so the scheduler never counts it.
 *
 * Partial failure is fine and expected: if the outcome sweep breaks we still
 * record the follower point, because the sparkline is the headline number.
 */
const executeGrowthScan = async (): Promise<ExecutorResult> => {
  const own = await ensureOwnHandle('twitter:growth');
  if (own.kind === 'error') {
    return { success: own.recoverable, errorMessage: `growth: ${own.message}` };
  }
  const handle = own.handle;
  const settings = await getSettings();
  const today = localDate(new Date(), settings.timezone);

  // 1. Follower counters off the profile header.
  let stats;
  try {
    const resp = await driveTab(
      profileUrlFor(handle),
      { type: 'READ_PROFILE_STATS', payload: {} },
      { settleMs: 3_000, forceBackground: true },
    );
    stats = resp.type === 'PROFILE_STATS_RESULT' ? resp.payload.stats : null;
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : 'tab driver failed',
    };
  }
  if (!stats) {
    await appendDiagnostic({
      kind: 'selector_miss',
      context: 'twitter:growth',
      detail: `Could not read the follower counts on @${handle}'s profile.`,
    });
    return { success: false, errorMessage: 'growth: profile counters not found' };
  }

  // 2. How many of our recent followers are people WE followed first. Only
  //    worth a tab when we've actually followed someone.
  let followedBack: number | null = null;
  let followedBackSample: number | null = null;
  const followedMap = await getFollowedHandles();
  const followedSet = new Set(
    Object.keys(followedMap)
      .filter((k) => k.startsWith('twitter:'))
      .map((k) => k.slice('twitter:'.length)),
  );
  if (followedSet.size > 0) {
    try {
      const resp = await driveTab(
        followersUrlFor(handle),
        { type: 'SCAN_FOLLOWERS', payload: { handle, max: 150 } },
        { settleMs: 3_500, forceBackground: true },
      );
      if (resp.type === 'FOLLOWERS_RESULT') {
        const sample = resp.payload.followers;
        followedBackSample = sample.length;
        followedBack = sample.filter((f) =>
          followedSet.has(f.handle.replace(/^@/, '').toLowerCase()),
        ).length;
      }
    } catch (err) {
      console.warn('[casper] growth: follower sample failed —', err);
    }
  }

  // 3. Per-post results from our own Posts & replies timeline.
  let outcomes: ScrapedOutcome[] = [];
  try {
    const resp = await driveTab(
      `https://x.com/${encodeURIComponent(handle)}/with_replies`,
      { type: 'COLLECT_OWN_POSTS', payload: { handle, max: GROWTH_LIMITS.maxOutcomesPerBatch } },
      { settleMs: 3_500, forceBackground: true },
    );
    if (resp.type === 'OWN_POSTS_RESULT') outcomes = resp.payload.outcomes;
  } catch (err) {
    console.warn('[casper] growth: outcome sweep failed —', err);
  }

  // Keep a local copy on the way past (updateplan 3.1). The best-time model
  // needs the whole history in the extension, and this is the only place it
  // flows through — merged by tweetId, so a re-scan updates numbers that have
  // matured rather than duplicating the post.
  if (outcomes.length > 0) {
    await mergePostOutcomes(outcomes);
  }

  // Upload. The snapshot is the point of the run, so a failure there fails the
  // task; outcomes are a bonus and only get a console warning.
  const snapResp = await apiFetch('/api/growth/snapshot', {
    method: 'POST',
    body: {
      date: today,
      followers: stats.followers,
      following: stats.following,
      posts: stats.posts,
      ...(followedBack !== null ? { followedBack, followedBackSample } : {}),
    },
  });
  if (!snapResp.ok) {
    return { success: false, errorMessage: `growth: ${snapResp.error.message}` };
  }

  if (outcomes.length > 0) {
    const outResp = await apiFetch('/api/growth/outcomes', {
      method: 'POST',
      body: { outcomes: outcomes.slice(0, GROWTH_LIMITS.maxOutcomesPerBatch) },
    });
    if (!outResp.ok) console.warn('[casper] growth: outcome upload failed —', outResp.error.message);
  }

  // Pace the next run (the refill loop reads this key).
  const state = await getTargetState();
  state['growth:twitter'] = {
    ...(state['growth:twitter'] ?? { lastScannedAt: 0 }),
    lastGrowthScanAt: Date.now(),
  };
  await setTargetState(state);

  console.log(
    `[casper] growth: ${stats.followers} followers, ${outcomes.length} posts measured` +
      (followedBack !== null ? `, ${followedBack}/${followedBackSample} followed back` : ''),
  );
  return {
    success: true,
    errorMessage: `growth: ${stats.followers} followers · ${outcomes.length} posts measured`,
  };
};

/**
 * Auto follow-back — open the user's own followers list and follow back people
 * who aren't followed yet. Detects the user's @handle once (cached), then drives
 * a tab to their followers page; the content script follows back inline and
 * records each one live (RECORD_ACTION → caps + monthly count + log).
 */
const runFollowBack = async (task: QueuedTask): Promise<ExecutorResult> => {
  const own = await ensureOwnHandle('twitter:follow-back');
  if (own.kind === 'error') {
    return { success: own.recoverable, errorMessage: `follow-back: ${own.message}` };
  }
  const handle = own.handle;

  const outcome = await runInlineFollowList(task, `https://x.com/${handle}/followers`);

  // Pace follow-back runs.
  const state = await getTargetState();
  state['followback:twitter'] = {
    ...(state['followback:twitter'] ?? { lastScannedAt: 0 }),
    lastFollowScanAt: Date.now(),
  };
  await setTargetState(state);

  return followOutcomeResult(outcome, 'follow-back');
};

/** Mention articles read per scan. The tab is doing nothing else while we look. */
const MENTIONS_SCAN_MAX = 20;
/** Drafts requested per scan — bounds the OpenAI + moderation cost of a burst. */
const MENTIONS_DRAFT_BUDGET = 3;
/** Fresh profile visits per scan, for candidates whose follower count isn't
 *  cached — bounds tab churn when several strangers mention the user at once. */
const MENTIONS_FOLLOWER_LOOKUP_MAX = 3;

/** A real follower-count read, cached so a repeat mention from the same person
 *  doesn't cost another profile visit for a day. */
const lookupFollowerCount = async (handle: string): Promise<number | null> => {
  const cached = await getCachedFollowerCount(handle);
  if (cached !== null) return cached;
  try {
    const resp = await driveTab(
      profileUrlFor(handle),
      { type: 'READ_PROFILE_STATS', payload: {} },
      { settleMs: 2_500, forceBackground: true },
    );
    const followers = resp.type === 'PROFILE_STATS_RESULT' ? (resp.payload.stats?.followers ?? null) : null;
    if (followers !== null) await setCachedFollowerCount(handle, followers);
    return followers;
  } catch {
    return null;
  }
};

/**
 * Read the notifications/mentions tab and draft replies (updateplan 4.1/4.2).
 *
 * The highest-value, lowest-risk automation this product doesn't have (D15):
 * answering your own mentions never touches anyone else's timeline, so it runs
 * regardless of whatever the feed-engagement settings say. What it produces —
 * either a queued draft or a normal 'comment' task — is exactly what the home
 * feed already produces, so posting one costs the same cap and leaves the same
 * action-log entry as any other reply. Never a second, looser path to publish
 * under the user's name.
 */
const executeMentionsScan = async (): Promise<ExecutorResult> => {
  const settings = await getSettings();
  if (!settings.mentions.enabled) {
    return { success: true, errorMessage: 'mentions: disabled', scanned: 0, acted: 0 };
  }

  const ownHandle = await getOwnHandle();

  let resp;
  try {
    resp = await driveTab(
      MENTIONS_URL,
      { type: 'SCAN_MENTIONS', payload: { max: MENTIONS_SCAN_MAX, ownHandle } },
      { settleMs: 3_000, forceBackground: true },
    );
  } catch (err) {
    return {
      success: false,
      health: 'degraded',
      errorMessage: err instanceof Error ? err.message : 'tab driver failed',
    };
  }
  if (resp.type !== 'MENTIONS_RESULT') {
    return {
      success: false,
      health: 'degraded',
      errorMessage: resp.type === 'ERROR' ? resp.payload.message : 'unexpected mentions response',
    };
  }

  const raw = resp.payload.mentions;
  // Zero mentions read is either a quiet inbox or a broken selector, same as
  // any other scan — 'ok' either way; there's nothing more we can tell apart
  // from here, and a quiet inbox is the common case for most accounts.
  if (raw.length === 0) return { success: true, health: 'ok', scanned: 0, acted: 0 };

  // Drop anything too short to answer, and anything already drafted or already
  // replied to — the persistence side of "never drafted twice".
  const undrafted: typeof raw = [];
  for (const m of raw) {
    if (m.text.length < MIN_REPLY_POST_CHARS) continue;
    if (await isAlreadyDrafted('twitter', m.postId)) continue;
    if (await isAlreadyCommented('twitter', m.postId)) continue;
    undrafted.push(m);
  }
  if (undrafted.length === 0) return { success: true, health: 'ok', scanned: raw.length, acted: 0 };

  let candidates: MentionCandidate[] = await Promise.all(
    undrafted.map(async (m) => ({
      postId: m.postId,
      postUrl: m.postUrl,
      authorHandle: m.authorHandle,
      text: m.text,
      publishedAt: m.publishedAt,
      type: classifyMention({
        text: m.text,
        ownHandle,
        replyingToHandles: m.replyingToHandles,
        quotedAuthorHandle: m.quotedAuthorHandle,
      }),
      authorFollowers: m.authorHandle ? await getCachedFollowerCount(m.authorHandle) : null,
    })),
  );

  // Provisional rank on what we already know, then spend a handful of real
  // profile visits refining the front of the queue — not every mention, so a
  // burst of replies-to-a-viral-post can't spawn a burst of profile visits.
  const now = Date.now();
  const provisional = rankMentions(candidates, now);
  const toLookUp = provisional
    .filter((c) => c.authorFollowers === null && c.authorHandle)
    .slice(0, MENTIONS_FOLLOWER_LOOKUP_MAX);
  if (toLookUp.length > 0) {
    const resolved = new Map<string, number | null>();
    for (const c of toLookUp) {
      resolved.set(c.postId, await lookupFollowerCount(c.authorHandle as string));
    }
    candidates = candidates.map((c) =>
      resolved.has(c.postId) ? { ...c, authorFollowers: resolved.get(c.postId) ?? null } : c,
    );
  }

  const ranked = rankMentions(candidates, now).slice(0, MENTIONS_DRAFT_BUDGET);
  const trusted = isTrusted(settings.trust);
  let acted = 0;

  for (const cand of ranked) {
    const draft = await requestCommentDraft({
      platform: 'twitter',
      postText: cand.text,
      postUrl: cand.postUrl,
      ...(cand.type === 'reply-to-your-post'
        ? (() => {
            const source = undrafted.find((m) => m.postId === cand.postId);
            return source?.parentOwnText ? { threadContext: source.parentOwnText } : {};
          })()
        : {}),
    });
    // Mark it handled regardless of outcome — a generation failure isn't worth
    // retrying every ~10 minutes forever; the next scan will find fresh mentions.
    await markDrafted('twitter', cand.postId);
    if (!draft.ok) continue;

    if (!settings.replyApproval || trusted) {
      // Exactly the same 'comment' task type the feed uses — same caps, same
      // pacing, same dedupe, same action-log entry.
      await enqueue('twitter', 'comment', {
        postUrl: cand.postUrl,
        postId: cand.postId,
        commentText: draft.data.draftText,
        draftId: draft.data.id,
      });
    } else {
      await queuePendingReply({
        id: draft.data.id,
        platform: 'twitter',
        postId: cand.postId,
        postUrl: cand.postUrl,
        postText: cand.text.slice(0, 1_000),
        authorHandle: cand.authorHandle,
        draftText: draft.data.draftText,
        createdAt: Date.now(),
      });
      // "Want me to answer?" (4.3) only makes sense for a draft that's actually
      // waiting on the user — one that auto-published already has its answer.
      void maybeNotifyBigReply({
        authorHandle: cand.authorHandle,
        authorFollowers: cand.authorFollowers,
        postUrl: cand.postUrl,
      });
    }
    acted++;
  }

  return { success: true, health: 'ok', scanned: raw.length, acted };
};

export const executeTask = async (task: QueuedTask): Promise<ExecutorResult> => {
  // Twitter/X only. Any stray non-Twitter task (e.g. left in the queue from a
  // previous build) completes as a no-op so it never opens a tab or retries.
  if (task.platform !== 'twitter') {
    return { success: true, errorMessage: 'LinkedIn automation removed' };
  }
  switch (task.taskType) {
    case 'like':
      return executeLike(task);
    case 'scan-profile-likes':
      return executeScan(task);
    case 'scan-profile-followers':
      return executeFollowScan(task);
    case 'scan-home-feed':
      return executeHomeScan(task);
    case 'scan-followback':
      return runFollowBack(task);
    case 'scan-growth':
      return executeGrowthScan();
    case 'scan-search':
      return executeSearchScan(task);
    case 'scan-mentions':
      return executeMentionsScan();
    case 'comment':
      return executeComment(task);
    case 'follow':
      return executeFollow(task);
    default:
      // bookmark / repost / quote happen inline in the home autopilot — they're
      // never enqueued as standalone tasks, so this is a defensive no-op.
      return { success: true, errorMessage: `${task.taskType}: inline-only` };
  }
};
