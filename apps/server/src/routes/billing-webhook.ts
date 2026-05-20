import { Router, raw } from 'express';
import type Stripe from 'stripe';
import { ok, err } from '@casper/shared';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { getStripe, hasStripe, planForPriceId } from '../stripe/client.js';
import { UserModel } from '../models/user.model.js';

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

    try {
      await handleEvent(event);
      res.json(ok({ received: true }));
    } catch (e) {
      logger.error({ err: e, type: event.type }, 'stripe webhook handler failed');
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

const applySubscription = async (userId: string, sub: Stripe.Subscription): Promise<void> => {
  const item = sub.items.data[0];
  const priceId = item?.price.id;
  const plan = priceId ? planForPriceId(priceId) : null;
  const status = sub.status;
  // Newer Stripe API moved current_period_* off the Subscription onto each item.
  // Read whichever is present so we work across api versions.
  const subAny = sub as unknown as { current_period_end?: number };
  const itemAny = item as unknown as { current_period_end?: number } | undefined;
  const periodEndUnix = subAny.current_period_end ?? itemAny?.current_period_end ?? null;
  await UserModel.findByIdAndUpdate(userId, {
    stripeSubscriptionId: sub.id,
    subscriptionStatus: status === 'trialing' ? 'trialing' : mapStatus(status),
    subscriptionPlan: plan ?? 'monthly',
    currentPeriodEnd: periodEndUnix ? new Date(periodEndUnix * 1000) : null,
  });
};

const mapStatus = (s: Stripe.Subscription.Status): string => {
  switch (s) {
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
      return 'incomplete';
    case 'unpaid':
      return 'past_due';
    case 'paused':
      return 'past_due';
    default:
      return 'active';
  }
};
