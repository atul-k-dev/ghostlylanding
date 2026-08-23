import Stripe from 'stripe';
import { PAID_PLANS, type SubscriptionPlan } from '@casper/shared';
import { config } from '../config.js';

let cached: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (cached) return cached;
  if (!config.stripeSecretKey) {
    throw new Error('STRIPE_SECRET_KEY is not set');
  }
  cached = new Stripe(config.stripeSecretKey, {
    // Pin a known stable version. Update intentionally, not by accident.
    apiVersion: '2025-01-27.acacia' as Stripe.LatestApiVersion,
    typescript: true,
  });
  return cached;
};

export const hasStripe = (): boolean =>
  Boolean(config.stripeSecretKey && config.stripeWebhookSecret);

/** Map a plan key to a configured Price ID; null if that plan isn't configured. */
export const priceIdForPlan = (plan: SubscriptionPlan): string | null => {
  if (plan === 'free') return null;
  return config.stripePrices[plan] ?? null;
};

/** Reverse lookup: given a Price ID, return the plan key (or null). */
export const planForPriceId = (priceId: string): SubscriptionPlan | null => {
  for (const plan of PAID_PLANS) {
    if (config.stripePrices[plan] === priceId) return plan;
  }
  return null;
};
