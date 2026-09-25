import { Schema, model } from 'mongoose';

/**
 * Admin-editable product settings, one document per `key`. Today there is one
 * kind — 'referral' — holding the credits a referral pays and the per-inviter
 * cap. Normally the document doesn't exist and the defaults in
 * @casper/shared (REFERRAL_DEFAULTS) apply.
 */
const appSettingSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    referral: {
      creditsPerReferral: { type: Number, min: 0, max: 1_000 },
      maxRewardedReferrals: { type: Number, min: 0, max: 10_000 },
    },
    /** Who last changed it, for the audit trail. */
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true },
);

export const REFERRAL_SETTINGS_KEY = 'referral';

export const AppSettingModel = model('AppSetting', appSettingSchema);
