import type { Request, Response, NextFunction } from 'express';
import { err, isPro } from '@casper/shared';
import { UserModel } from '../models/user.model.js';

/**
 * Gate routes that are Pro-only (e.g. AI comment generation).
 * Must run after requireAuth.
 */
export const requirePro = async (
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
  if (!isPro(user.subscriptionStatus as Parameters<typeof isPro>[0])) {
    res.status(402).json(
      err(
        'pro_required',
        'This feature is part of Ghostly247 Pro. Upgrade to unlock AI comments.',
      ),
    );
    return;
  }
  next();
};
