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
  isAlreadyDrafted,
  markDrafted,
  getTargetState,
  setTargetState,
  getSettings,
  getAuth,
  setAuth,
  getCommentedPosts,
  appendDiagnostic,
} from '../lib/storage.js';
import {
  buildProfileUrl as twitterProfileUrl,
  buildFollowersUrl as twitterFollowersUrl,
} from '../platforms/twitter/selectors.js';
import {
  buildProfileFeedUrl as linkedinProfileUrl,
  buildFollowersUrl as linkedinFollowersUrl,
  buildProfileFromHandle as linkedinProfileFromHandle,
} from '../platforms/linkedin/selectors.js';
import { enqueue } from './queue.js';
import { apiFetch } from '../lib/api.js';
import { ensureToday, incrementCounter } from './counters.js';
import { appendActionLog } from './action-log.js';

const profileUrlFor = (platform: Platform, handle: string): string =>
  platform === 'twitter' ? twitterProfileUrl(handle) : linkedinProfileUrl(handle);

const followersUrlFor = (platform: Platform, handle: string): string =>
  platform === 'twitter' ? twitterFollowersUrl(handle) : linkedinFollowersUrl(handle);

const candidateProfileUrl = (platform: Platform, handle: string): string =>
  platform === 'twitter' ? twitterProfileUrl(handle) : linkedinProfileFromHandle(handle);

const homeUrlFor = (platform: Platform): string =>
  platform === 'twitter' ? 'https://x.com/home' : 'https://www.linkedin.com/feed/';

/** True if the post text matches the relevance keywords (empty = match all). */
const isRelevant = (text: string, keywords: string[]): boolean => {
  if (keywords.length === 0) return true;
  const hay = text.toLowerCase();
  return keywords.some((k) => {
    const needle = k.trim().toLowerCase();
    return needle.length > 0 && hay.includes(needle);
  });
};

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

  const profileUrl = profileUrlFor(task.platform, handle);

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

  const url = followersUrlFor(task.platform, handle);

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
    (handle ? candidateProfileUrl(task.platform, handle) : undefined);
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
 * Twitter inline home-feed autopilot — ONE tab smoothly scrolls the timeline
 * and likes / comments / follows in place (no per-action tabs). Daily caps and
 * the free-tier lifetime cap are enforced via budgets passed to the content
 * script; the results come back here and are logged + counted + de-duped.
 */
const runTwitterHomeAutopilot = async (task: QueuedTask): Promise<ExecutorResult> => {
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

  // Cap how much one session does so the tab stays open a sane amount of time
  // (the MV3 worker can't run forever); the next scan continues where this left.
  const maxLikes = hf.like ? Math.min(remaining('like'), 12) : 0;
  const maxFollows = hf.follow ? Math.min(remaining('follow'), 8) : 0;
  const maxComments = hf.comment ? Math.min(remaining('comment'), 4) : 0;
  // The only free-tier limit: a 30-action lifetime allowance (likes + replies +
  // follows combined). Pro is uncapped. Every feature works for both.
  const lifetimeLeft = pro
    ? Number.MAX_SAFE_INTEGER
    : Math.max(0, FREE_TIER.lifetimeActions - (auth?.user.lifetimeActionCount ?? 0));
  const totalBudget = Math.min(lifetimeLeft, maxLikes + maxComments + maxFollows);

  // Surface *why* auto-reply won't happen so it shows in Diagnostics.
  if (hf.comment && maxComments === 0) {
    await appendDiagnostic({
      kind: 'rate_limited',
      context: 'twitter:comment',
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

  let resp;
  try {
    resp = await driveTab(
      homeUrlFor(platform),
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
          skipCommentIds,
          minDelayMs: 3_000,
          maxDelayMs: 7_000,
        },
      },
      { settleMs: 3_500 },
    );
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : 'tab driver failed',
    };
  }

  if (resp.type !== 'HOME_AUTOPILOT_RESULT') {
    return {
      success: false,
      errorMessage: resp.type === 'ERROR' ? resp.payload.message : 'unexpected home response',
    };
  }

  const { liked, commented, followed, scanned } = resp.payload;
  const ts = (): string => new Date().toISOString();

  for (const p of liked) {
    if (p.postId) await markLiked(platform, p.postId);
    await appendActionLog({
      platform,
      actionType: 'like',
      targetUrl: p.postUrl,
      success: true,
      timestamp: ts(),
    });
    await incrementCounter(settings, platform, 'like');
  }
  for (const p of commented) {
    if (p.postId) await markCommented(platform, p.postId);
    if (p.draftId) await markDraft(p.draftId, 'posted');
    await appendActionLog({
      platform,
      actionType: 'comment',
      targetUrl: p.postUrl,
      success: true,
      timestamp: ts(),
    });
    await incrementCounter(settings, platform, 'comment');
  }
  for (const f of followed) {
    await markFollowed(platform, f.handle);
    await appendActionLog({
      platform,
      actionType: 'follow',
      targetUrl: f.profileUrl ?? `https://x.com/${f.handle}`,
      targetHandle: f.handle,
      success: true,
      timestamp: ts(),
    });
    await incrementCounter(settings, platform, 'follow');
  }

  // If replies were attempted but none landed, record the reason for the user.
  if (resp.payload.commentError && commented.length === 0) {
    await appendDiagnostic({
      kind: 'network_error',
      context: 'twitter:comment',
      detail: resp.payload.commentError,
    });
  }

  // Free tier: keep the local lifetime counter moving so the cap is enforced.
  const performed = liked.length + commented.length + followed.length;
  if (!pro && auth && performed > 0) {
    await setAuth({
      ...auth,
      user: { ...auth.user, lifetimeActionCount: (auth.user.lifetimeActionCount ?? 0) + performed },
    });
  }

  // Record scan time so the refill loop paces home scans.
  const state = await getTargetState();
  const key = `home:${platform}`;
  state[key] = { ...(state[key] ?? { lastScannedAt: 0 }), lastHomeScanAt: Date.now() };
  await setTargetState(state);

  return {
    success: true,
    errorMessage:
      performed === 0
        ? `home: no actions (scanned ${scanned})`
        : `home: ${liked.length} likes · ${commented.length} replies · ${followed.length} follows`,
  };
};

/**
 * Home-feed autopilot. Twitter runs the inline session above; LinkedIn still
 * uses the scan-then-enqueue flow below (separate action tabs).
 */
const executeHomeScan = async (task: QueuedTask): Promise<ExecutorResult> => {
  if (task.platform === 'twitter') return runTwitterHomeAutopilot(task);
  const settings = await getSettings();
  const hf = settings.homeFeed;

  let resp;
  try {
    resp = await driveTab(
      homeUrlFor(task.platform),
      { type: 'SCAN_HOME', payload: { max: 25 } },
      { settleMs: 3_500 },
    );
  } catch (err) {
    return {
      success: false,
      errorMessage: err instanceof Error ? err.message : 'tab driver failed',
    };
  }

  if (resp.type !== 'HOME_RESULT') {
    return {
      success: false,
      errorMessage: resp.type === 'ERROR' ? resp.payload.message : 'unexpected home response',
    };
  }

  if (resp.payload.posts.length === 0) {
    await appendDiagnostic({
      kind: 'selector_miss',
      context: `${task.platform}:scan-home-feed`,
      detail: '0 posts found on home feed',
    });
  }

  const fresh = resp.payload.posts.filter((p) => isFresh(p.publishedAt));
  let likes = 0;
  let follows = 0;
  let drafts = 0;

  for (const post of fresh) {
    if (!isRelevant(post.text ?? '', hf.keywords)) continue;
    const id = post.postId || extractPostId(task.platform, post.postUrl);

    // Like
    if (hf.like && id && !(await isAlreadyLiked(task.platform, id))) {
      await enqueue(task.platform, 'like', {
        postUrl: post.postUrl,
        postId: id,
        sourceHandle: post.authorHandle ?? 'home',
      });
      likes++;
    }

    // Auto-reply: generate a reply and enqueue it to post. The scheduler still
    // gates this per daily caps and the 30-action lifetime allowance.
    if (
      hf.comment &&
      id &&
      post.text &&
      !(await isAlreadyDrafted(task.platform, id)) &&
      !(await isAlreadyCommented(task.platform, id))
    ) {
      const tone = settings.tone;
      const draftResp = await apiFetch<{ id: string; draftText: string }>(
        `/api/comments/generate`,
        {
          method: 'POST',
          body: { platform: task.platform, postText: post.text, postUrl: post.postUrl, tone },
        },
      );
      if (draftResp.ok) {
        await markDrafted(task.platform, id);
        drafts++;
        await enqueue(task.platform, 'comment', {
          draftId: draftResp.data.id,
          postUrl: post.postUrl,
          commentText: draftResp.data.draftText,
          postId: id,
        });
      }
    }

    // Follow the author
    if (hf.follow && post.authorHandle) {
      const handle = post.authorHandle;
      if (
        !inWhitelist(settings.whitelist, task.platform, handle) &&
        !(await isAlreadyFollowed(task.platform, handle))
      ) {
        await enqueue(task.platform, 'follow', {
          handle,
          profileUrl: post.profileUrl ?? candidateProfileUrl(task.platform, handle),
          sourceHandle: 'home',
        });
        follows++;
      }
    }
  }

  // Record scan time so the refill loop paces home scans.
  const state = await getTargetState();
  const key = `home:${task.platform}`;
  state[key] = { ...(state[key] ?? { lastScannedAt: 0 }), lastHomeScanAt: Date.now() };
  await setTargetState(state);

  return {
    success: true,
    errorMessage:
      likes + follows + drafts === 0
        ? `home scan ok: no matches (saw ${resp.payload.posts.length})`
        : undefined,
  };
};

export const executeTask = async (task: QueuedTask): Promise<ExecutorResult> => {
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
