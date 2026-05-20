import { Router } from 'express';
import { z } from 'zod';
import { ok, err, ACTION_TYPES, PLATFORMS } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { ActionLogModel } from '../models/action-log.model.js';
import { UserModel } from '../models/user.model.js';
import type { Types } from 'mongoose';

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
    const successCount = docs.filter((d) => d.success).length;
    let lifetimeActionCount: number | undefined;
    if (successCount > 0) {
      const updated = await UserModel.findByIdAndUpdate(
        req.auth.sub,
        { $inc: { lifetimeActionCount: successCount } },
        { new: true, projection: { lifetimeActionCount: 1 } },
      );
      lifetimeActionCount = updated?.lifetimeActionCount ?? undefined;
    }
    res.json(
      ok({
        inserted: inserted.length,
        ...(lifetimeActionCount !== undefined ? { lifetimeActionCount } : {}),
      }),
    );
  }),
);

const listSchema = z.object({
  limit: z.coerce.number().int().positive().max(200).default(50),
});

actionsRouter.get(
  '/log',
  requireAuth,
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const { limit } = req.query as unknown as z.infer<typeof listSchema>;
    const entries = await ActionLogModel.find({ userId: req.auth.sub })
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
    res.json(
      ok({
        entries: entries.map((e) => ({
          id: (e._id as Types.ObjectId).toString(),
          platform: e.platform,
          actionType: e.actionType,
          targetUrl: e.targetUrl,
          targetHandle: e.targetHandle ?? null,
          success: e.success,
          errorMessage: e.errorMessage ?? null,
          timestamp: (e.timestamp as Date).toISOString(),
        })),
      }),
    );
  }),
);
