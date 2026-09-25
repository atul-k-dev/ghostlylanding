/**
 * The numbers the extension actually enforces.
 *
 * Marketing copy that overstates a limit is a support ticket waiting to
 * happen, so nothing here is invented for the page — every value is copied
 * from the code that enforces it, and each block says which file that is.
 * When one of those moves, this file moves with it.
 */

/** `packages/shared/src/types/user.ts` — PLAN_PRICING. */
export const PRICING = {
  weekly: { amount: "$2.99", per: "per week" },
  monthly: { amount: "$7.99", per: "per month" },
} as const;

/** `packages/shared/src/types/user.ts` — FREE_TIER.monthlyActions. */
export const FREE_MONTHLY_ACTIONS = 50;

/** `apps/extension/src/lib/storage.ts` — MAX_SCHEDULED_POSTS. */
export const MAX_SCHEDULED_POSTS = 25;

/** `packages/shared/src/types/settings.ts` — MAX_SEARCH_QUERIES. */
export const MAX_TOPIC_FEEDS = 5;

/** `packages/shared/src/types/reply-queue.ts` — REPLY_QUEUE_MAX. */
export const REPLY_QUEUE_MAX = 30;

/** `apps/extension/src/lib/presets.ts` — WARMUP_DAYS / WARMUP_FLOOR. */
export const WARMUP_DAYS = 5;
export const WARMUP_FLOOR_PCT = 40;

/**
 * `apps/extension/src/lib/presets.ts` — SAFETY_PRESETS. Base daily caps before
 * the account-age multiplier, the warm-up ramp and the ±15% daily variance.
 * Identical on Free and Pro: they protect the account, not the plan.
 */
export const PACES = [
  {
    id: "careful",
    label: "Careful",
    blurb: "Best if the account matters to you.",
    caps: { likes: 40, replies: 8, follows: 12, bookmarks: 20, reposts: 6, quotes: 3 },
    hourly: 12,
    postsPerDay: 1,
  },
  {
    id: "balanced",
    label: "Balanced",
    blurb: "Most people want this.",
    caps: { likes: 100, replies: 30, follows: 50, bookmarks: 60, reposts: 30, quotes: 15 },
    hourly: 30,
    postsPerDay: 1,
  },
  {
    id: "growth",
    label: "Growth",
    blurb: "For an account you could afford to rebuild.",
    caps: { likes: 140, replies: 40, follows: 70, bookmarks: 80, reposts: 40, quotes: 20 },
    hourly: 60,
    postsPerDay: 2,
  },
] as const;

export const CAP_ROWS = [
  { key: "likes", label: "Likes" },
  { key: "replies", label: "Replies" },
  { key: "follows", label: "Follows" },
  { key: "bookmarks", label: "Bookmarks" },
  { key: "reposts", label: "Reposts" },
  { key: "quotes", label: "Quotes" },
] as const;

/**
 * `packages/shared/src/types/user.ts` — REFERRAL_DEFAULTS. Admin-configurable
 * at runtime; these are the shipped defaults the page describes.
 */
export const REFERRAL = {
  creditsPerReferral: 10,
  maxRewardedReferrals: 20,
} as const;
