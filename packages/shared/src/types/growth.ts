/**
 * Growth scoreboard — the outcome side of the ledger.
 *
 * Everything else Ghostly records is what it *did* (the action log). These types
 * are what it *got*: the user's follower count over time, and how the replies it
 * posted actually performed. Both are scraped from the user's own profile in
 * their own browser session — no API keys, nothing X doesn't already show them.
 */

/** One day's profile counters. At most one per user per local day. */
export interface GrowthSnapshot {
  /** YYYY-MM-DD in the user's timezone — the natural key alongside the user. */
  date: string;
  followers: number;
  following: number;
  /** Total posts on the profile; null when the header didn't expose it. */
  posts: number | null;
  /**
   * How many of the user's most recent followers are accounts Ghostly followed
   * first — i.e. follows that paid off. Null when we didn't sample the list
   * this run (it needs a pass over their own followers page).
   */
  followedBack: number | null;
  /** How many recent followers we sampled to compute `followedBack`. */
  followedBackSample: number | null;
}

/**
 * How one of the user's own posts (usually an auto-reply) performed, as read off
 * their profile. Re-scraped on later runs, so the numbers keep maturing.
 */
export interface PostOutcome {
  /** The status id of the user's OWN post — the primary key with the user. */
  tweetId: string;
  url: string;
  /** Trimmed post text, so the user recognises which reply this was. */
  text: string;
  /** True when it's a reply to someone else rather than a standalone post. */
  isReply: boolean;
  likes: number;
  replies: number;
  reposts: number;
  /** View count when X shows one (it doesn't always). */
  views: number | null;
  /** ISO timestamp from the post's <time> element. */
  publishedAt: string | null;
}

/** A single point on the follower sparkline. */
export interface GrowthPoint {
  date: string;
  followers: number;
}

/** Follower change over a window, plus how many days of data it's based on. */
export interface GrowthDelta {
  /** Change in followers across the window; null until there's a baseline. */
  change: number | null;
  /** Days actually spanned — so the UI can say "since you installed" honestly. */
  days: number;
}

/**
 * Everything the Growth tab renders, computed server-side so the popup stays
 * dumb. `latest` is null until the first daily scan lands.
 */
export interface GrowthSummary {
  latest: GrowthSnapshot | null;
  /** Oldest → newest, for the sparkline. */
  series: GrowthPoint[];
  deltas: {
    day: GrowthDelta;
    week: GrowthDelta;
    month: GrowthDelta;
  };
  replies: {
    /** How many of the user's posts we have outcome data for. */
    tracked: number;
    totalLikes: number;
    totalReplies: number;
    /** Mean likes per tracked post, to 1dp. */
    avgLikes: number;
    /** Best performers first, capped server-side. */
    top: PostOutcome[];
  };
}

/** Batch size caps — shared so client and server agree. */
export const GROWTH_LIMITS = {
  /** Outcomes uploaded per scan. */
  maxOutcomesPerBatch: 60,
  /** Snapshot days returned by the summary endpoint. */
  maxSeriesDays: 90,
  /** Top-performing posts returned by the summary endpoint. */
  topPosts: 5,
} as const;
