import type { Platform, TonePreset } from './platform.js';
import type { VoiceProfile } from './voice.js';

export const SUBSCRIPTION_PLANS = ['free', 'weekly', 'monthly'] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];

/** The paid plans, cheapest billing period first. */
export type PaidPlan = Exclude<SubscriptionPlan, 'free'>;
export const PAID_PLANS = ['weekly', 'monthly'] as const satisfies readonly PaidPlan[];

/**
 * Display pricing — one definition so the popup, the server, and the docs can't
 * drift apart. The actual amount charged is whatever the Stripe Price says;
 * these strings must be kept in step with it.
 */
export const PLAN_PRICING: Record<PaidPlan, { label: string; amount: string; per: string }> = {
  weekly: { label: 'Pro · Weekly', amount: '$3.99', per: 'week' },
  monthly: { label: 'Pro · Monthly', amount: '$12.99', per: 'month' },
};

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
  name: string;
  email: string;
  /** True when the account was created/linked via Google Sign-In. */
  hasGoogleLink: boolean;
  /** True when the account has a password set (false for Google-only accounts). */
  hasPassword: boolean;
  createdAt: string;
  stripeCustomerId?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
  subscriptionPlan?: SubscriptionPlan;
  currentPeriodEnd?: string | null;
  /** Successful actions used in the current calendar month (UTC). Resets each
   *  month; once it hits FREE_TIER.monthlyActions, free users must upgrade. */
  monthlyActionCount?: number;
  /** "YYYY-MM" (UTC) period that monthlyActionCount belongs to. When this no
   *  longer matches the current month, the count is treated as 0 (fresh quota). */
  actionPeriodKey?: string | null;
  /** Grants access to the admin panel. */
  isAdmin?: boolean;
  /** When true the account is suspended — blocked from sign-in and all API use. */
  isBanned?: boolean;
  /** Learned writing style, when the user has trained one. Overrides the tone
   *  preset for replies, quotes, and drafted posts. */
  voiceProfile?: VoiceProfile | null;
  preferences: UserPreferences;
}

/**
 * Free tier limits (updateplan 6.9 — D11).
 *
 * `maxPlatforms` and `aiCommentsEnabled` used to live here too, declared but
 * never read anywhere in the extension or server (confirmed by a repo-wide
 * grep: zero references outside this declaration). Deleted rather than
 * enforced: `maxPlatforms` has nothing left to gate — LinkedIn automation is
 * fully inert and Twitter/X is the only platform that does anything, so a
 * "max platforms" check would be a permanent no-op. `aiCommentsEnabled` is
 * different in kind — turning it on would silently take AI-generated replies
 * away from every free user currently relying on them inside their 50-action
 * monthly budget, which is a monetization decision this cleanup step has no
 * authority to make on its own. Flagged in the Phase 6 progress log rather
 * than decided here.
 */
export const FREE_TIER = {
  monthlyActions: 50,
} as const;

export const isPro = (status?: SubscriptionStatus | null): boolean =>
  status === 'active' || status === 'trialing';

/** "YYYY-MM" key for the given date's month in UTC — the free-tier quota window. */
export const currentPeriodKey = (d: Date = new Date()): string => d.toISOString().slice(0, 7);

/**
 * Actions a user has used in the CURRENT monthly window. Returns 0 once the
 * month rolls over (even before the server persists the reset), so the quota
 * refreshes on the 1st without needing a round-trip.
 */
export const monthlyActionsUsed = (
  user: Pick<User, 'monthlyActionCount' | 'actionPeriodKey'> | null | undefined,
): number => {
  if (!user) return 0;
  if (user.actionPeriodKey !== currentPeriodKey()) return 0;
  return user.monthlyActionCount ?? 0;
};

/** The monthly counter fields after one more action, rolling over at the month
 *  boundary. Used for the client's optimistic local count between server syncs. */
export const bumpMonthly = (
  user: Pick<User, 'monthlyActionCount' | 'actionPeriodKey'>,
): { monthlyActionCount: number; actionPeriodKey: string } => {
  const key = currentPeriodKey();
  const used = user.actionPeriodKey === key ? (user.monthlyActionCount ?? 0) : 0;
  return { monthlyActionCount: used + 1, actionPeriodKey: key };
};

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
  /** Home-feed relevance keywords (the user's interested post types). Persisted
   *  server-side so they survive reinstalls and sync across devices. */
  keywords: string[];
}

export interface AuthResponse {
  token: string;
  user: User;
}
