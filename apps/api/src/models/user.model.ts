import { Schema, model, type InferSchemaType } from 'mongoose';
import { PLATFORMS, TONE_PRESETS, type User as UserDTO } from '@casper/shared';

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
  },
  { _id: false },
);

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    stripeCustomerId: { type: String, default: null },
    subscriptionStatus: {
      type: String,
      enum: ['free', 'active', 'past_due', 'canceled', null],
      default: 'free',
    },
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
    email: doc.email,
    createdAt: doc.createdAt.toISOString(),
    stripeCustomerId: doc.stripeCustomerId ?? null,
    subscriptionStatus: doc.subscriptionStatus ?? null,
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
    },
  };
};
