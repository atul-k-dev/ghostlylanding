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
  weekly: { label: 'Pro · Weekly', amount: '$2.99', per: 'week' },
  monthly: { label: 'Pro · Monthly', amount: '$7.99', per: 'month' },
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
  /** Bonus actions left in the user's referral pool (REFERRAL). Never expires
   *  and isn't reset monthly; spent only once the monthly allowance is used up. */
  bonusCredits?: number;
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

/**
 * Referral programme defaults. A friend who signs up with someone's invite code
 * gets `creditsPerReferral` bonus actions, and so does the inviter — for their
 * first `maxRewardedReferrals` friends only. The cap is what keeps a stack of
 * throwaway accounts from turning into unlimited free use; the friend always
 * gets their bonus. Both numbers are admin-configurable (GET/PUT
 * /api/admin/settings/referral); these are the values used until an admin
 * changes them.
 */
export const REFERRAL_DEFAULTS = {
  creditsPerReferral: 10,
  maxRewardedReferrals: 20,
} as const;

export interface ReferralSettings {
  creditsPerReferral: number;
  maxRewardedReferrals: number;
}

/** Invite codes: 7 characters, with no 0/O/1/I/L so they survive being read
 *  aloud and typed by hand. */
export const REFERRAL_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const REFERRAL_CODE_LENGTH = 7;
export const REFERRAL_CODE_PATTERN = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{7}$/;

/** Uppercase and strip spaces/dashes, so a pasted " abcd-234 " still resolves.
 *  Returns null unless what's left is a well-formed code. */
export const normalizeReferralCode = (raw: string | null | undefined): string | null => {
  if (typeof raw !== 'string') return null;
  const code = raw.toUpperCase().replace(/[\s-]/g, '');
  return REFERRAL_CODE_PATTERN.test(code) ? code : null;
};

/** GET /api/referral — the Invite Friends screen. */
export interface ReferralSummary {
  code: string;
  /** https://<SITE>/invite/<code> */
  link: string;
  creditsPerReferral: number;
  /** Friends whose signup earned the inviter credits. */
  count: number;
  /** count × creditsPerReferral, at the rates in force when each was paid. */
  creditsEarned: number;
  cap: number;
  /** Rewarded invites left before the cap (never negative). */
  remaining: number;
}

/** GET /api/referral/lookup/:code — public, used by the invite page and the
 *  sign-up banner. */
export interface ReferralLookup {
  valid: boolean;
  /** First name only. */
  inviterName: string | null;
  /** What the friend gets for signing up with this code. */
  bonusCredits: number;
}

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

type AllowanceFields = Pick<User, 'monthlyActionCount' | 'actionPeriodKey' | 'bonusCredits'>;

/**
 * Free actions still available: what's left of this month's allowance plus the
 * referral bonus pool. The monthly part is clamped at 0, and the pool is
 * decremented as overflow actions spend it, so nothing is counted twice.
 */
export const freeActionsLeft = (user: AllowanceFields | null | undefined): number =>
  Math.max(0, FREE_TIER.monthlyActions - monthlyActionsUsed(user)) + Math.max(0, user?.bonusCredits ?? 0);

/** True when a free user has nothing left — neither monthly allowance nor bonus. */
export const freeLimitReached = (user: AllowanceFields | null | undefined): boolean =>
  freeActionsLeft(user) <= 0;

/** The allowance fields after one more action, rolling over at the month
 *  boundary. Once the monthly allowance is spent, the action comes out of the
 *  bonus pool instead. Used for the client's optimistic local count between
 *  server syncs; the server applies the same rule in /api/actions/log. */
export const bumpMonthly = (
  user: AllowanceFields,
): { monthlyActionCount: number; actionPeriodKey: string; bonusCredits: number } => {
  const key = currentPeriodKey();
  const used = user.actionPeriodKey === key ? (user.monthlyActionCount ?? 0) : 0;
  const bonus = Math.max(0, user.bonusCredits ?? 0);
  const spendsBonus = used >= FREE_TIER.monthlyActions;
  return {
    monthlyActionCount: used + 1,
    actionPeriodKey: key,
    bonusCredits: spendsBonus ? Math.max(0, bonus - 1) : bonus,
  };
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
  /** Sign-up only: true when the account was created with a valid invite code
   *  (and the new user got their bonus). */
  referralApplied?: boolean;
}
