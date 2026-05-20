import type { Platform, TonePreset } from './platform.js';

export interface User {
  id: string;
  email: string;
  createdAt: string;
  // Phase 2 placeholders — populated when Stripe is wired up.
  stripeCustomerId?: string | null;
  subscriptionStatus?: 'free' | 'active' | 'past_due' | 'canceled' | null;
  preferences: UserPreferences;
}

export interface UserPreferences {
  enabledPlatforms: Platform[];
  tone: TonePreset;
  timezone: string;
  activeHours: {
    startHour: number;
    endHour: number;
  };
  accountAgeMonths: {
    twitter: number | null;
    linkedin: number | null;
  };
}

export interface AuthResponse {
  token: string;
  user: User;
}
