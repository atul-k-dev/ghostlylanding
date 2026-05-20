import { Router } from 'express';
import { z } from 'zod';
import { ok, err, ACTION_TYPES, PLATFORMS } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ActionLogModel } from '../models/action-log.model.js';

export const actionsRouter = Router();

const entrySchema = z.object({
  platform: z.enum(PLATFORMS),
  actionType: z.enum(ACTION_TYPES),
  targetUrl: z.string().url().max(2048),
  targetHandle: z.string().max(80).optional(),
  success: z.boolean(),
  errorMessage: z.string().max(500).optional(),
  timestamp: z.string().datetime(),
});

const batchSchema = z.object({
  entries: z.array(entrySchema).min(1).max(200),
});

actionsRouter.post(
  '/log',
  requireAuth,
  validate(batchSchema),
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const { entries } = req.body as z.infer<typeof batchSchema>;
    const docs = entries.map((e) => ({
      userId: req.auth!.sub,
      platform: e.platform,
      actionType: e.actionType,
      targetUrl: e.targetUrl,
      targetHandle: e.targetHandle ?? null,
      success: e.success,
      errorMessage: e.errorMessage ?? null,
      timestamp: new Date(e.timestamp),
    }));
    const inserted = await ActionLogModel.insertMany(docs, { ordered: false });
    res.json(ok({ inserted: inserted.length }));
  }),
);
