/**
 * Minimal per-IP token-bucket rate limiter. In-memory — sufficient for a single
 * API node; swap for Redis once we scale out.
 */
import type { Request, Response, NextFunction } from 'express';
import { err } from '@casper/shared';

interface Bucket {
  tokens: number;
  refillAt: number;
}

interface Options {
  windowMs: number;
  max: number;
  key?: (req: Request) => string;
}

const buckets = new Map<string, Bucket>();

const defaultKey = (req: Request): string =>
  (req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'anon').toLowerCase();

export const rateLimit = (opts: Options) => {
  const { windowMs, max } = opts;
  const keyFn = opts.key ?? defaultKey;
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyFn(req);
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || now >= b.refillAt) {
      buckets.set(key, { tokens: max - 1, refillAt: now + windowMs });
      next();
      return;
    }
    if (b.tokens <= 0) {
      const retryMs = b.refillAt - now;
      res
        .status(429)
        .set('Retry-After', String(Math.ceil(retryMs / 1000)))
        .json(err('rate_limited', `Try again in ${Math.ceil(retryMs / 1000)}s`));
      return;
    }
    b.tokens -= 1;
    next();
  };
};

// Background sweeper — drop expired buckets every minute so the map doesn't grow.
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) {
    if (now >= b.refillAt) buckets.delete(k);
  }
}, 60_000).unref();
