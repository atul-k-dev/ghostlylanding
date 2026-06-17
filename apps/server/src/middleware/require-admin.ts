import type { Request, Response, NextFunction } from 'express';
import { err } from '@casper/shared';
import { UserModel } from '../models/user.model.js';

/**
 * Gate admin-only routes. Must run after requireAuth.
 * Loads the user and checks the isAdmin flag (set via the set-admin script),
 * and stashes the doc on req for handlers to reuse.
 */
export const requireAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.auth) {
    res.status(401).json(err('unauthorized', 'No auth context'));
    return;
  }
  const user = await UserModel.findById(req.auth.sub).lean();
  if (!user) {
    res.status(404).json(err('user_not_found', 'User no longer exists'));
    return;
  }
  if (!user.isAdmin) {
    res.status(403).json(err('forbidden', 'Admin access required'));
    return;
  }
  next();
};
