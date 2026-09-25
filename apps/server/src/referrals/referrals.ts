import { randomInt } from 'node:crypto';
import type { Types } from 'mongoose';
import {
  REFERRAL_CODE_ALPHABET,
  REFERRAL_CODE_LENGTH,
  normalizeReferralCode,
  type ReferralSettings,
} from '@casper/shared';
import { config } from '../config.js';
import { UserModel } from '../models/user.model.js';

/**
 * Referral codes and rewards.
 *
 * A friend who signs up with someone's code gets `creditsPerReferral` bonus
 * actions on their new account, and the inviter gets the same — for their first
 * `maxRewardedReferrals` friends only (both from getReferralSettings()).
 * Rewards happen once, at account creation: the new account is created with its
 * bonus and `referredBy` already set, and the inviter is paid only after that
 * insert succeeded, so a failed or duplicate signup never pays anyone.
 */

const generateCode = (): string =>
  Array.from(
    { length: REFERRAL_CODE_LENGTH },
    () => REFERRAL_CODE_ALPHABET[randomInt(0, REFERRAL_CODE_ALPHABET.length)],
  ).join('');

export const inviteLink = (code: string): string => `${config.siteUrl.replace(/\/$/, '')}/invite/${code}`;

const isDuplicateKey = (e: unknown): boolean => (e as { code?: number }).code === 11000;

/**
 * The user's invite code, created the first time it's needed — which also
 * covers every account made before referrals existed.
 */
export const ensureReferralCode = async (userId: string | Types.ObjectId): Promise<string | null> => {
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      // Matches only while the user has no code, so two concurrent calls can't
      // hand out two different codes — the loser falls through to the read.
      const updated = await UserModel.findOneAndUpdate(
        { _id: userId, referralCode: null },
        { $set: { referralCode: generateCode() } },
        { new: true, projection: { referralCode: 1 } },
      );
      if (updated?.referralCode) return updated.referralCode;
      const existing = await UserModel.findById(userId, { referralCode: 1 });
      return existing?.referralCode ?? null;
    } catch (e) {
      // 31^7 ≈ 27.5 billion codes, so a clash is rare — but the unique index is
      // the real guarantee. On one, draw again.
      if (isDuplicateKey(e)) continue;
      throw e;
    }
  }
  throw new Error('could not allocate a unique referral code');
};

/**
 * The inviter behind a code, or null when the code is malformed, unknown, or
 * belongs to a suspended account. Never throws on bad input: an invalid code
 * must not be able to block a sign-up.
 */
export const findReferrer = async (raw: string | null | undefined) => {
  const code = normalizeReferralCode(raw);
  if (!code) return null;
  return UserModel.findOne({ referralCode: code, isBanned: { $ne: true } }, { _id: 1, name: 1 });
};

/** "Saroj Kumar" → "Saroj". */
export const firstNameOf = (name: string | null | undefined): string | null =>
  name?.trim().split(/\s+/)[0] || null;

/** Fields for a brand-new account created with a valid code. */
export const referredUserFields = (referrerId: Types.ObjectId, settings: ReferralSettings) => ({
  referredBy: referrerId,
  bonusCredits: settings.creditsPerReferral,
});

/**
 * Pay the inviter for one new sign-up, as ONE atomic update conditional on
 * `referralCount < cap`. However many referred sign-ups land at once, each
 * update re-checks the count it increments, so the cap can't be overshot.
 * Returns whether the inviter was paid.
 */
export const rewardReferrer = async (
  referrerId: Types.ObjectId,
  settings: ReferralSettings,
): Promise<boolean> => {
  const credits = settings.creditsPerReferral;
  const result = await UserModel.updateOne(
    { _id: referrerId, referralCount: { $lt: settings.maxRewardedReferrals } },
    { $inc: { referralCount: 1, bonusCredits: credits, referralCreditsEarned: credits } },
  );
  return result.modifiedCount > 0;
};
