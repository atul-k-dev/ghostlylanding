import type { Platform, TonePreset } from './platform.js';

export type CommentDraftStatus = 'pending' | 'approved' | 'rejected' | 'posted' | 'failed';

export interface CommentDraft {
  id: string;
  userId: string;
  platform: Platform;
  postUrl: string;
  postTextHash: string;
  draftText: string;
  tone: TonePreset;
  status: CommentDraftStatus;
  createdAt: string;
  postedAt?: string;
}
