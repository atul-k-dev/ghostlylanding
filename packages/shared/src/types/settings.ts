import type { Platform, TonePreset, CommentLength } from './platform.js';

export interface TargetCreator {
  platform: Platform;
  handle: string;
  addedAt: string;
}

export interface PlatformCaps {
  likesPerDay: number;
  commentsPerDay: number;
  followsPerDay: number;
  bookmarksPerDay: number;
  repostsPerDay: number;
  quotesPerDay: number;
}

export interface ActiveHours {
  startHour: number; // 0–23
  endHour: number; // 0–23, exclusive
}

export interface AccountAge {
  twitter: number | null; // months since account creation
  linkedin: number | null;
}

/**
 * Home-feed autopilot: instead of (or alongside) visiting specific target
 * creators, Casper scrolls the user's own home timeline and engages with posts
 * that match the relevance keywords.
 */
export interface HomeFeedSettings {
  enabled: boolean;
  /** Which home feeds to scan. */
  platforms: Platform[];
  /** Like matching posts. */
  like: boolean;
  /**
   * Auto-reply: generate and post a short, relevant reply automatically on
   * matching posts (Casper Pro). Bounded by daily caps, per-session limits,
   * relevance keywords, and dedupe — and gated behind the global Active switch.
   */
  comment: boolean;
  /** Follow the authors of matching posts. */
  follow: boolean;
  /** Bookmark matching posts (private save-for-later). */
  bookmark: boolean;
  /** Repost / retweet matching posts. */
  repost: boolean;
  /** Quote-tweet matching posts with a short AI-generated commentary. */
  quote: boolean;
  /**
   * Case-insensitive keywords a post must contain to be "relevant".
   * Empty = engage with everything in the feed.
   */
  keywords: string[];
  /**
   * Case-insensitive blocklist — a post containing ANY of these is skipped
   * outright (politics, NSFW, spam…), even if it matches the relevance keywords.
   */
  excludeKeywords: string[];
}

/** A live-search feed Ghostly works, e.g. "indie hackers" on the Latest tab. */
export interface SearchQuery {
  /** The raw X search query. Supports X's own operators (min_faves:, -filter:…). */
  query: string;
  addedAt: string;
}

/** Most search feeds one account can sensibly work in a session. */
export const MAX_SEARCH_QUERIES = 5;

/**
 * How hard the engine is allowed to work. One choice that moves caps, delays,
 * the hourly ceiling, session length and which action types are on — instead of
 * six sliders a user has no way to reason about. The table lives in the
 * extension (`src/lib/presets.ts`); the NAME lives here because it is settings.
 */
export type SafetyPresetName = 'careful' | 'balanced' | 'growth';

/**
 * Auto-posting (updateplan 3.2). Replies get you seen; posts get you followed —
 * and the publishing half of this product was 100% manual until Phase 3.
 *
 * `enabled` defaults **off** and is never switched on by anything but the user.
 * Everything else here is a bound on how much it may do, not a target.
 */
export interface AutoPostSettings {
  /** Write and schedule posts without being asked. Off until the user says so. */
  enabled: boolean;
  /**
   * Schedule a draft when nothing has published in this long. Hours, so a user
   * who posts by hand all week is never topped up on top of their own work.
   */
  quietHours: number;
  /**
   * Stop drafting once this many are already waiting. A backlog of drafts
   * nobody has read is not a content pipeline, it's a chore.
   */
  maxQueued: number;
  /**
   * ISO timestamp of the last auto-draft run, so the loop is daily rather than
   * per-tick (the alarm fires every 30 seconds).
   */
  lastRunAt: string | null;
}

/**
 * Mentions & replies (updateplan 4.1/4.2) — answering the people who talk to
 * you. Distinct from `homeFeed`: it runs whether or not any feed engagement is
 * on, because replying to your own mentions carries no ban risk (X weights
 * conversation threads heavily and this is exactly what the notifications tab
 * is for), and a user who has switched off feed engagement entirely may still
 * want their mentions answered.
 */
export interface MentionsSettings {
  /**
   * Read the notifications tab and draft replies. Defaults ON — unlike feed
   * engagement this never posts anything unread by itself: whether a drafted
   * reply goes straight out or waits for a human is still `replyApproval` /
   * `trust`, exactly as it is for every other reply.
   */
  enabled: boolean;
}

/**
 * Browser notifications (updateplan 4.3) — a Chrome-level alert, not the panel.
 * Capped hard at a couple a day regardless of settings, because a product that
 * pings you is a product you mute; the cap lives in code
 * (`lib/browser-notify.ts`), not here, so it can never be raised by mistake.
 */
export interface BrowserNotificationSettings {
  /**
   * The engine is stuck and needs you — signed out for hours, or otherwise
   * unable to work. Default ON: this is the one class of alert that is safety,
   * not a nice-to-have.
   */
  problems: boolean;
  /**
   * "A big account just replied — want me to answer?" Default OFF: everything
   * except "something is broken" is opt-in, per the plan.
   */
  bigReplies: boolean;
}

/**
 * Graduated trust (updateplan 3.3). The state machine lives in the extension
 * (`src/lib/trust.ts`); the STATE lives here because it is settings, and
 * because both halves of the product — replies and posts — read it.
 */
export interface TrustSettings {
  streak: number;
  best: number;
  offeredAt: string | null;
  declinedAt: string | null;
  /** Non-null ONLY after the user answered yes to the offer, by hand. */
  grantedAt: string | null;
}

export interface ExtensionSettings {
  isPaused: boolean;
  timezone: string;
  tone: TonePreset;
  /** Length of auto-generated replies, in short lines (1 ≈ 8–10 words). Default 1. */
  commentLength: CommentLength;
  /**
   * Safety auto-pause: once the engine has been Active for this many minutes it
   * pauses itself, so a session can't run unattended forever. The user re-arms
   * it by toggling Active again.
   */
  sessionMinutes: number;
  /**
   * Browse like a person instead of doing everything from the timeline: open an
   * author's profile to follow them there, open a post's own page to reply on
   * it, then come back to the feed. Off = every action happens inline in the
   * feed (faster, but every action looks identical to X).
   */
  interactiveMode: boolean;
  activeHours: ActiveHours;
  accountAgeMonths: AccountAge;
  targetCreators: TargetCreator[];
  /**
   * Topic feeds: Ghostly opens X's search on the **Latest** tab and works down
   * live posts matching the query. Unlike the home feed — which shows whoever X
   * decides to show you — this aims at a subject you chose.
   */
  searchQueries: SearchQuery[];
  /**
   * Early replies: re-check your target creators every few minutes and engage
   * their brand-new posts, instead of waiting for the slow 6-hourly sweep. An
   * early reply under a bigger account is seen by their whole audience; the
   * four-hundredth reply is seen by nobody.
   */
  earlyReply: boolean;
  /**
   * What the user posts about. Used to generate post ideas in their own voice;
   * empty means Ghostly asks them for a topic instead of guessing.
   */
  contentTopics: string[];
  /**
   * Skip posts that are themselves replies in someone else's thread. They're
   * buried by definition, so engaging them spends your daily budget on the
   * lowest-reach posts in the feed.
   */
  skipReplies: boolean;
  whitelist: { platform: Platform; handle: string }[];
  caps: Record<Platform, PlatformCaps>;
  homeFeed: HomeFeedSettings;
  /** Auto follow-back: periodically follow people who follow you (Twitter/X).
   *  Uses the follow daily cap + whitelist; counts toward the free-tier limit. */
  followBack: boolean;
  /**
   * Hold generated replies for review instead of posting them straight away.
   * Defaults ON: the first thing a new user needs is proof that what Ghostly
   * writes under their name is worth publishing. Off = the old behaviour, where
   * a drafted reply posts immediately.
   */
  replyApproval: boolean;
  /**
   * The user's X account type. Sets the character limit for scheduled posts:
   * 'free' = 280, 'pro' (X Premium) = long-form. Defaults to 'free' since that's
   * what most accounts are. Purely about post length — not the Ghostly plan.
   */
  xAccountPlan: XAccountPlan;
  /**
   * Target length for scheduled posts — only applies on a Pro account (Free is
   * always 280). Sets both the character limit and how long the AI drafts:
   * short ≈ 280, mid ≈ 1,000, long ≈ 4,000 characters.
   */
  postLength: PostLength;
  /**
   * The safety preset in force. Chosen once during setup and changeable later;
   * `applyPreset` is what writes the values it implies.
   */
  safetyPreset: SafetyPresetName;
  /**
   * ISO timestamp of when this account started its 14-day warm-up ramp, or null
   * for an install that never went through setup (which keeps its caps as-is
   * rather than being throttled retroactively).
   *
   * A brand-new automation on a real account going straight to full caps is the
   * single most reliable way to get limited, so setup starts everyone at ~10%
   * and walks it up over two weeks — independently of `accountAgeMonths`, which
   * is about the ACCOUNT's age rather than the automation's.
   */
  warmupStartedAt: string | null;
  /**
   * Spotlight: outline the post the engine is about to act on, on the real page,
   * and name it in the floating panel (updateplan 2.3).
   *
   * Defaults ON. It is the answer to “is this thing actually doing anything?”,
   * which every user asks in their first ten minutes, and it replaces the old
   * `visibleMode` (“Watch it work”) switch — that one only chose whether tabs
   * opened in the foreground, which is not the same question.
   */
  spotlight: boolean;
  /**
   * When the user finished the setup flow, or null if they never has.
   *
   * This is what decides whether the panel opens on Setup or on Today. It is
   * NOT inferred from "has targets and keywords": someone can deliberately run
   * with neither, and starting them at step one every time they open the panel
   * would be the same silent dead end (D14) in a new outfit.
   */
  setupCompletedAt: string | null;
  /**
   * Write and schedule posts without being asked (updateplan 3.2). Off by
   * default — see `AutoPostSettings`.
   */
  autoPost: AutoPostSettings;
  /**
   * How much of what Ghostly writes may go out unread (updateplan 3.3).
   *
   * This is the general form of `replyApproval`, which stays as the reply gate
   * the rest of the engine already reads. `trust.grantedAt` is what turns off
   * the holding pen for BOTH replies and auto-drafted posts, and it is only
   * ever written in answer to an explicit question.
   */
  trust: TrustSettings;
  /** Answering mentions (updateplan 4.1/4.2). */
  mentions: MentionsSettings;
  /** Chrome-level alerts for decaying moments (updateplan 4.3). */
  notifications: BrowserNotificationSettings;
}

/** X account type — drives the scheduled-post character limit. */
export type XAccountPlan = 'free' | 'pro';

/** Target length for scheduled posts on a Pro (X Premium) account. */
export type PostLength = 'short' | 'mid' | 'long';

/**
 * Daily counter for a single platform.
 * Resets at user-local midnight via the scheduler.
 */
export interface DailyCounter {
  date: string; // YYYY-MM-DD in user tz
  byActionType: {
    like: number;
    comment: number;
    follow: number;
    bookmark: number;
    repost: number;
    quote: number;
  };
  effectiveCap: PlatformCaps; // frozen for the day with ±15% variance
}

export interface CountersState {
  twitter: DailyCounter | null;
  linkedin: DailyCounter | null;
}
