import { Router } from 'express';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { ok, err, PLATFORMS, TONE_PRESETS, FREE_TIER, isPro, monthlyActionsUsed } from '@casper/shared';
import type { CommentLength } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { generateCommentDraft } from '../openai/generate-comment.js';
import { moderate } from '../openai/moderation.js';
import { hasOpenAI } from '../openai/client.js';
import { CommentDraftModel } from '../models/comment-draft.model.js';
import { UserModel } from '../models/user.model.js';
import type { Types } from 'mongoose';

export const commentsRouter = Router();

const sha256 = (s: string): string => createHash('sha256').update(s).digest('hex');

// -- POST /generate ----------------------------------------------------------
const generateSchema = z.object({
  platform: z.enum(PLATFORMS),
  postText: z.string().min(1).max(4_000),
  postUrl: z.string().url().max(2_048),
  tone: z.enum(TONE_PRESETS).default('friendly'),
  // Reply length in short lines (1 ≈ 8–10 words). Defaults to 1 for older clients.
  length: z.coerce.number().int().min(1).max(3).default(1),
});

commentsRouter.post(
  '/generate',
  requireAuth,
  // Hard cap: 60 drafts per user per hour. Stops a compromised JWT from
  // running up an OpenAI bill and from spamming moderation.
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 60,
    key: (req) => `gen:${req.auth?.sub ?? req.ip}`,
  }),
  // Reply generation is a Pro feature for unlimited use; free users may generate
  // until they exhaust their monthly action allowance (likes + replies + follows
  // combined). Gating here bounds OpenAI spend — without it a free user (or a
  // leaked JWT) could keep generating long after using up their quota.
  validate(generateSchema),
  asyncHandler(async (req, res) => {
    if (!hasOpenAI()) {
      res.status(503).json(err('openai_unconfigured', 'OPENAI_API_KEY not set on the server'));
      return;
    }
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }

    const user = await UserModel.findById(req.auth.sub).lean();
    if (!user) {
      res.status(404).json(err('user_not_found', 'User no longer exists'));
      return;
    }
    if (
      !isPro(user.subscriptionStatus as Parameters<typeof isPro>[0]) &&
      monthlyActionsUsed(user) >= FREE_TIER.monthlyActions
    ) {
      res.status(402).json(
        err(
          'free_limit_reached',
          `Free plan: ${FREE_TIER.monthlyActions} actions/month used. Upgrade to Pro for unlimited AI replies.`,
        ),
      );
      return;
    }

    const { platform, postText, postUrl, tone, length } = req.body as z.infer<
      typeof generateSchema
    >;

    // §10: process post text in memory only — store its hash, never the text.
    const postTextHash = sha256(postText);

    // Pre-dedupe: if we already drafted this exact post for this user, return existing.
    const existing = await CommentDraftModel.findOne({
      userId: req.auth.sub,
      postTextHash,
      status: { $in: ['pending', 'approved'] },
    });
    if (existing) {
      res.json(
        ok({
          id: existing._id.toString(),
          platform: existing.platform,
          postUrl: existing.postUrl,
          draftText: existing.draftText,
          tone: existing.tone,
          status: existing.status,
          createdAt: existing.createdAt.toISOString(),
          dedupe: true,
        }),
      );
      return;
    }

    // Input moderation
    let inputModeration;
    try {
      inputModeration = await moderate(postText);
    } catch (e) {
      req.log.warn({ err: e }, 'moderation (input) failed — proceeding');
      inputModeration = { flagged: false, categories: [] };
    }
    if (inputModeration.flagged) {
      res.status(400).json(
        err(
          'input_flagged',
          `Post content flagged: ${inputModeration.categories.join(', ') || 'unknown'}`,
        ),
      );
      return;
    }

    // Generate
    let draftText: string;
    try {
      draftText = await generateCommentDraft({
        platform,
        tone,
        length: length as CommentLength,
        postText,
      });
    } catch (e) {
      req.log.error({ err: e }, 'comment generation failed');
      res.status(502).json(err('generation_failed', 'Could not generate a draft right now'));
      return;
    }
    if (!draftText || draftText.length < 2) {
      res.status(502).json(err('empty_draft', 'Model returned an empty draft'));
      return;
    }

    // Output moderation (fail-closed — never persist a flagged comment)
    try {
      const outputModeration = await moderate(draftText);
      if (outputModeration.flagged) {
        res.status(502).json(
          err(
            'draft_flagged',
            `Generated comment was flagged (${outputModeration.categories.join(', ') || 'unknown'}). Try a different post or tone.`,
          ),
        );
        return;
      }
    } catch (e) {
      req.log.error({ err: e }, 'moderation (output) failed — refusing to return draft');
      res.status(502).json(err('moderation_failed', 'Safety check failed'));
      return;
    }

    const draft = await CommentDraftModel.create({
      userId: req.auth.sub,
      platform,
      postUrl,
      postTextHash,
      draftText,
      tone,
      status: 'pending',
    });

    res.json(
      ok({
        id: draft._id.toString(),
        platform,
        postUrl,
        draftText,
        tone,
        status: 'pending' as const,
        createdAt: draft.createdAt.toISOString(),
      }),
    );
  }),
);

// -- GET /drafts -------------------------------------------------------------
const listSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'posted', 'failed']).optional(),
  limit: z.coerce.number().int().positive().max(100).default(50),
});

commentsRouter.get(
  '/drafts',
  requireAuth,
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    key: (req) => `drafts:${req.auth?.sub ?? req.ip}`,
  }),
  validate(listSchema, 'query'),
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const { status, limit } = req.query as unknown as z.infer<typeof listSchema>;
    const filter: { userId: string; status?: string } = { userId: req.auth.sub };
    if (status) filter.status = status;
    const drafts = await CommentDraftModel.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    res.json(
      ok({
        drafts: drafts.map((d) => ({
          id: (d._id as Types.ObjectId).toString(),
          platform: d.platform,
          postUrl: d.postUrl,
          draftText: d.draftText,
          tone: d.tone,
          status: d.status,
          createdAt: (d.createdAt as Date).toISOString(),
          postedAt: d.postedAt ? (d.postedAt as Date).toISOString() : null,
        })),
      }),
    );
  }),
);

// -- POST /drafts/:id/{approve,reject,posted,failed} -------------------------
const transition = (next: 'approved' | 'rejected' | 'posted' | 'failed') =>
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const id = req.params.id;
    if (!id) {
      res.status(400).json(err('missing_id', 'draft id required'));
      return;
    }
    const draft = await CommentDraftModel.findOne({ _id: id, userId: req.auth.sub });
    if (!draft) {
      res.status(404).json(err('draft_not_found', 'No such draft'));
      return;
    }
    draft.status = next;
    if (next === 'posted') draft.postedAt = new Date();
    await draft.save();
    res.json(ok({ id, status: next }));
  });

commentsRouter.post('/drafts/:id/approve', requireAuth, transition('approved'));
commentsRouter.post('/drafts/:id/reject', requireAuth, transition('rejected'));
commentsRouter.post('/drafts/:id/posted', requireAuth, transition('posted'));
commentsRouter.post('/drafts/:id/failed', requireAuth, transition('failed'));
