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
  /**
   * The handle this reply was posted under (updateplan 5.1), read off the
   * "Replying to @X" line the same growth scan already scrolls past — null
   * for a standalone post, or a reply whose context line wasn't captured.
   * This is the only honest link between a published reply and the creator
   * it answered; there is no equivalent link to a home-feed KEYWORD (a reply
   * isn't "replying to" a topic), which is why target performance below has
   * an engagement figure and topic performance does not.
   */
  repliedToHandle: string | null;
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
 * A milestone worth annotating on the follower chart (updateplan 5.1) — a
 * decision the user made, read from what actually changed in their settings,
 * never guessed from the follower curve itself (a bend in the line is not
 * evidence of a cause; the log entry is).
 */
export type GrowthMilestoneKind =
  | 'preset-changed'
  | 'target-added'
  | 'auto-posting-started'
  | 'auto-tune-dropped-targets';

export interface GrowthMilestone {
  at: string;
  kind: GrowthMilestoneKind;
  /** Human-readable detail, e.g. the preset name or the handle added. */
  detail: string;
}

/**
 * One target creator's real, attributable numbers (updateplan 5.1).
 *
 * `repliesSent` and `lastActionAt` come from the action log — a real count of
 * what actually happened. `engagement` comes from `PostOutcome.repliedToHandle`
 * — the likes/replies/reposts/views earned by replies posted under this
 * creator's posts. There is deliberately NO `followersGained` field: X gives
 * no way to attribute an individual new follower to an individual past
 * action, and inventing a number here would be exactly the fabrication this
 * product refuses everywhere else. `stale` is a plain threshold
 * (`TARGET_STALE_DAYS`), not a followers judgement — it flags "nothing sent
 * here in N days", which is real, not "this stopped working", which isn't
 * knowable.
 */
export interface TargetPerformance {
  handle: string;
  repliesSent: number;
  engagement: { likes: number; replies: number; reposts: number; views: number };
  lastActionAt: string | null;
  stale: boolean;
}

/** One home-feed keyword's real numbers. No engagement figure — unlike a
 *  target creator, a keyword match isn't itself the author of anything, so
 *  there is no `repliedToHandle`-shaped link to a PostOutcome to sum. */
export interface TopicPerformance {
  keyword: string;
  repliesSent: number;
  lastActionAt: string | null;
  stale: boolean;
}

/** Days of silence before a target/topic is flagged `stale` (updateplan 5.1
 *  and 6.1 — the same threshold both read, so the number in the Growth tab
 *  and the one the weekly auto-tune acts on can never disagree). */
export const ATTRIBUTION_STALE_DAYS = 21;

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
  /**
   * Where the engagement is coming from (updateplan 5.1). Follow-backs is a
   * real FOLLOWER figure (the existing `followedBack`/`followedBackSample`
   * primitive). `postsLikes`/`repliesLikes` is an ENGAGEMENT split, not a
   * follower split — there is no honest way to attribute a follower to a
   * single post or reply, so this answers "what's getting attention" rather
   * than claiming to answer "who followed because of what".
   */
  sources: {
    postsLikes: number;
    repliesLikes: number;
  };
  targets: TargetPerformance[];
  topics: TopicPerformance[];
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
