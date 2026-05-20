import type { Platform, TonePreset } from './platform.js';

export const SUBSCRIPTION_PLANS = ['free', 'monthly', 'quarterly', 'annual'] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

export const SUBSCRIPTION_STATUSES = [
  'free',
  'active',
  'trialing',
  'past_due',
  'canceled',
  'incomplete',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface User {
  id: string;
  email: string;
  createdAt: string;
  stripeCustomerId?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
  subscriptionPlan?: SubscriptionPlan;
  currentPeriodEnd?: string | null;
  /** Lifetime successful-action count — once it hits FREE_TIER.lifetimeActions, free users must upgrade. */
  lifetimeActionCount?: number;
  preferences: UserPreferences;
}

/** Free tier limits per locked spec: 30 lifetime actions total, 1 platform, no AI comments. */
export const FREE_TIER = {
  lifetimeActions: 30,
  maxPlatforms: 1,
  aiCommentsEnabled: false,
} as const;

export const isPro = (status?: SubscriptionStatus | null): boolean =>
  status === 'active' || status === 'trialing';

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
