import type Stripe from 'stripe';
import { config } from '../config.js';
import { getStripe } from './client.js';

export interface RevenuePayment {
  id: string;
  amount: number; // major units (e.g. dollars)
  currency: string;
  email: string | null;
  created: string; // ISO
  status: string;
  refunded: boolean;
}

export interface RevenueOverview {
  configured: boolean;
  currency: string;
  mrr: number; // monthly recurring revenue, major units
  arpu: number; // mrr / active subscriptions, major units
  subscriptions: { active: number; trialing: number; pastDue: number; total: number };
  revenue: { today: number; last7d: number; last30d: number; lifetime: number };
  timeseries: { date: string; amount: number }[];
  recentPayments: RevenuePayment[];
}

// Currencies Stripe treats as zero-decimal (amount is already in major units).
const ZERO_DECIMAL = new Set([
  'bif', 'clp', 'djf', 'gnf', 'jpy', 'kmf', 'krw', 'mga', 'pyg', 'rwf',
  'ugx', 'vnd', 'vuv', 'xaf', 'xof', 'xpf',
]);

const toMajor = (amount: number, currency: string): number =>
  ZERO_DECIMAL.has(currency.toLowerCase()) ? amount : amount / 100;

/** Normalize a recurring price to its monthly-equivalent amount (in cents). */
const monthlyAmount = (price: Stripe.Price | null, quantity: number): number => {
  if (!price?.unit_amount || !price.recurring) return 0;
  const base = price.unit_amount * quantity;
  const count = price.recurring.interval_count || 1;
  switch (price.recurring.interval) {
    case 'month':
      return base / count;
    case 'year':
      return base / (12 * count);
    case 'week':
      return (base * 52) / 12 / count;
    case 'day':
      return (base * 365) / 12 / count;
    default:
      return base;
  }
};

const startOfUTCDay = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

/**
 * The Stripe account is shared with another product, so everything below is
 * scoped to the product(s) named `config.stripeProductName` — archived ones
 * included, so revenue from a retired price still counts.
 */
const findProductIds = async (stripe: Stripe): Promise<Set<string>> => {
  const products = await stripe.products.list({ limit: 100 }).autoPagingToArray({ limit: 1000 });
  const ids = products.filter((p) => p.name.trim() === config.stripeProductName).map((p) => p.id);
  if (ids.length === 0) {
    throw new Error(`No Stripe product named "${config.stripeProductName}"`);
  }
  return new Set(ids);
};

const productOf = (price: Stripe.Price | string | null | undefined): string | null => {
  if (!price || typeof price === 'string') return null;
  return typeof price.product === 'string' ? price.product : (price.product?.id ?? null);
};

/** A charge belongs to us when its invoice bills one of our products. */
const chargeIsOurs = (charge: Stripe.Charge, productIds: Set<string>): boolean => {
  const invoice = charge.invoice;
  if (!invoice || typeof invoice === 'string') return false;
  return invoice.lines.data.some((line) => productIds.has(productOf(line.price) ?? ''));
};

// Lightweight in-memory cache — Stripe calls are not free and the dashboard
// hits this on every load. 60s is fresh enough for an ops view.
let cache: { at: number; days: number; data: RevenueOverview } | null = null;
const TTL_MS = 60 * 1000;

const CHARGE_SCAN_CAP = 2000;

export const getRevenueOverview = async (days = 30): Promise<RevenueOverview> => {
  if (!config.stripeSecretKey) {
    return {
      configured: false,
      currency: 'usd',
      mrr: 0,
      arpu: 0,
      subscriptions: { active: 0, trialing: 0, pastDue: 0, total: 0 },
      revenue: { today: 0, last7d: 0, last30d: 0, lifetime: 0 },
      timeseries: [],
      recentPayments: [],
    };
  }

  if (cache && cache.days === days && Date.now() - cache.at < TTL_MS) {
    return cache.data;
  }

  const stripe = getStripe();
  const now = new Date();
  const productIds = await findProductIds(stripe);
  const isOurItem = (item: Stripe.SubscriptionItem) => productIds.has(productOf(item.price) ?? '');
  const listOurSubs = async (status: 'active' | 'trialing' | 'past_due') => {
    const subs = await stripe.subscriptions
      .list({ status, limit: 100, expand: ['data.items.data.price'] })
      .autoPagingToArray({ limit: 1000 });
    return subs.filter((sub) => sub.items.data.some(isOurItem));
  };

  // --- Subscriptions → MRR --------------------------------------------------
  const [activeSubs, trialingSubs, pastDueSubs] = await Promise.all([
    listOurSubs('active'),
    listOurSubs('trialing'),
    listOurSubs('past_due'),
  ]);

  let mrrCents = 0;
  let subCurrency = 'usd';
  for (const sub of activeSubs) {
    for (const item of sub.items.data.filter(isOurItem)) {
      const price = item.price as Stripe.Price;
      if (price?.currency) subCurrency = price.currency;
      mrrCents += monthlyAmount(price, item.quantity ?? 1);
    }
  }

  // --- Charges → gross volume + daily timeseries ----------------------------
  const charges = await stripe.charges
    .list({ limit: 100, expand: ['data.invoice'] })
    .autoPagingToArray({ limit: CHARGE_SCAN_CAP });

  const succeeded = charges.filter(
    (c) => c.status === 'succeeded' && c.paid && chargeIsOurs(c, productIds),
  );

  const todayStart = startOfUTCDay(now).getTime() / 1000;
  const sevenStart = startOfUTCDay(new Date(now.getTime() - 6 * 86400_000)).getTime() / 1000;
  const thirtyStart = startOfUTCDay(new Date(now.getTime() - 29 * 86400_000)).getTime() / 1000;
  const seriesStart = startOfUTCDay(new Date(now.getTime() - (days - 1) * 86400_000));

  let today = 0;
  let last7d = 0;
  let last30d = 0;
  let lifetime = 0;
  let chargeCurrency = subCurrency;

  // Zero-filled daily buckets for the chart.
  const buckets = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(seriesStart.getTime() + i * 86400_000);
    buckets.set(d.toISOString().slice(0, 10), 0);
  }

  for (const c of succeeded) {
    const net = c.amount - (c.amount_refunded ?? 0);
    if (net <= 0) continue;
    if (c.currency) chargeCurrency = c.currency;
    const major = toMajor(net, c.currency);
    lifetime += major;
    if (c.created >= todayStart) today += major;
    if (c.created >= sevenStart) last7d += major;
    if (c.created >= thirtyStart) last30d += major;

    const dayKey = new Date(c.created * 1000).toISOString().slice(0, 10);
    if (buckets.has(dayKey)) buckets.set(dayKey, (buckets.get(dayKey) ?? 0) + major);
  }

  const currency = chargeCurrency || subCurrency || 'usd';
  const round2 = (n: number) => Math.round(n * 100) / 100;
  const mrr = round2(toMajor(mrrCents, currency));

  const recentPayments: RevenuePayment[] = succeeded.slice(0, 10).map((c) => ({
    id: c.id,
    amount: round2(toMajor(c.amount, c.currency)),
    currency: c.currency,
    email: c.billing_details?.email ?? c.receipt_email ?? null,
    created: new Date(c.created * 1000).toISOString(),
    status: c.status,
    refunded: (c.amount_refunded ?? 0) > 0,
  }));

  const data: RevenueOverview = {
    configured: true,
    currency,
    mrr,
    arpu: activeSubs.length > 0 ? round2(mrr / activeSubs.length) : 0,
    subscriptions: {
      active: activeSubs.length,
      trialing: trialingSubs.length,
      pastDue: pastDueSubs.length,
      total: activeSubs.length + trialingSubs.length + pastDueSubs.length,
    },
    revenue: {
      today: round2(today),
      last7d: round2(last7d),
      last30d: round2(last30d),
      lifetime: round2(lifetime),
    },
    timeseries: [...buckets.entries()].map(([date, amount]) => ({ date, amount: round2(amount) })),
    recentPayments,
  };

  cache = { at: Date.now(), days, data };
  return data;
};
