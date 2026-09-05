import { Router, raw } from 'express';
import type Stripe from 'stripe';
import { ok, err } from '@casper/shared';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { getStripe, hasStripe } from '../stripe/client.js';
import { applySubscription } from '../stripe/subscriptions.js';
import { UserModel } from '../models/user.model.js';
import { WebhookEventModel } from '../models/webhook-event.model.js';

export const billingWebhookRouter = Router();

/**
 * Stripe sends events as JSON with a t=... v1=... signature header that's
 * verified against the *raw* request body. We mount this router BEFORE
 * express.json() so we get the buffer unparsed.
 */
billingWebhookRouter.post(
  '/webhook',
  raw({ type: 'application/json', limit: '1mb' }),
  async (req, res) => {
    if (!hasStripe()) {
      res.status(503).json(err('billing_unconfigured', 'Stripe not configured'));
      return;
    }
    const sig = req.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
      res.status(400).json(err('missing_signature', 'No Stripe signature header'));
      return;
    }

    const stripe = getStripe();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body as Buffer,
        sig,
        config.stripeWebhookSecret as string,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn({ err: msg }, 'stripe webhook signature verification failed');
      res.status(400).json(err('bad_signature', msg));
      return;
    }

    // Claim the event before handling it. The unique index on eventId makes this
    // the atomic gate: whoever inserts first handles it, everyone else (a Stripe
    // retry, or a second instance) sees the duplicate-key error and returns 200
    // without re-running the handler.
    try {
      await WebhookEventModel.create({ eventId: event.id, type: event.type });
    } catch (e) {
      const duplicate = (e as { code?: number }).code === 11000;
      if (duplicate) {
        logger.info({ eventId: event.id, type: event.type }, 'stripe webhook already handled');
        res.json(ok({ received: true, duplicate: true }));
        return;
      }
      // Couldn't record the claim for some other reason. Fail loudly so Stripe
      // retries rather than silently skipping a subscription change.
      logger.error({ err: e, eventId: event.id }, 'could not record stripe event');
      res.status(500).json(err('claim_failed', 'Could not record event'));
      return;
    }

    try {
      await handleEvent(event);
      res.json(ok({ received: true }));
    } catch (e) {
      logger.error({ err: e, type: event.type }, 'stripe webhook handler failed');
      // Release the claim so Stripe's retry actually re-runs the handler
      // instead of being waved through as a duplicate.
      await WebhookEventModel.deleteOne({ eventId: event.id }).catch(() => undefined);
      res.status(500).json(err('handler_error', 'Failed to handle event'));
    }
  },
);

const handleEvent = async (event: Stripe.Event): Promise<void> => {
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId =
        (session.metadata?.userId as string | undefined) ??
        (session.client_reference_id ?? undefined);
      const subId = session.subscription;
      if (!userId || !subId || typeof subId !== 'string') return;
      const sub = await getStripe().subscriptions.retrieve(subId);
      await applySubscription(userId, sub);
      logger.info({ userId, subId }, 'checkout.session.completed applied');
      return;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription;
      const userId =
        (sub.metadata?.userId as string | undefined) ??
        (await userIdFromCustomer(sub.customer));
      if (!userId) return;
      await applySubscription(userId, sub);
      logger.info({ userId, type: event.type }, 'subscription synced');
      return;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription;
      const userId =
        (sub.metadata?.userId as string | undefined) ??
        (await userIdFromCustomer(sub.customer));
      if (!userId) return;
      await UserModel.findByIdAndUpdate(userId, {
        subscriptionStatus: 'canceled',
        subscriptionPlan: 'free',
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
      });
      logger.info({ userId }, 'subscription canceled — reverted to free');
      return;
    }
    case 'invoice.payment_failed': {
      const inv = event.data.object as Stripe.Invoice;
      const userId = await userIdFromCustomer(inv.customer);
      if (!userId) return;
      await UserModel.findByIdAndUpdate(userId, { subscriptionStatus: 'past_due' });
      logger.warn({ userId }, 'invoice payment failed — marked past_due');
      return;
    }
    default:
      // Ignore other events
      return;
  }
};

const userIdFromCustomer = async (
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<string | null> => {
  const id = typeof customer === 'string' ? customer : customer?.id;
  if (!id) return null;
  const user = await UserModel.findOne({ stripeCustomerId: id });
  return user?._id.toString() ?? null;
};

