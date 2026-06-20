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
    }
  | {
      type: 'RUN_HOME';
      payload: HomeAutopilotOptions;
    };

/** Inline home-feed autopilot — one tab smoothly scrolls and acts in place. */
export interface HomeAutopilotOptions {
  platform: 'twitter' | 'linkedin';
  like: boolean;
  /** Auto-reply: type + post a relevant reply inline (Pro-gated upstream). */
  comment: boolean;
  follow: boolean;
  keywords: string[];
  freshnessHours: number;
  maxLikes: number;
  maxComments: number;
  maxFollows: number;
  /** Overall action ceiling (free-tier lifetime cap; large for Pro). */
  totalBudget: number;
  /**
   * Wall-clock budget for this ONE continuous session (ms). The tab keeps
   * scrolling + acting in place until this elapses, the caps run out, or the
   * user pauses — set from the user's chosen session length, so we no longer
   * churn a fresh tab every few minutes.
   */
  maxRunMs: number;
  /** Post IDs to skip for commenting (already replied to). */
  skipCommentIds: string[];
  minDelayMs: number;
  maxDelayMs: number;
}

export interface HomeAutopilotResult {
  liked: { postUrl: string; postId: string; authorHandle: string | null }[];
  commented: { postUrl: string; postId: string; draftId?: string }[];
  followed: { handle: string; profileUrl: string | null }[];
  scanned: number;
  /** Why replying didn't happen (server down, not Pro, DOM flow failed). */
  commentError?: string;
  /** Diagnostic: candidate-selector match counts, reported to the (clean)
   *  service-worker console when a run finds nothing — so we can pinpoint a
   *  DOM-selector drift without relying on the page console. */
  debug?: string;
}

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
      type: 'HOME_AUTOPILOT_RESULT';
      payload: HomeAutopilotResult;
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
