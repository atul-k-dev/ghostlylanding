/**
 * Task executor — real platform dispatch for M4+.
 *
 * Each queued task is one of:
 *   - 'like'  (action) → opens post URL, content script clicks like
 *   - 'scan-profile-likes' (scan) → opens profile, collects fresh posts,
 *                                   enqueues `like` tasks for non-duplicates
 *   - 'comment', 'follow' → stub for now (M5/M6)
 */
import type { ActionType, Platform } from '@casper/shared';
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
  getTargetState,
  setTargetState,
  getSettings,
  getSchedulerState,
  getAuth,
  getOwnHandle,
  setOwnHandle,
  getCommentedPosts,
  getQuotedPosts,
  appendDiagnostic,
} from '../lib/storage.js';
import {
  buildProfileUrl as twitterProfileUrl,
  buildFollowersUrl as twitterFollowersUrl,
} from '../platforms/twitter/selectors.js';
import { enqueue } from './queue.js';
import { apiFetch } from '../lib/api.js';
import { ensureToday } from './counters.js';

// Twitter/X is the only automated platform. (LinkedIn automation was removed.)
const profileUrlFor = (handle: string): string => twitterProfileUrl(handle);
const followersUrlFor = (handle: string): string => twitterFollowersUrl(handle);
const candidateProfileUrl = (handle: string): string => twitterProfileUrl(handle);
const HOME_URL = 'https://x.com/home';

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
  return runInlineAutopilot(task, { kind: 'profile', handle });
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

const inWhitelist = (
  whitelist: { platform: Platform; handle: string }[],
  platform: Platform,
  handle: string,
): boolean => {
  const target = handle.replace(/^@/, '').toLowerCase();
  return whitelist.some(
    (w) => w.platform === platform && w.handle.replace(/^@/, '').toLowerCase() === target,
  );
};

const executeFollowScan = async (task: QueuedTask): Promise<ExecutorResult> => {
  const handle = task.payload.handle as string | undefined;
  if (!handle) return { success: false, errorMessage: 'missing handle' };

  const url = followersUrlFor(handle);

  let resp;
  try {
    resp = await driveTab(
      url,
      { type: 'SCAN_FOLLOWERS', payload: { handle, max: 20 } },
      { settleMs: 3_500 },
    );
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : 'tab driver failed',
    };
  }

  if (resp.type !== 'FOLLOWERS_RESULT') {
    return {
      success: false,
      errorMessage:
        resp.type === 'ERROR' ? resp.payload.message : 'unexpected followers response',
    };
  }

  if (resp.payload.followers.length === 0) {
    await appendDiagnostic({
      kind: 'selector_miss',
      context: `${task.platform}:scan-profile-followers`,
      detail: `0 candidates on @${handle}`,
    });
  }
  const settings = await getSettings();
  let enqueued = 0;
  for (const candidate of resp.payload.followers) {
    if (inWhitelist(settings.whitelist, task.platform, candidate.handle)) continue;
    if (await isAlreadyFollowed(task.platform, candidate.handle)) continue;
    await enqueue(task.platform, 'follow', {
      handle: candidate.handle,
      profileUrl: candidate.profileUrl,
      sourceHandle: handle,
    });
    enqueued++;
  }

  const state = await getTargetState();
  const key = `${task.platform}:${handle.replace(/^@/, '')}`;
  state[key] = { ...(state[key] ?? { lastScannedAt: 0 }), lastFollowScanAt: Date.now() };
  await setTargetState(state);

  return {
    success: true,
    errorMessage:
      enqueued === 0
        ? `follow scan ok: 0 candidates (saw ${resp.payload.followers.length})`
        : undefined,
  };
};

const executeFollow = async (task: QueuedTask): Promise<ExecutorResult> => {
  const handle = task.payload.handle as string | undefined;
  const profileUrl =
    (task.payload.profileUrl as string | undefined) ??
    (handle ? candidateProfileUrl(handle) : undefined);
  if (!handle || !profileUrl) {
    return { success: false, errorMessage: 'missing handle/profileUrl' };
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
type AutopilotSource = { kind: 'home' } | { kind: 'profile'; handle: string };

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
  const targetUrl = isProfile ? profileUrlFor(source.handle) : HOME_URL;
  const label = isProfile ? `profile @${source.handle.replace(/^@/, '')}` : 'home';

  // What to do. Home mirrors the home-feed toggles; a profile visit always Likes
  // (and mirrors the other content toggles) but never Follows the single author.
  const doLike = isProfile ? true : hf.like;
  const doComment = hf.comment;
  const doFollow = isProfile ? false : hf.follow;
  const doBookmark = hf.bookmark;
  const doRepost = hf.repost;
  const doQuote = hf.quote;
  // On a profile the user already chose this creator → engage all their posts;
  // on home, filter by relevance. The blocklist applies either way.
  const keywords = isProfile ? [] : hf.keywords;
  // A profile is reverse-chronological: once we pass a run of older-than-fresh
  // posts we've left the fresh zone, so stop. 0 = never (home is infinite/fresh).
  const stopAfterStaleRun = isProfile ? 8 : 0;

  const auth = await getAuth();
  const pro = isPro(auth?.user.subscriptionStatus ?? 'free');

  const counters = await ensureToday(settings);
  const c = counters[platform];
  const remaining = (action: ActionType): number => {
    if (!c) return 0;
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
  const maxComments = doComment ? remaining('comment') : 0;
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
  // The only free-tier limit: 5 actions per month (likes + replies + follows
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
      detail: 'Daily reply cap reached for today.',
    });
  }

  // Skip posts we've already replied to / quoted (recent slice is enough).
  const prefix = `${platform}:`;
  const stripPrefix = (map: Record<string, number>): string[] =>
    Object.keys(map)
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length))
      .slice(0, 500);
  const skipCommentIds = stripPrefix(await getCommentedPosts());
  const skipQuoteIds = stripPrefix(await getQuotedPosts());

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
          freshnessHours: FRESH_WINDOW_HOURS,
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
          minDelayMs: 3_000,
          maxDelayMs: 7_000,
        },
      },
      { settleMs: 3_500 },
    );
  } catch (err) {
    console.warn(`[casper] ${label} ${platform}: tab driver failed —`, err);
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : 'tab driver failed',
    };
  }

  if (resp.type !== 'HOME_AUTOPILOT_RESULT') {
    console.warn(`[casper] ${label} ${platform}: unexpected response`, resp);
    return {
      success: false,
      errorMessage: resp.type === 'ERROR' ? resp.payload.message : 'unexpected home response',
    };
  }

  const { liked, commented, followed, bookmarked, reposted, quoted, scanned } = resp.payload;
  console.log(
    `[casper] ${label} ${platform}: result — scanned=${scanned} liked=${liked.length} ` +
      `commented=${commented.length} followed=${followed.length} bookmarked=${bookmarked.length} ` +
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
    const key = `${platform}:${source.handle.replace(/^@/, '')}`;
    state[key] = { ...(state[key] ?? { lastScannedAt: 0 }), lastScannedAt: Date.now() };
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
    errorMessage:
      performed === 0
        ? `${label}: no actions (scanned ${scanned})`
        : `${label}: ${liked.length} likes · ${commented.length} replies · ${followed.length} follows · ` +
          `${bookmarked.length} bookmarks · ${reposted.length} reposts · ${quoted.length} quotes`,
  };
};

/** Home-feed autopilot — runs the inline single-tab session on the home feed. */
const executeHomeScan = async (task: QueuedTask): Promise<ExecutorResult> =>
  runInlineAutopilot(task, { kind: 'home' });

/**
 * Auto follow-back — open the user's own followers list and follow back people
 * who aren't followed yet. Detects the user's @handle once (cached), then drives
 * a tab to their followers page; the content script follows back inline and
 * records each one live (RECORD_ACTION → caps + monthly count + log).
 */
const runFollowBack = async (task: QueuedTask): Promise<ExecutorResult> => {
  const platform = task.platform; // twitter only
  const settings = await getSettings();
  const auth = await getAuth();
  const pro = isPro(auth?.user.subscriptionStatus ?? 'free');
  const counters = await ensureToday(settings);
  const c = counters[platform];
  const remainingFollows = c ? Math.max(0, c.effectiveCap.followsPerDay - c.byActionType.follow) : 0;
  const monthlyLeft = pro
    ? Number.MAX_SAFE_INTEGER
    : Math.max(0, FREE_TIER.monthlyActions - monthlyActionsUsed(auth?.user));
  const max = Math.min(remainingFollows, monthlyLeft, 30);
  if (max <= 0) return { success: true, errorMessage: 'follow-back: no follow budget left' };

  // Find the user's own handle (cached, else detect from x.com once).
  let handle = await getOwnHandle();
  if (!handle) {
    let detect;
    try {
      detect = await driveTab(
        HOME_URL,
        { type: 'GET_OWN_HANDLE', payload: {} },
        { settleMs: 3_000 },
      );
    } catch (err) {
      return { success: false, errorMessage: err instanceof Error ? err.message : 'tab driver failed' };
    }
    if (detect.type === 'OWN_HANDLE_RESULT' && detect.payload.handle) {
      handle = detect.payload.handle;
      await setOwnHandle(handle);
    } else {
      await appendDiagnostic({
        kind: 'selector_miss',
        context: 'twitter:follow-back',
        detail: 'Could not detect your @handle on x.com — are you signed in?',
      });
      return { success: true, errorMessage: 'follow-back: could not detect your @handle' };
    }
  }

  const skipHandles = settings.whitelist
    .filter((w) => w.platform === 'twitter')
    .map((w) => w.handle.replace(/^@/, '').toLowerCase());

  let resp;
  try {
    resp = await driveTab(
      `https://x.com/${handle}/followers`,
      { type: 'FOLLOW_BACK', payload: { max, minDelayMs: 3_000, maxDelayMs: 7_000, skipHandles } },
      { settleMs: 3_500 },
    );
  } catch (err) {
    return { success: false, errorMessage: err instanceof Error ? err.message : 'tab driver failed' };
  }
  if (resp.type !== 'FOLLOW_BACK_RESULT') {
    return {
      success: false,
      errorMessage: resp.type === 'ERROR' ? resp.payload.message : 'unexpected follow-back response',
    };
  }
  const n = resp.payload.followed.length; // counted live via RECORD_ACTION

  // Pace follow-back runs.
  const state = await getTargetState();
  state['followback:twitter'] = {
    ...(state['followback:twitter'] ?? { lastScannedAt: 0 }),
    lastFollowScanAt: Date.now(),
  };
  await setTargetState(state);

  return {
    success: true,
    errorMessage: n === 0 ? 'follow-back: nobody new to follow' : `follow-back: ${n} followed`,
  };
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
