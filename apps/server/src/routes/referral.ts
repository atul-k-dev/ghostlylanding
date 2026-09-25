import { Router } from 'express';
import { ok, err, type ReferralLookup, type ReferralSummary } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { UserModel } from '../models/user.model.js';
import { ensureReferralCode, findReferrer, firstNameOf, inviteLink } from '../referrals/referrals.js';
import { getReferralSettings } from '../referrals/settings.js';

export const referralRouter = Router();

/** The Invite Friends screen: the user's code and link (created on first
 *  visit), and what inviting has earned them so far. */
referralRouter.get(
  '/',
  requireAuth,
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    key: (req) => `referral:${req.auth?.sub ?? req.ip}`,
  }),
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const code = await ensureReferralCode(req.auth.sub);
    const user = await UserModel.findById(req.auth.sub, {
      referralCount: 1,
      referralCreditsEarned: 1,
    }).lean();
    if (!user || !code) {
      res.status(404).json(err('user_not_found', 'User no longer exists'));
      return;
    }
    const settings = await getReferralSettings();
    const count = user.referralCount ?? 0;
    const summary: ReferralSummary = {
      code,
      link: inviteLink(code),
      creditsPerReferral: settings.creditsPerReferral,
      count,
      creditsEarned: user.referralCreditsEarned ?? 0,
      cap: settings.maxRewardedReferrals,
      remaining: Math.max(0, settings.maxRewardedReferrals - count),
    };
    res.json(ok(summary));
  }),
);

/**
 * Public: is this invite code real, and whose is it? Used by the website's
 * invite page (and its link preview) and the extension's "X invited you"
 * banner. First name only — the code's owner chose to share it, but nothing
 * more about them needs to be public. Rate-limited per IP, since it's an
 * unauthenticated way to probe for codes.
 */
referralRouter.get(
  '/lookup/:code',
  rateLimit({ windowMs: 60 * 1000, max: 30 }),
  asyncHandler(async (req, res) => {
    const [referrer, settings] = await Promise.all([
      findReferrer(typeof req.params.code === 'string' ? req.params.code : null),
      getReferralSettings(),
    ]);
    const body: ReferralLookup = referrer
      ? { valid: true, inviterName: firstNameOf(referrer.name), bonusCredits: settings.creditsPerReferral }
      : { valid: false, inviterName: null, bonusCredits: 0 };
    res.json(ok(body));
  }),
);
