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
import type { ExecutorResult, QueuedTask } from './types.js';
import { driveTab } from '../platforms/common/tab-driver.js';
import { isFresh } from '../platforms/common/freshness.js';
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

const profileUrlFor = (platform: Platform, handle: string): string =>
  platform === 'twitter' ? twitterProfileUrl(handle) : linkedinProfileUrl(handle);

const followersUrlFor = (platform: Platform, handle: string): string =>
  platform === 'twitter' ? twitterFollowersUrl(handle) : linkedinFollowersUrl(handle);

const candidateProfileUrl = (platform: Platform, handle: string): string =>
  platform === 'twitter' ? twitterProfileUrl(handle) : linkedinProfileFromHandle(handle);

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

export const executeTask = async (task: QueuedTask): Promise<ExecutorResult> => {
  switch (task.taskType) {
    case 'like':
      return executeLike(task);
    case 'scan-profile-likes':
      return executeScan(task);
    case 'scan-profile-followers':
      return executeFollowScan(task);
    case 'comment':
      return executeComment(task);
    case 'follow':
      return executeFollow(task);
  }
};
