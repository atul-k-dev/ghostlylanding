import type Stripe from 'stripe';
import { UserModel } from '../models/user.model.js';
import { planForPriceId } from './client.js';

/** Map Stripe's subscription status onto our SubscriptionStatus values. */
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

/**
 * Persist a Stripe subscription onto the user. Shared by the webhook (async,
 * canonical) and the checkout confirm endpoint (sync, so Pro is granted the
 * instant the user returns even if the webhook is slow / not running locally).
 * Returns the updated user doc.
 */
export const applySubscription = async (userId: string, sub: Stripe.Subscription) => {
  const item = sub.items.data[0];
  const priceId = item?.price.id;
  const plan = priceId ? planForPriceId(priceId) : null;
  const status = sub.status;
  // Newer Stripe API moved current_period_* off the Subscription onto each item.
  // Read whichever is present so we work across api versions.
  const subAny = sub as unknown as { current_period_end?: number };
  const itemAny = item as unknown as { current_period_end?: number } | undefined;
  const periodEndUnix = subAny.current_period_end ?? itemAny?.current_period_end ?? null;
  return UserModel.findByIdAndUpdate(
    userId,
    {
      stripeSubscriptionId: sub.id,
      subscriptionStatus: status === 'trialing' ? 'trialing' : mapStatus(status),
      subscriptionPlan: plan ?? 'monthly',
      currentPeriodEnd: periodEndUnix ? new Date(periodEndUnix * 1000) : null,
    },
    { new: true },
  );
};
