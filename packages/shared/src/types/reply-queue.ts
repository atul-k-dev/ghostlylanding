/**
 * Reply approval queue — the drafts waiting for the user to say yes.
 *
 * These live in the EXTENSION's local storage, not on the server. Reviewing a
 * reply means reading it next to the post it answers, and the server
 * deliberately stores only a hash of that post's text (never the text itself).
 * The server's CommentDraft remains the status record; this is the review copy.
 */
import type { Platform } from './platform.js';

export interface PendingReply {
  /** The server CommentDraft id — approve/reject transition it there too. */
  id: string;
  platform: Platform;
  postId: string;
  postUrl: string;
  /** The post being replied to. Local-only, so the user can judge the reply. */
  postText: string;
  authorHandle: string | null;
  /** The generated reply. Editable before approval. */
  draftText: string;
  /** ms epoch. */
  createdAt: number;
}

/**
 * Queue ceiling. When full the autopilot STOPS drafting rather than evicting the
 * oldest: an evicted draft is a paid-for model call nobody ever saw, and a queue
 * that silently churns teaches the user their review doesn't matter.
 */
export const REPLY_QUEUE_MAX = 30;
