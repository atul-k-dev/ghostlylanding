import { Router } from 'express';
import { z } from 'zod';
import { ok, err, SUBSCRIPTION_PLANS } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { config } from '../config.js';
import { UserModel } from '../models/user.model.js';
import { getStripe, hasStripe, priceIdForPlan } from '../stripe/client.js';

export const billingRouter = Router();

const checkoutSchema = z.object({
  plan: z.enum(SUBSCRIPTION_PLANS).refine((p) => p !== 'free', {
    message: 'plan must be monthly, quarterly, or annual',
  }),
});

billingRouter.post(
  '/checkout-session',
  requireAuth,
  // Each checkout session creation hits Stripe's API. 10/min/user is plenty.
  rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    key: (req) => `checkout:${req.auth?.sub ?? req.ip}`,
  }),
  validate(checkoutSchema),
  asyncHandler(async (req, res) => {
    if (!hasStripe()) {
      res.status(503).json(err('billing_unconfigured', 'Billing is not configured on the server'));
      return;
    }
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const { plan } = req.body as z.infer<typeof checkoutSchema>;
    const priceId = priceIdForPlan(plan);
    if (!priceId) {
      res.status(400).json(err('plan_unconfigured', `Stripe price for ${plan} is not configured`));
      return;
    }

    const user = await UserModel.findById(req.auth.sub);
    if (!user) {
      res.status(404).json(err('user_not_found', 'User no longer exists'));
      return;
    }

    const stripe = getStripe();
    let customerId = user.stripeCustomerId ?? null;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user._id.toString() },
      });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${config.serverBaseUrl}/r/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${config.serverBaseUrl}/r/cancel`,
      allow_promotion_codes: true,
      client_reference_id: user._id.toString(),
      subscription_data: {
        metadata: { userId: user._id.toString() },
      },
      metadata: { userId: user._id.toString(), plan },
    });

    if (!session.url) {
      res.status(502).json(err('no_checkout_url', 'Stripe returned no checkout URL'));
      return;
    }
    res.json(ok({ url: session.url, sessionId: session.id }));
  }),
);

billingRouter.post(
  '/portal',
  requireAuth,
  rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    key: (req) => `portal:${req.auth?.sub ?? req.ip}`,
  }),
  asyncHandler(async (req, res) => {
    if (!hasStripe()) {
      res.status(503).json(err('billing_unconfigured', 'Billing is not configured on the server'));
      return;
    }
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const user = await UserModel.findById(req.auth.sub);
    if (!user || !user.stripeCustomerId) {
      res.status(404).json(err('no_customer', 'No Stripe customer for this user yet'));
      return;
    }
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${config.serverBaseUrl}/r/success`,
    });
    res.json(ok({ url: session.url }));
  }),
);
