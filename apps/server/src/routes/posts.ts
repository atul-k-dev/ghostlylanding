import { Router } from 'express';
import { z } from 'zod';
import { ok, err, TONE_PRESETS, FREE_TIER, isPro, monthlyActionsUsed } from '@casper/shared';
import type { TonePreset } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { generatePostText } from '../openai/generate-post.js';
import { moderate } from '../openai/moderation.js';
import { hasOpenAI } from '../openai/client.js';
import { UserModel } from '../models/user.model.js';

export const postsRouter = Router();

// -- POST /generate ----------------------------------------------------------
// Draft an original tweet from a short description (scheduled-posts flow). The
// scheduling itself is client-side (in the extension) — this endpoint only
// turns a description into tweet text, gated exactly like AI replies.
const generateSchema = z.object({
  description: z.string().min(1).max(1_000),
  link: z.string().url().max(2_048).optional(),
  tone: z.enum(TONE_PRESETS).default('friendly'),
  // Character limit for the post: 280 for free X accounts, larger for Premium.
  maxChars: z.coerce.number().int().min(50).max(25_000).default(280),
});

postsRouter.post(
  '/generate',
  requireAuth,
  // Same shape as comment generation: 60 drafts/user/hour bounds OpenAI spend.
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 60,
    key: (req) => `postgen:${req.auth?.sub ?? req.ip}`,
  }),
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
    // Same gate as AI replies: Pro is unlimited; free users may draft until
    // they've spent their monthly action allowance (bounds OpenAI spend).
    if (
      !isPro(user.subscriptionStatus as Parameters<typeof isPro>[0]) &&
      monthlyActionsUsed(user) >= FREE_TIER.monthlyActions
    ) {
      res.status(402).json(
        err(
          'free_limit_reached',
          `Free plan: ${FREE_TIER.monthlyActions} actions/month used. Upgrade to Pro for unlimited AI drafting.`,
        ),
      );
      return;
    }

    const { description, link, tone, maxChars } = req.body as z.infer<typeof generateSchema>;

    // Input moderation (fail-open — a moderation outage shouldn't block drafting).
    try {
      const inputMod = await moderate(description);
      if (inputMod.flagged) {
        res.status(400).json(
          err('input_flagged', `Description flagged: ${inputMod.categories.join(', ') || 'unknown'}`),
        );
        return;
      }
    } catch (e) {
      req.log.warn({ err: e }, 'post moderation (input) failed — proceeding');
    }

    let text: string;
    try {
      text = await generatePostText({ tone: tone as TonePreset, description, link, maxChars });
    } catch (e) {
      req.log.error({ err: e }, 'post generation failed');
      res.status(502).json(err('generation_failed', 'Could not draft a post right now'));
      return;
    }
    if (!text || text.length < 2) {
      res.status(502).json(err('empty_draft', 'Model returned an empty draft'));
      return;
    }

    // Output moderation (fail-closed — never return a flagged draft).
    try {
      const outputMod = await moderate(text);
      if (outputMod.flagged) {
        res.status(502).json(
          err(
            'draft_flagged',
            `Generated post was flagged (${outputMod.categories.join(', ') || 'unknown'}). Try a different description.`,
          ),
        );
        return;
      }
    } catch (e) {
      req.log.error({ err: e }, 'post moderation (output) failed — refusing to return draft');
      res.status(502).json(err('moderation_failed', 'Safety check failed'));
      return;
    }

    res.json(ok({ text }));
  }),
);
