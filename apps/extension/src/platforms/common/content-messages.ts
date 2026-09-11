/**
 * Messages exchanged between the service worker and the platform content
 * scripts. Distinct from the popup ↔ SW envelope in @casper/shared.
 */

/** Growth-scan payloads — defined next to the scraper that produces them. */
export type { ProfileStats, ScrapedOutcome } from '../twitter/stats.js';
import type { ProfileStats, ScrapedOutcome } from '../twitter/stats.js';
export type { RawMention } from '../twitter/mentions.js';
import type { RawMention } from '../twitter/mentions.js';

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
  /** Empty string when the account has no bio (updateplan 6.5 — D9's quality
   *  filter needs it; never null, so a filter that finds no match reads as an
   *  honest "no", not a crash). */
  bio: string;
}

/** Bio-keyword follow quality filter (updateplan 6.5 — D9). Applied against
 *  the ONE signal a followers-list cell actually renders — no follower count,
 *  no last-active date, since following happens in place without a
 *  per-candidate profile visit. */
export interface FollowBioFilter {
  keywords: string[];
  excludeKeywords: string[];
}

/**
 * A person read off a list page (the Following list, in setup). Richer than
 * `ScannedFollower` because setup has to EXPLAIN each proposal — "they post
 * about design" is only possible if the bio came back with the handle.
 */
export interface ScannedProfile {
  handle: string;
  /** Display name as X renders it, not the @handle. */
  name: string;
  /** Empty string when the account has no bio, never null — keeps ranking simple. */
  bio: string;
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
      /** The accounts this user already follows — setup's source of proposals. */
      type: 'SCAN_FOLLOWING';
      payload: { max: number };
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
        /** Follow-up tweets, posted as one thread after `text`. */
        thread?: string[];
      };
    }
  | {
      type: 'READ_PROFILE_STATS';
      payload: Record<string, never>;
    }
  | {
      type: 'COLLECT_OWN_POSTS';
      payload: { handle: string; max: number };
    }
  | {
      type: 'FOLLOW_BACK';
      payload: {
        max: number;
        minDelayMs: number;
        maxDelayMs: number;
        /** Lowercased handles to never follow back (whitelist). */
        skipHandles: string[];
        /** Bio quality filter (updateplan 6.5 — D9). Absent/empty = unfiltered. */
        bioFilter?: FollowBioFilter;
      };
    }
  | {
      /** Read the notifications/mentions tab (updateplan 4.1). */
      type: 'SCAN_MENTIONS';
      payload: { max: number; ownHandle: string | null };
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
  /**
   * Whether a post must match `keywords` to be engaged. True only for the
   * open home feed. A search feed's query IS its filter, and a profile visit
   * is a creator the user chose — both send no keywords, and since "no
   * keywords = engage nothing" (D18) they would otherwise skip every post.
   */
  matchKeywords: boolean;
  /** Blocklist — posts containing any of these are skipped entirely. */
  excludeKeywords: string[];
  /**
   * Lower-cased bare handles (no `@`) of the user's current target creators
   * (updateplan 6.4 — D4/D5's relevance relaxation). A post from one of these
   * authors is relevant regardless of caption thinness — the user already
   * chose to watch them; a home/search keyword filter should never override
   * that choice just because a video has no alt text.
   */
  targetHandles: string[];
  /**
   * Lower-cased bare handles (no `@`) the engine must never follow
   * (updateplan 6.6 — D7). Checked in every follow path, not only the
   * standalone follow-list runner: home-feed inline follow, search-feed
   * inline follow, and the interactive profile-visit follow all read this.
   */
  whitelist: string[];
  /** True for a search-feed session (updateplan 6.7 — D8) — tags every action
   *  it records so the background spends it from the search budget, not the
   *  one home/profile sessions share. */
  isSearchFeed: boolean;
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
  /**
   * Hold replies for review instead of posting them. The draft is generated the
   * same way, then handed to the background for the queue — nothing is typed
   * into X, so no action is recorded and no cap is spent until the user says yes.
   */
  replyApproval: boolean;
  /** Skip posts that are replies inside someone else's thread (low reach). */
  skipReplies: boolean;
  /** Post IDs to skip for commenting (already replied to, or awaiting review). */
  skipCommentIds: string[];
  /** Post IDs to skip for quote-tweeting (already quoted). */
  skipQuoteIds: string[];
  minDelayMs: number;
  maxDelayMs: number;
  /**
   * Dry run (updateplan 1.5): walk the feed and decide exactly as usual, but
   * take NO action — no like, no follow, no reply typed, nothing queued, no
   * counter touched. Replies are still really generated, because a preview of
   * a reply the model did not write would be a lie about the product.
   *
   * It is a flag on the real options rather than a second code path on purpose:
   * a forked "preview" loop would drift from the real one, and then the preview
   * would stop predicting what actually happens — which is the only thing it is
   * for.
   */
  dryRun?: boolean;
  /** How many posts a dry run collects before stopping. */
  dryRunMax?: number;
}

/** One post a dry run would have engaged, and what it would have done. */
export interface DryRunCandidate {
  postUrl: string;
  postId: string;
  authorHandle: string | null;
  /** The post's own text, trimmed for display. */
  text: string;
  /** like / reply / follow — in the order they would have happened. */
  wouldDo: string[];
  /** The reply it actually generated, when replying is on. */
  draft?: string;
  /** Why no draft, when replying is on but generating failed. */
  draftError?: string;
}

export interface HomeAutopilotResult {
  liked: { postUrl: string; postId: string; authorHandle: string | null }[];
  commented: { postUrl: string; postId: string; draftId?: string }[];
  /** Replies drafted and parked for review (approval mode) — NOT posted. */
  queued: { postUrl: string; postId: string; draftId?: string }[];
  followed: { handle: string; profileUrl: string | null }[];
  bookmarked: { postUrl: string; postId: string }[];
  reposted: { postUrl: string; postId: string }[];
  quoted: { postUrl: string; postId: string; draftId?: string }[];
  scanned: number;
  /** Populated only by a dry run — what it WOULD have done, having done none of it. */
  wouldEngage?: DryRunCandidate[];
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
      type: 'FOLLOWING_RESULT';
      payload: { profiles: ScannedProfile[] };
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
      type: 'PROFILE_STATS_RESULT';
      payload: { stats: ProfileStats | null };
    }
  | {
      type: 'OWN_POSTS_RESULT';
      payload: { outcomes: ScrapedOutcome[] };
    }
  | {
      type: 'FOLLOW_BACK_RESULT';
      payload: { followed: { handle: string; profileUrl: string }[] };
    }
  | {
      type: 'MENTIONS_RESULT';
      payload: { mentions: RawMention[] };
    }
  | {
      type: 'ERROR';
      payload: { message: string };
    };
