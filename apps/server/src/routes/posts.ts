import { Router } from 'express';
import { z } from 'zod';
import { ok, err, TONE_PRESETS, FREE_TIER, isPro, freeLimitReached } from '@casper/shared';
import type { TonePreset } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { generatePostText } from '../openai/generate-post.js';
import { generatePostIdeas } from '../openai/generate-ideas.js';
import { PostOutcomeModel } from '../models/post-outcome.model.js';
import { Types } from 'mongoose';
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
      freeLimitReached(user)
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
      text = await generatePostText({
        tone: tone as TonePreset,
        description,
        link,
        maxChars,
        // A trained voice overrides the tone preset inside the prompt.
        voice: user.voiceProfile?.summary ?? null,
      });
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

// -- POST /ideas -------------------------------------------------------------
// Draft several post ideas at once, in the user's trained voice, informed by
// which of their own posts actually performed. Suggestions only: nothing is
// scheduled or published here — the user picks what's worth saying.
const ideasSchema = z.object({
  topics: z.array(z.string().trim().min(1).max(80)).max(10).default([]),
  count: z.coerce.number().int().min(1).max(5).default(3),
  maxChars: z.coerce.number().int().min(50).max(25_000).default(280),
  tone: z.enum(TONE_PRESETS).default('friendly'),
});

postsRouter.post(
  '/ideas',
  requireAuth,
  // One request drafts up to 5 posts with the strongest model, so this is the
  // most expensive call per press. 20/hour is plenty for real use.
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    key: (req) => `ideas:${req.auth?.sub ?? req.ip}`,
  }),
  validate(ideasSchema),
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
      freeLimitReached(user)
    ) {
      res.status(402).json(
        err(
          'free_limit_reached',
          `Free plan: ${FREE_TIER.monthlyActions} actions/month used. Upgrade to Pro for unlimited AI drafting.`,
        ),
      );
      return;
    }

    const { topics, count, maxChars, tone } = req.body as z.infer<typeof ideasSchema>;

    // What worked before. Comes from the growth scan; absent for a user who
    // hasn't been measured yet, in which case the model works from topics alone.
    const winners = await PostOutcomeModel.find({
      userId: new Types.ObjectId(req.auth.sub),
      isReply: false,
      likes: { $gt: 0 },
    })
      .sort({ likes: -1 })
      .limit(5)
      .lean();

    let ideas: string[];
    try {
      ideas = await generatePostIdeas({
        tone: tone as TonePreset,
        topics,
        winners: winners.map((w) => ({ text: w.text ?? '', likes: w.likes ?? 0 })),
        count,
        maxChars,
        voice: user.voiceProfile?.summary ?? null,
      });
    } catch (e) {
      req.log.error({ err: e }, 'idea generation failed');
      res.status(502).json(err('generation_failed', 'Could not draft ideas right now'));
      return;
    }
    if (ideas.length === 0) {
      res.status(502).json(err('empty_ideas', 'Model returned nothing usable'));
      return;
    }

    // Moderate every idea; drop anything flagged rather than failing the batch,
    // so one bad draft doesn't cost the user the other four.
    const safe: string[] = [];
    for (const idea of ideas) {
      try {
        const verdict = await moderate(idea);
        if (!verdict.flagged) safe.push(idea);
      } catch (e) {
        // Fail CLOSED here: these are drafts the user may publish under their
        // own name, and an unchecked one is not worth the convenience.
        req.log.warn({ err: e }, 'idea moderation failed — dropping the idea');
      }
    }
    if (safe.length === 0) {
      res.status(502).json(err('ideas_flagged', 'Every draft was flagged — try different topics'));
      return;
    }

    res.json(ok({ ideas: safe, basedOnWinners: winners.length }));
  }),
);
