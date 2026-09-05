/**
 * Minimal token-bucket rate limiter.
 *
 * IN-MEMORY, and therefore per-process: counters reset on deploy, and two API
 * instances would each allow the full quota. That's fine while we run one node.
 * The day we scale out, this and the daily-summary job are the two things that
 * need a shared store — see the claim comment in jobs/daily-summary.ts.
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

/**
 * Every limiter shares this map, so each instance gets its own namespace. Two
 * limiters with different windows that happened to produce the same key would
 * otherwise share one bucket — whichever created it would impose ITS window and
 * ceiling on the other, silently. Today only the global backstop uses the
 * default key, so nothing collides; this makes that safe by construction rather
 * than by luck.
 */
let limiterCount = 0;

const defaultKey = (req: Request): string =>
  (req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    'anon').toLowerCase();

export const rateLimit = (opts: Options) => {
  const { windowMs, max } = opts;
  const keyFn = opts.key ?? defaultKey;
  const namespace = `l${limiterCount++}:`;
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = namespace + keyFn(req);
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
