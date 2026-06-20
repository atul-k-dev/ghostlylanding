/**
 * Task executor — real platform dispatch for M4+.
 *
 * Each queued task is one of:
 *   - 'like'  (action) → opens post URL, content script clicks like
 *   - 'scan-profile-likes' (scan) → opens profile, collects fresh posts,
 *                                   enqueues `like` tasks for non-duplicates
 *   - 'comment', 'follow' → stub for now (M5/M6)
 */
import type { Platform } from '@casper/shared';
import { FREE_TIER, isPro } from '@casper/shared';
import type { ExecutorResult, QueuedTask } from './types.js';
import { driveTab } from '../platforms/common/tab-driver.js';
import { isFresh, FRESH_WINDOW_HOURS } from '../platforms/common/freshness.js';
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
  getCommentedPosts,
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

const executeScan = async (task: QueuedTask): Promise<ExecutorResult> => {
  const handle = task.payload.handle as string | undefined;
  if (!handle) return { success: false, errorMessage: 'missing handle' };

  const profileUrl = profileUrlFor(handle);

  let resp;
  try {
    resp = await driveTab(
      profileUrl,
      { type: 'SCAN_PROFILE', payload: { handle } },
      { settleMs: 3_500 },
    );
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : 'tab driver failed',
    };
  }

  if (resp.type !== 'SCAN_RESULT') {
    return {
      success: false,
      errorMessage: resp.type === 'ERROR' ? resp.payload.message : 'unexpected scan response',
    };
  }

  if (resp.payload.posts.length === 0) {
    await appendDiagnostic({
      kind: 'selector_miss',
      context: `${task.platform}:scan-profile-likes`,
      detail: `0 posts found on @${handle}`,
    });
  }
  const fresh = resp.payload.posts.filter((p) => isFresh(p.publishedAt));
  let enqueued = 0;
  for (const post of fresh) {
    const id = post.postId || extractPostId(task.platform, post.postUrl);
    if (id && (await isAlreadyLiked(task.platform, id))) continue;
    await enqueue(task.platform, 'like', {
      postUrl: post.postUrl,
      postId: id ?? null,
      sourceHandle: handle,
    });
    enqueued++;
  }

  // Record successful scan time for the auto-refill loop
  const state = await getTargetState();
  const key = `${task.platform}:${handle.replace(/^@/, '')}`;
  state[key] = { lastScannedAt: Date.now() };
  await setTargetState(state);

  return {
    success: true,
    errorMessage:
      enqueued === 0 ? `scan ok: 0 fresh posts (scanned ${resp.payload.posts.length})` : undefined,
  };
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

/**
 * Inline home-feed autopilot (Twitter/X) — ONE tab smoothly scrolls the
 * timeline and likes / comments / follows in place (no per-action tabs). Daily
 * caps, the free-tier lifetime cap, and the session length are enforced via
 * budgets passed to the content script; results come back here and are logged +
 * counted + de-duped.
 */
const runInlineHomeAutopilot = async (task: QueuedTask): Promise<ExecutorResult> => {
  const settings = await getSettings();
  const hf = settings.homeFeed;
  const platform = task.platform;

  const auth = await getAuth();
  const pro = isPro(auth?.user.subscriptionStatus ?? 'free');

  const counters = await ensureToday(settings);
  const c = counters[platform];
  const remaining = (action: 'like' | 'comment' | 'follow'): number => {
    if (!c) return 0;
    const cap =
      action === 'like'
        ? c.effectiveCap.likesPerDay
        : action === 'comment'
          ? c.effectiveCap.commentsPerDay
          : c.effectiveCap.followsPerDay;
    return Math.max(0, cap - c.byActionType[action]);
  };

  // ONE continuous session keeps a single tab open and acts until the user's
  // chosen session length elapses, the daily caps run out, or they hit Pause —
  // instead of 4-minute tabs churning open and closed. Daily caps (age +
  // variance) stay the real ceiling and the random per-action delays pace it,
  // so we hand the content script the FULL remaining daily budget, not a slice.
  const maxLikes = hf.like ? remaining('like') : 0;
  const maxFollows = hf.follow ? remaining('follow') : 0;
  const maxComments = hf.comment ? remaining('comment') : 0;

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
  // The only free-tier limit: a 30-action lifetime allowance (likes + replies +
  // follows combined). Pro is uncapped. Every feature works for both.
  const lifetimeLeft = pro
    ? Number.MAX_SAFE_INTEGER
    : Math.max(0, FREE_TIER.lifetimeActions - (auth?.user.lifetimeActionCount ?? 0));
  const totalBudget = Math.min(lifetimeLeft, maxLikes + maxComments + maxFollows);

  // Pre-flight: if a run can't do anything, say WHY in Diagnostics rather than
  // opening a tab that silently sits there (no scroll, no actions, no error).
  // These are the usual "nothing happened" causes.
  if (!hf.like && !hf.comment && !hf.follow) {
    await appendDiagnostic({
      kind: 'selector_miss',
      context: `${platform}:home`,
      detail: 'No actions enabled — turn on Like / Auto-reply / Follow in Home feed autopilot.',
    });
    return { success: true, errorMessage: 'home: no actions enabled' };
  }
  if (totalBudget === 0) {
    const detail =
      !pro && lifetimeLeft === 0
        ? `Free plan: ${FREE_TIER.lifetimeActions}-action lifetime allowance used. Upgrade to Pro to keep going.`
        : 'Daily caps already reached for every enabled action — resets at your local midnight.';
    await appendDiagnostic({ kind: 'rate_limited', context: `${platform}:home`, detail });
    return { success: true, errorMessage: `home: ${detail}` };
  }

  // Surface *why* auto-reply won't happen so it shows in Diagnostics.
  if (hf.comment && maxComments === 0) {
    await appendDiagnostic({
      kind: 'rate_limited',
      context: `${platform}:comment`,
      detail: 'Daily reply cap reached for today.',
    });
  }

  // Skip posts we've already replied to (recent slice is enough).
  const prefix = `${platform}:`;
  const commentedMap = await getCommentedPosts();
  const skipCommentIds = Object.keys(commentedMap)
    .filter((k) => k.startsWith(prefix))
    .map((k) => k.slice(prefix.length))
    .slice(0, 500);

  console.log(
    `[casper] home ${platform}: opening tab — like=${hf.like} comment=${hf.comment} ` +
      `follow=${hf.follow} budget=${totalBudget} caps(${maxLikes}/${maxComments}/${maxFollows}) ` +
      `runMs=${maxRunMs} keywords=[${hf.keywords.join(',')}]`,
  );
  let resp;
  try {
    resp = await driveTab(
      HOME_URL,
      {
        type: 'RUN_HOME',
        payload: {
          platform,
          like: hf.like,
          comment: hf.comment,
          follow: hf.follow,
          keywords: hf.keywords,
          freshnessHours: FRESH_WINDOW_HOURS,
          maxLikes,
          maxComments,
          maxFollows,
          totalBudget,
          maxRunMs,
          skipCommentIds,
          minDelayMs: 3_000,
          maxDelayMs: 7_000,
        },
      },
      { settleMs: 3_500 },
    );
  } catch (err) {
    console.warn(`[casper] home ${platform}: tab driver failed —`, err);
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : 'tab driver failed',
    };
  }

  if (resp.type !== 'HOME_AUTOPILOT_RESULT') {
    console.warn(`[casper] home ${platform}: unexpected response`, resp);
    return {
      success: false,
      errorMessage: resp.type === 'ERROR' ? resp.payload.message : 'unexpected home response',
    };
  }

  const { liked, commented, followed, scanned } = resp.payload;
  console.log(
    `[casper] home ${platform}: result — scanned=${scanned} liked=${liked.length} ` +
      `commented=${commented.length} followed=${followed.length}` +
      (resp.payload.commentError ? ` commentError="${resp.payload.commentError}"` : ''),
  );
  // DOM selector probe — logged to the (clean) SW console always; folded into
  // the Diagnostics entry below when a run does nothing.
  if (resp.payload.debug) {
    console.log(`[casper] home ${platform}: dom probe ${resp.payload.debug}`);
  }
  // Each like/comment/follow was counted, logged, de-duped, and lifetime-bumped
  // LIVE during the session — the content script fires a RECORD_ACTION message
  // per action (handled in the background) so the dashboard updates as it goes,
  // not only when the (possibly hour-long) session ends. Here we just summarize.
  const performed = liked.length + commented.length + followed.length;

  // If replies were attempted but none landed, record the reason for the user.
  if (resp.payload.commentError && commented.length === 0) {
    await appendDiagnostic({
      kind: 'network_error',
      context: `${platform}:comment`,
      detail: resp.payload.commentError,
    });
  }

  // Record scan time so the refill loop paces home scans.
  const state = await getTargetState();
  const key = `home:${platform}`;
  state[key] = { ...(state[key] ?? { lastScannedAt: 0 }), lastHomeScanAt: Date.now() };
  await setTargetState(state);

  // Surface a 0-action pass in Diagnostics so selector/feed problems are
  // visible: "saw posts but couldn't act" points at action selectors, while
  // "0 posts" points at the feed not rendering / post-container selector.
  if (performed === 0) {
    const reason =
      scanned === 0
        ? 'No posts detected in the feed.'
        : `Saw ${scanned} posts but completed no actions.`;
    await appendDiagnostic({
      kind: 'selector_miss',
      context: `${platform}:home`,
      detail: resp.payload.debug ? `${reason} probe=${resp.payload.debug}` : reason,
    });
  }

  return {
    success: true,
    errorMessage:
      performed === 0
        ? `home: no actions (scanned ${scanned})`
        : `home: ${liked.length} likes · ${commented.length} replies · ${followed.length} follows`,
  };
};

/** Home-feed autopilot — runs the inline single-tab session (see
 *  runInlineHomeAutopilot). */
const executeHomeScan = async (task: QueuedTask): Promise<ExecutorResult> =>
  runInlineHomeAutopilot(task);

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
    case 'comment':
      return executeComment(task);
    case 'follow':
      return executeFollow(task);
  }
};
