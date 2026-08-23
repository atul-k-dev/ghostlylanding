import { Router } from 'express';
import { z } from 'zod';
import { ok, err, isPro, SUBSCRIPTION_PLANS, PAID_PLANS } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { config } from '../config.js';
import { UserModel, toUserDTO } from '../models/user.model.js';
import { getStripe, hasStripe, priceIdForPlan } from '../stripe/client.js';
import { applySubscription } from '../stripe/subscriptions.js';
import type Stripe from 'stripe';

export const billingRouter = Router();

const checkoutSchema = z.object({
  plan: z.enum(SUBSCRIPTION_PLANS).refine((p) => p !== 'free', {
    message: `plan must be one of: ${PAID_PLANS.join(', ')}`,
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

    // Don't let an already-subscribed user start a second checkout — that would
    // create a duplicate subscription and double-bill them. Send them to the
    // billing portal instead.
    if (isPro(user.subscriptionStatus as Parameters<typeof isPro>[0])) {
      res.status(409).json(
        err(
          'already_subscribed',
          'You already have an active Ghostly247 Pro subscription. Manage it from the billing portal.',
        ),
      );
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

// -- POST /confirm-session ---------------------------------------------------
// Called by the extension the moment the user returns from Stripe Checkout.
// Verifies the session belongs to this user and applies the subscription
// immediately, so Pro is granted without waiting on (or needing) the async
// webhook — the webhook stays the canonical sync for later status changes.
const confirmSchema = z.object({ sessionId: z.string().min(1).max(255) });

billingRouter.post(
  '/confirm-session',
  requireAuth,
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    key: (req) => `confirm:${req.auth?.sub ?? req.ip}`,
  }),
  validate(confirmSchema),
  asyncHandler(async (req, res) => {
    if (!hasStripe()) {
      res.status(503).json(err('billing_unconfigured', 'Billing is not configured on the server'));
      return;
    }
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const { sessionId } = req.body as z.infer<typeof confirmSchema>;
    const stripe = getStripe();

    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    } catch {
      res.status(404).json(err('session_not_found', 'No such checkout session'));
      return;
    }

    // The session must belong to this user (we set both at creation time).
    const sessionUserId =
      (session.metadata?.userId as string | undefined) ??
      (session.client_reference_id ?? undefined);
    if (sessionUserId && sessionUserId !== req.auth.sub) {
      res.status(403).json(err('session_mismatch', 'This checkout session is not yours'));
      return;
    }

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      res.status(409).json(err('not_paid', 'Checkout is not completed yet'));
      return;
    }

    // Resolve the subscription (expanded above; retrieve if Stripe returned an id).
    let sub: Stripe.Subscription | null = null;
    if (session.subscription && typeof session.subscription !== 'string') {
      sub = session.subscription;
    } else if (typeof session.subscription === 'string') {
      sub = await stripe.subscriptions.retrieve(session.subscription);
    }
    if (!sub) {
      res.status(409).json(err('no_subscription', 'Checkout has no subscription yet'));
      return;
    }

    const updated = await applySubscription(req.auth.sub, sub);
    if (!updated) {
      res.status(404).json(err('user_not_found', 'User no longer exists'));
      return;
    }
    res.json(ok(toUserDTO(updated.toObject() as Parameters<typeof toUserDTO>[0])));
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
