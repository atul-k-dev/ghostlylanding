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
  /** Post body text — only collected by the home-feed scan (for relevance + drafts). */
  text?: string;
  /** Author profile URL — only collected by the home-feed scan (for follows). */
  profileUrl?: string | null;
}

export interface ScannedFollower {
  handle: string;
  profileUrl: string;
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
    }
  | {
      type: 'SCAN_FOLLOWERS';
      payload: { handle: string; max: number };
    }
  | {
      type: 'FOLLOW_HANDLE';
      payload: { handle: string };
    }
  | {
      type: 'SCAN_HOME';
      payload: { max: number };
    };

export type ContentResponse =
  | {
      type: 'SCAN_RESULT';
      payload: { posts: ScannedPost[] };
    }
  | {
      type: 'HOME_RESULT';
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
      type: 'FOLLOWERS_RESULT';
      payload: { followers: ScannedFollower[] };
    }
  | {
      type: 'FOLLOW_RESULT';
      payload: { followed: boolean; alreadyFollowing: boolean; error?: string };
    }
  | {
      type: 'ERROR';
      payload: { message: string };
    };
