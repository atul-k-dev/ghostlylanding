import type { Platform, TonePreset } from './platform.js';

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

export interface ExtensionSettings {
  isPaused: boolean;
  timezone: string;
  tone: TonePreset;
  /**
   * Safety auto-pause: once the engine has been Active for this many minutes it
   * pauses itself, so a session can't run unattended forever. The user re-arms
   * it by toggling Active again.
   */
  sessionMinutes: number;
  /**
   * When true, Casper opens the tabs it works in the FOREGROUND so the user can
   * watch the scrolling / liking / commenting / following happen. When false it
   * works quietly in background tabs.
   */
  visibleMode: boolean;
  activeHours: ActiveHours;
  accountAgeMonths: AccountAge;
  targetCreators: TargetCreator[];
  whitelist: { platform: Platform; handle: string }[];
  caps: Record<Platform, PlatformCaps>;
  homeFeed: HomeFeedSettings;
  /** Auto follow-back: periodically follow people who follow you (Twitter/X).
   *  Uses the follow daily cap + whitelist; counts toward the free-tier limit. */
  followBack: boolean;
}

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
