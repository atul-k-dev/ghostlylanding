import { Router } from 'express';
import { z } from 'zod';
import { ok, err, ACTION_TYPES, PLATFORMS, currentPeriodKey } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { ActionLogModel } from '../models/action-log.model.js';
import { UserModel } from '../models/user.model.js';
import { Types } from 'mongoose';

export const actionsRouter = Router();

const entrySchema = z.object({
  /** Dedupe key from the client. Optional: extensions older than this change
   *  don't send one, and those entries fall back to plain inserts. */
  clientId: z.string().min(8).max(64).optional(),
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
  // The client's IANA timezone, sent so the server can time the end-of-day
  // recap email to the user's local day (kept fresh on every flush).
  timezone: z.string().max(64).optional(),
});

/** Cheap IANA-timezone validity check (rejects garbage before we persist it). */
const isValidTimezone = (tz: string): boolean => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

actionsRouter.post(
  '/log',
  requireAuth,
  // Legit clients flush at most every 5 min; 20/min/user is generous.
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    key: (req) => `log:${req.auth?.sub ?? req.ip}`,
  }),
  validate(batchSchema),
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const { entries, timezone } = req.body as z.infer<typeof batchSchema>;
    // Keep the user's timezone current for the daily digest — strictly
    // best-effort: fire-and-forget so a failure here can never block or fail
    // action logging (the core path). Only writes when it actually changed.
    if (timezone && isValidTimezone(timezone)) {
      void UserModel.updateOne(
        { _id: req.auth.sub, 'preferences.timezone': { $ne: timezone } },
        { $set: { 'preferences.timezone': timezone } },
      ).catch((e) => req.log.warn({ err: e }, 'timezone sync failed (non-fatal)'));
    }
    // A real ObjectId, not the JWT's string: bulkWrite filters bypass Mongoose's
    // casting, so a string here would match nothing and re-insert every entry.
    const userId = new Types.ObjectId(req.auth.sub);
    const docs = entries.map((e) => ({
      userId,
      clientId: e.clientId ?? null,
      platform: e.platform,
      actionType: e.actionType,
      targetUrl: e.targetUrl,
      targetHandle: e.targetHandle ?? null,
      success: e.success,
      errorMessage: e.errorMessage ?? null,
      timestamp: new Date(e.timestamp),
    }));

    // Only entries that were actually NEW may move the monthly counter. The
    // extension keeps its buffer whenever a flush appears to fail — including a
    // lost response to a request we already committed — so a retry re-sends
    // actions we already have. Counting those again would burn a free user's
    // 50-action allowance on work Ghostly did once.
    const identified = docs.filter((d) => d.clientId !== null);
    const anonymous = docs.filter((d) => d.clientId === null);

    let insertedCount = 0;
    let successCount = 0;

    if (identified.length > 0) {
      // Upsert on (userId, clientId): `upsertedIds` tells us exactly which rows
      // were new, which a plain insertMany with duplicate-key errors would not.
      const result = await ActionLogModel.bulkWrite(
        identified.map((d) => ({
          updateOne: {
            filter: { userId: d.userId, clientId: d.clientId },
            update: { $setOnInsert: d },
            upsert: true,
          },
        })),
        { ordered: false },
      );
      const newIndexes = new Set(Object.keys(result.upsertedIds ?? {}).map(Number));
      insertedCount += newIndexes.size;
      successCount += identified.filter((d, i) => newIndexes.has(i) && d.success).length;
    }

    if (anonymous.length > 0) {
      // Legacy clients: no dedupe key to work with, so behave as before.
      const inserted = await ActionLogModel.insertMany(anonymous, { ordered: false });
      insertedCount += inserted.length;
      successCount += anonymous.filter((d) => d.success).length;
    }
    let monthlyActionCount: number | undefined;
    if (successCount > 0) {
      const periodKey = currentPeriodKey();
      // Roll the monthly counter over at the month boundary (only matches when
      // the stored period differs), then add this batch.
      await UserModel.updateOne(
        { _id: req.auth.sub, actionPeriodKey: { $ne: periodKey } },
        { $set: { actionPeriodKey: periodKey, monthlyActionCount: 0 } },
      );
      const updated = await UserModel.findByIdAndUpdate(
        req.auth.sub,
        { $inc: { monthlyActionCount: successCount } },
        { new: true, projection: { monthlyActionCount: 1 } },
      );
      monthlyActionCount = updated?.monthlyActionCount ?? undefined;
    }
    res.json(
      ok({
        inserted: insertedCount,
        duplicates: docs.length - insertedCount,
        ...(monthlyActionCount !== undefined ? { monthlyActionCount } : {}),
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
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    key: (req) => `loglist:${req.auth?.sub ?? req.ip}`,
  }),
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
