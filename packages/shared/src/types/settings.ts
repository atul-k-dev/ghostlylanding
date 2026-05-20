import type { Platform } from './platform.js';

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

export interface ExtensionSettings {
  isPaused: boolean;
  timezone: string;
  activeHours: ActiveHours;
  accountAgeMonths: AccountAge;
  targetCreators: TargetCreator[];
  whitelist: { platform: Platform; handle: string }[];
  caps: Record<Platform, PlatformCaps>;
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
