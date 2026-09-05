/**
 * Diagnostic ingest. The extension batches its local diagnostics and flushes
 * them here alongside the action log, so a DOM breakage shows up on our side
 * while it's happening rather than in next week's support queue.
 */
import { Router } from 'express';
import { z } from 'zod';
import { ok, err } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { DiagnosticModel, DIAGNOSTIC_KINDS } from '../models/diagnostic.model.js';

export const diagnosticsRouter = Router();

const entrySchema = z.object({
  kind: z.enum(DIAGNOSTIC_KINDS),
  context: z.string().min(1).max(120),
  detail: z.string().max(500).optional(),
  at: z.string().datetime(),
});

const batchSchema = z.object({
  entries: z.array(entrySchema).min(1).max(100),
  extensionVersion: z.string().max(32).optional(),
  selectorVersion: z.string().max(32).optional(),
});

diagnosticsRouter.post(
  '/',
  requireAuth,
  // Flushed on the same cadence as action logs (every ~5 min at most).
  rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    key: (req) => `diag:${req.auth?.sub ?? req.ip}`,
  }),
  validate(batchSchema),
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const { entries, extensionVersion, selectorVersion } = req.body as z.infer<typeof batchSchema>;
    const docs = entries.map((e) => ({
      userId: req.auth!.sub,
      kind: e.kind,
      context: e.context,
      detail: e.detail ?? null,
      extensionVersion: extensionVersion ?? null,
      selectorVersion: selectorVersion ?? null,
      at: new Date(e.at),
    }));
    const inserted = await DiagnosticModel.insertMany(docs, { ordered: false });
    res.json(ok({ inserted: inserted.length }));
  }),
);
