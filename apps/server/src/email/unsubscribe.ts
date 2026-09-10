/**
 * Signed unsubscribe links, shared by every digest email (daily, weekly).
 *
 * One HMAC-signed token per user — proving "this is really them," not which
 * digest they're unsubscribing from — plus a `kind` query param that says
 * which preference flag the click should flip. Factored out of
 * `daily-summary.ts` in updateplan 4.4 when the weekly email needed the exact
 * same one-click mechanism: the plan's "honour the existing unsubscribe
 * route" means the route stays one route, parameterized, not a second one.
 */
import crypto from 'node:crypto';
import { config } from '../config.js';

export type DigestKind = 'daily' | 'weekly';

const unsubToken = (userId: string): string =>
  crypto
    .createHmac('sha256', config.jwtSecret ?? '')
    .update(`digest:${userId}`)
    .digest('hex');

/** `kind` defaults to 'daily' so links already sent before 4.4 keep working. */
export const buildUnsubscribeUrl = (userId: string, kind: DigestKind = 'daily'): string =>
  `${config.serverBaseUrl}/r/email/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubToken(userId)}&k=${kind}`;

export const verifyUnsubToken = (userId: string, token: string): boolean => {
  const expected = unsubToken(userId);
  if (token.length !== expected.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
};
