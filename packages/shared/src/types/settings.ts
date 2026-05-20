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

export interface ExtensionSettings {
  isPaused: boolean;
  targetCreators: TargetCreator[];
  whitelist: { platform: Platform; handle: string }[];
  caps: Record<Platform, PlatformCaps>;
}
