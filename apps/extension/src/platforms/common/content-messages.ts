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
    }
  | {
      type: 'GET_OWN_HANDLE';
      payload: Record<string, never>;
    }
  | {
      type: 'PUBLISH_POST';
      payload: {
        /** The tweet body. */
        text: string;
        /** Optional link, appended so X unfurls it. */
        link?: string;
        /** Optional image as a data URL, attached to the compose box. */
        imageDataUrl?: string | null;
      };
    }
  | {
      type: 'FOLLOW_BACK';
      payload: {
        max: number;
        minDelayMs: number;
        maxDelayMs: number;
        /** Lowercased handles to never follow back (whitelist). */
        skipHandles: string[];
      };
    };

/** Inline home-feed autopilot — one tab smoothly scrolls and acts in place. */
export interface HomeAutopilotOptions {
  platform: 'twitter' | 'linkedin';
  like: boolean;
  /** Auto-reply: type + post a relevant reply inline (Pro-gated upstream). */
  comment: boolean;
  follow: boolean;
  /** Bookmark, repost, and quote-tweet matching posts inline. */
  bookmark: boolean;
  repost: boolean;
  quote: boolean;
  keywords: string[];
  /** Blocklist — posts containing any of these are skipped entirely. */
  excludeKeywords: string[];
  /**
   * Navigate the way a person does: open the author's profile to follow them
   * there (and glance at their latest post), open a post's own page to reply on
   * it, then come back to the feed. Navigation is in-app only (clicking the
   * links X already renders) so this content script survives the trip.
   */
  interactive: boolean;
  freshnessHours: number;
  maxLikes: number;
  maxComments: number;
  maxFollows: number;
  maxBookmarks: number;
  maxReposts: number;
  maxQuotes: number;
  /** Overall action ceiling (free-tier monthly cap; large for Pro). */
  totalBudget: number;
  /**
   * Wall-clock budget for this ONE continuous session (ms). The tab keeps
   * scrolling + acting in place until this elapses, the caps run out, or the
   * user pauses — set from the user's chosen session length, so we no longer
   * churn a fresh tab every few minutes.
   */
  maxRunMs: number;
  /**
   * Stop after this many consecutive posts older than the freshness window
   * (a reverse-chronological profile is exhausted of fresh posts). 0 = never
   * stop on staleness (the home feed is infinite + fresh).
   */
  stopAfterStaleRun: number;
  /** Post IDs to skip for commenting (already replied to). */
  skipCommentIds: string[];
  /** Post IDs to skip for quote-tweeting (already quoted). */
  skipQuoteIds: string[];
  minDelayMs: number;
  maxDelayMs: number;
}

export interface HomeAutopilotResult {
  liked: { postUrl: string; postId: string; authorHandle: string | null }[];
  commented: { postUrl: string; postId: string; draftId?: string }[];
  followed: { handle: string; profileUrl: string | null }[];
  bookmarked: { postUrl: string; postId: string }[];
  reposted: { postUrl: string; postId: string }[];
  quoted: { postUrl: string; postId: string; draftId?: string }[];
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
      type: 'OWN_HANDLE_RESULT';
      payload: { handle: string | null };
    }
  | {
      type: 'PUBLISH_RESULT';
      payload: { posted: boolean; error?: string };
    }
  | {
      type: 'FOLLOW_BACK_RESULT';
      payload: { followed: { handle: string; profileUrl: string }[] };
    }
  | {
      type: 'ERROR';
      payload: { message: string };
    };
