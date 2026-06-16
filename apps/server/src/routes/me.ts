import { Router } from 'express';
import { z } from 'zod';
import { ok, err } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { UserModel, toUserDTO } from '../models/user.model.js';

export const meRouter = Router();

const prefsUpdateSchema = z.object({
  keywords: z.array(z.string().trim().min(1).max(60)).max(50).optional(),
});

meRouter.get(
  '/',
  requireAuth,
  // Popup polls /me every 15s for plan updates. 60/min/user covers that with a
  // safety margin and shuts down a runaway loop.
  rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    key: (req) => `me:${req.auth?.sub ?? req.ip}`,
  }),
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

// Update the user's saved preferences (currently home-feed keywords). Persisted
// to the DB so they survive reinstalls and sync across devices.
meRouter.patch(
  '/preferences',
  requireAuth,
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    key: (req) => `prefs:${req.auth?.sub ?? req.ip}`,
  }),
  validate(prefsUpdateSchema),
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
    const { keywords } = req.body as { keywords?: string[] };
    if (keywords) {
      // De-dupe defensively and cap.
      user.preferences.keywords = [...new Set(keywords.map((k) => k.trim()).filter(Boolean))].slice(
        0,
        50,
      );
    }
    await user.save();
    res.json(ok(toUserDTO(user.toObject() as Parameters<typeof toUserDTO>[0])));
  }),
);
