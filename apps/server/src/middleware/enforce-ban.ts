import type { Request, Response, NextFunction } from 'express';
import { err } from '@casper/shared';
import { verifyJwt } from '../auth/jwt.js';
import { UserModel } from '../models/user.model.js';

/**
 * App-level guard that blocks suspended accounts on every authenticated request.
 *
 * Runs ahead of the per-route `requireAuth`. If a valid bearer token is present
 * and its user is banned, the request is rejected with 403. Requests without a
 * token (or with an invalid one) fall through untouched — `requireAuth` handles
 * those. This means a ban takes effect immediately, even for already-issued
 * long-lived JWTs.
 */
export const enforceBan = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const header = req.header('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    next();
    return;
  }
  let sub: string;
  try {
    sub = verifyJwt(header.slice(7).trim()).sub;
  } catch {
    // Let requireAuth produce the 401 for malformed/expired tokens.
    next();
    return;
  }
  try {
    const user = await UserModel.findById(sub).select('isBanned').lean();
    if (user?.isBanned) {
      res.status(403).json(err('account_suspended', 'This account has been suspended.'));
      return;
    }
  } catch {
    // On a lookup error, don't hard-fail the request here; downstream auth/handlers
    // will deal with it. Banning is best-effort at this layer.
  }
  next();
};
