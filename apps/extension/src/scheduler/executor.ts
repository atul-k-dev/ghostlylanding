/**
 * Task executor — real platform dispatch for M4+.
 *
 * Each queued task is one of:
 *   - 'like'  (action) → opens post URL, content script clicks like
 *   - 'scan-profile-likes' (scan) → opens profile, collects fresh posts,
 *                                   enqueues `like` tasks for non-duplicates
 *   - 'comment', 'follow' → stub for now (M5/M6)
 */
import type { ActionLogInput, Platform } from '@casper/shared';
import type { ExecutorResult, QueuedTask } from './types.js';
import { driveTab } from '../platforms/common/tab-driver.js';
import { isFresh } from '../platforms/common/freshness.js';
import { extractPostId } from '../platforms/common/dedupe.js';
import { isAlreadyLiked, markLiked, getTargetState, setTargetState } from '../lib/storage.js';
import { buildProfileUrl as twitterProfileUrl } from '../platforms/twitter/selectors.js';
import { buildProfileFeedUrl as linkedinProfileUrl } from '../platforms/linkedin/selectors.js';
import { enqueue } from './queue.js';
import { randomInt } from './timegate.js';

const profileUrlFor = (platform: Platform, handle: string): string =>
  platform === 'twitter' ? twitterProfileUrl(handle) : linkedinProfileUrl(handle);

const stubAction = async (task: QueuedTask): Promise<ExecutorResult> => {
  await new Promise((r) => setTimeout(r, randomInt(800, 2_000)));
  const success = Math.random() > 0.1;
  const logEntry: ActionLogInput = {
    platform: task.platform,
    actionType: task.taskType as ActionLogInput['actionType'],
    targetUrl:
      (task.payload.targetUrl as string | undefined) ??
      `https://${task.platform === 'twitter' ? 'x.com' : 'linkedin.com'}/example/${task.id}`,
    success,
    ...(success ? {} : { errorMessage: 'stub: simulated failure' }),
    timestamp: new Date().toISOString(),
  };
  return { success, logEntry };
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

export const executeTask = async (task: QueuedTask): Promise<ExecutorResult> => {
  switch (task.taskType) {
    case 'like':
      return executeLike(task);
    case 'scan-profile-likes':
      return executeScan(task);
    case 'comment':
    case 'follow':
      return stubAction(task);
  }
};
