/**
 * The one function that asks the server to write a reply.
 *
 * Factored out in updateplan 4.2 so the mentions scan — which runs in the
 * service worker (`executor.ts`), not a content script — can draft a reply the
 * same way `DRAFT_COMMENT` already does for the content-script side, without a
 * second implementation of "read tone/length off settings, call the API" to
 * drift from the first.
 */
import type { ApiResponse, Platform, TonePreset, CommentLength } from '@casper/shared';
import { TONE_PRESETS, COMMENT_LENGTHS } from '@casper/shared';
import { apiFetch } from './api.js';
import { getSettings } from './storage.js';

export interface CommentDraftDoc {
  id: string;
  platform: Platform;
  postUrl: string;
  draftText: string;
  tone: TonePreset;
  status: 'pending' | 'approved' | 'rejected' | 'posted' | 'failed';
  createdAt: string;
  postedAt?: string | null;
  dedupe?: boolean;
}

export interface CommentDraftRequest {
  platform: Platform;
  postText: string;
  postUrl: string;
  /**
   * Extra context for a reply that is itself part of a thread (updateplan
   * 4.2) — the post it's answering, so the model can write in context instead
   * of cold. Omitted whenever the caller doesn't have it; a draft without
   * thread context is still a perfectly good reply, just a less-informed one.
   */
  threadContext?: string;
}

/**
 * Draft a reply through `/api/comments/generate` — reading tone and length off
 * the user's own settings, the same way for every caller.
 */
export const requestCommentDraft = async (
  req: CommentDraftRequest,
): Promise<ApiResponse<CommentDraftDoc>> => {
  const settings = await getSettings();
  const tone: TonePreset = TONE_PRESETS.includes(settings.tone) ? settings.tone : 'friendly';
  const length: CommentLength = COMMENT_LENGTHS.includes(settings.commentLength)
    ? settings.commentLength
    : 1;
  return apiFetch<CommentDraftDoc>('/api/comments/generate', {
    method: 'POST',
    body: {
      platform: req.platform,
      postText: req.postText,
      postUrl: req.postUrl,
      tone,
      length,
      ...(req.threadContext ? { threadContext: req.threadContext } : {}),
    },
  });
};
