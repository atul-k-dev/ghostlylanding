/**
 * Messages exchanged between the service worker and the platform content
 * scripts. Distinct from the popup ↔ SW envelope in @casper/shared.
 */

export interface ScannedPost {
  postUrl: string;
  postId: string;
  /** ISO timestamp from the post's <time datetime="..."> element. */
  publishedAt: string | null;
  /** Author handle if we can parse it. Optional — used for telemetry. */
  authorHandle: string | null;
}

export type ContentRequest =
  | {
      type: 'SCAN_PROFILE';
      payload: { handle: string };
    }
  | {
      type: 'LIKE_POST';
      payload: { postUrl: string };
    }
  | {
      type: 'SUBMIT_COMMENT';
      payload: { postUrl: string; commentText: string };
    };

export type ContentResponse =
  | {
      type: 'SCAN_RESULT';
      payload: { posts: ScannedPost[] };
    }
  | {
      type: 'LIKE_RESULT';
      payload: { liked: boolean; alreadyLiked: boolean; error?: string };
    }
  | {
      type: 'COMMENT_RESULT';
      payload: { posted: boolean; error?: string };
    }
  | {
      type: 'ERROR';
      payload: { message: string };
    };
