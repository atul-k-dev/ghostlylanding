import { REFERRAL_DEFAULTS, type ReferralSettings } from '@casper/shared';
import { AppSettingModel, REFERRAL_SETTINGS_KEY } from '../models/app-setting.model.js';

/**
 * The referral numbers in force: the admin's override where one is set, the
 * shared defaults otherwise. Cached briefly because every sign-up and every
 * invite-page view reads them; an admin write clears the cache, so a change is
 * live on this process at once and on any other within CACHE_MS.
 */
const CACHE_MS = 30_000;
let cached: { value: ReferralSettings; at: number } | null = null;

export const getReferralSettings = async (): Promise<ReferralSettings> => {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;
  const doc = await AppSettingModel.findOne({ key: REFERRAL_SETTINGS_KEY }).lean();
  const value: ReferralSettings = {
    creditsPerReferral: doc?.referral?.creditsPerReferral ?? REFERRAL_DEFAULTS.creditsPerReferral,
    maxRewardedReferrals: doc?.referral?.maxRewardedReferrals ?? REFERRAL_DEFAULTS.maxRewardedReferrals,
  };
  cached = { value, at: Date.now() };
  return value;
};

export const setReferralSettings = async (
  next: ReferralSettings,
  updatedBy: string | null,
): Promise<ReferralSettings> => {
  await AppSettingModel.updateOne(
    { key: REFERRAL_SETTINGS_KEY },
    { $set: { referral: next, updatedBy } },
    { upsert: true },
  );
  cached = null;
  return getReferralSettings();
};

/** Tests only — forget the cached value. */
export const resetReferralSettingsCache = (): void => {
  cached = null;
};
