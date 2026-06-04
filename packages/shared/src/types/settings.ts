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
 * that match the relevance keywords. Comments still route through the approval
 * queue — never auto-posted.
 */
export interface HomeFeedSettings {
  enabled: boolean;
  /** Which home feeds to scan. */
  platforms: Platform[];
  /** Like matching posts. */
  like: boolean;
  /** Draft a comment for matching posts (lands in the approval queue). */
  comment: boolean;
  /** Follow the authors of matching posts. */
  follow: boolean;
  /**
   * Case-insensitive keywords a post must contain to be "relevant".
   * Empty = engage with everything in the feed.
   */
  keywords: string[];
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
  activeHours: ActiveHours;
  accountAgeMonths: AccountAge;
  targetCreators: TargetCreator[];
  whitelist: { platform: Platform; handle: string }[];
  caps: Record<Platform, PlatformCaps>;
  homeFeed: HomeFeedSettings;
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
  };
  effectiveCap: PlatformCaps; // frozen for the day with ±15% variance
}

export interface CountersState {
  twitter: DailyCounter | null;
  linkedin: DailyCounter | null;
}
