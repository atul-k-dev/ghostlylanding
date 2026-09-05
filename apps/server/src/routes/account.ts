import { Router } from 'express';
import { ok, err } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { UserModel } from '../models/user.model.js';
import { ActionLogModel } from '../models/action-log.model.js';
import { CommentDraftModel } from '../models/comment-draft.model.js';
import { GrowthSnapshotModel } from '../models/growth-snapshot.model.js';
import { PostOutcomeModel } from '../models/post-outcome.model.js';
import { DiagnosticModel } from '../models/diagnostic.model.js';
import { getStripe, hasStripe } from '../stripe/client.js';

export const accountRouter = Router();

/**
 * §10 — user-owned deletion. Hard-delete all derived data.
 */
accountRouter.delete(
  '/',
  requireAuth,
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    key: (req) => `delacct:${req.auth?.sub ?? req.ip}`,
  }),
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const userId = req.auth.sub;
    const user = await UserModel.findById(userId);

    // Stop billing in Stripe BEFORE we delete the user — otherwise a deleted
    // account keeps getting charged with no way to reach the billing portal.
    // Deleting the customer also cancels its subscriptions; we cancel the sub
    // explicitly first so billing stops even if customer deletion fails. Both
    // are best-effort: a Stripe hiccup must not block the user's data wipe.
    if (user && hasStripe() && user.stripeCustomerId) {
      const stripe = getStripe();
      if (user.stripeSubscriptionId) {
        try {
          await stripe.subscriptions.cancel(user.stripeSubscriptionId);
        } catch (e) {
          req.log.error({ err: e, userId }, 'failed to cancel Stripe subscription on delete');
        }
      }
      try {
        await stripe.customers.del(user.stripeCustomerId);
      } catch (e) {
        req.log.error({ err: e, userId }, 'failed to delete Stripe customer on delete');
      }
    }

    // EVERY collection keyed by userId must be listed here. When you add one,
    // add it here in the same change — "delete my account" is a promise in
    // FEATURES.md and a legal obligation, not a tidy-up.
    const [actionLogs, drafts, snapshots, outcomes, diagnostics] = await Promise.all([
      ActionLogModel.deleteMany({ userId }),
      CommentDraftModel.deleteMany({ userId }),
      GrowthSnapshotModel.deleteMany({ userId }),
      PostOutcomeModel.deleteMany({ userId }),
      DiagnosticModel.deleteMany({ userId }),
    ]);
    // The user document goes last: while it exists the account is still
    // identifiable, so a failure part-way through leaves data we can retry
    // deleting rather than orphaned rows no request can reach.
    if (user) await user.deleteOne();

    const deleted = {
      user: user ? 1 : 0,
      actionLogs: actionLogs.deletedCount,
      drafts: drafts.deletedCount,
      growthSnapshots: snapshots.deletedCount,
      postOutcomes: outcomes.deletedCount,
      diagnostics: diagnostics.deletedCount,
    };

    req.log.info({ userId, deleted }, 'account wiped');

    res.json(ok({ deleted }));
  }),
);
