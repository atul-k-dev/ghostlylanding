import { Schema, model, type InferSchemaType } from 'mongoose';
import {
  PLATFORMS,
  TONE_PRESETS,
  SUBSCRIPTION_PLANS,
  SUBSCRIPTION_STATUSES,
  type User as UserDTO,
} from '@casper/shared';

const preferencesSchema = new Schema(
  {
    enabledPlatforms: {
      type: [{ type: String, enum: PLATFORMS }],
      default: ['twitter', 'linkedin'],
    },
    tone: { type: String, enum: TONE_PRESETS, default: 'friendly' },
    timezone: { type: String, default: 'UTC' },
    activeHours: {
      startHour: { type: Number, default: 9, min: 0, max: 23 },
      endHour: { type: Number, default: 22, min: 0, max: 23 },
    },
    accountAgeMonths: {
      twitter: { type: Number, default: null },
      linkedin: { type: Number, default: null },
    },
    /** Home-feed relevance keywords (the user's interested post types). */
    keywords: { type: [String], default: [] },
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    /** bcrypt hash. Null/undefined means the account was created with Google only. */
    passwordHash: { type: String, default: null },
    /** Google `sub` claim, set when the account is linked to a Google identity. */
    googleId: { type: String, default: null, index: true },
    /** bcrypt hash of the active password-reset code; null when none pending. */
    passwordResetCodeHash: { type: String, default: null },
    /** Expiry for the pending reset code. */
    passwordResetExpiresAt: { type: Date, default: null },
    stripeCustomerId: { type: String, default: null, index: true },
    stripeSubscriptionId: { type: String, default: null },
    subscriptionStatus: {
      type: String,
      enum: [...SUBSCRIPTION_STATUSES, null],
      default: 'free',
    },
    subscriptionPlan: {
      type: String,
      enum: SUBSCRIPTION_PLANS,
      default: 'free',
    },
    currentPeriodEnd: { type: Date, default: null },
    /** Server-authoritative count of successful actions in the current month —
     *  free-tier enforcement. Reset when actionPeriodKey rolls to a new month. */
    monthlyActionCount: { type: Number, default: 0 },
    /** "YYYY-MM" (UTC) window that monthlyActionCount belongs to. */
    actionPeriodKey: { type: String, default: null },
    /** Grants access to the admin panel. Set via the set-admin script. */
    isAdmin: { type: Boolean, default: false },
    /** When true the account is suspended — blocked from sign-in and all API use. */
    isBanned: { type: Boolean, default: false },
    /** Timestamp of the most recent ban; null when not banned. */
    bannedAt: { type: Date, default: null },
    preferences: { type: preferencesSchema, default: () => ({}) },
  },
  { timestamps: true },
);

export type UserDocFields = InferSchemaType<typeof userSchema>;

export const UserModel = model('User', userSchema);

export const toUserDTO = (
  doc: UserDocFields & { _id: { toString(): string }; createdAt: Date },
): UserDTO => {
  const prefs = doc.preferences;
  const activeHours = prefs.activeHours ?? { startHour: 9, endHour: 22 };
  const ages = prefs.accountAgeMonths ?? { twitter: null, linkedin: null };
  return {
    id: doc._id.toString(),
    name: doc.name,
    email: doc.email,
    hasGoogleLink: Boolean(doc.googleId),
    hasPassword: Boolean(doc.passwordHash),
    createdAt: doc.createdAt.toISOString(),
    stripeCustomerId: doc.stripeCustomerId ?? null,
    subscriptionStatus: doc.subscriptionStatus ?? null,
    subscriptionPlan: (doc.subscriptionPlan ?? 'free') as UserDTO['subscriptionPlan'],
    currentPeriodEnd: doc.currentPeriodEnd ? doc.currentPeriodEnd.toISOString() : null,
    monthlyActionCount: doc.monthlyActionCount ?? 0,
    actionPeriodKey: doc.actionPeriodKey ?? null,
    isAdmin: doc.isAdmin ?? false,
    isBanned: doc.isBanned ?? false,
    preferences: {
      enabledPlatforms: prefs.enabledPlatforms,
      tone: prefs.tone,
      timezone: prefs.timezone,
      activeHours: {
        startHour: activeHours.startHour,
        endHour: activeHours.endHour,
      },
      accountAgeMonths: {
        twitter: ages.twitter ?? null,
        linkedin: ages.linkedin ?? null,
      },
      keywords: prefs.keywords ?? [],
    },
  };
};
