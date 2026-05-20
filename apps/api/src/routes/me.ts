import { Router } from 'express';
import { ok, err } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { UserModel, toUserDTO } from '../models/user.model.js';

export const meRouter = Router();

meRouter.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const user = await UserModel.findById(req.auth.sub);
    if (!user) {
      res.status(404).json(err('user_not_found', 'User no longer exists'));
      return;
    }
    res.json(ok(toUserDTO(user.toObject() as Parameters<typeof toUserDTO>[0])));
  }),
);
