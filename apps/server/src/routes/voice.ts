/**
 * Voice training — teach Ghostly to write like the user.
 *
 * The extension reads a sample of the user's own posts off their profile and
 * uploads the text here. We distil it into a short style guide, store the GUIDE,
 * and drop the posts. Nothing about the samples is persisted, logged, or
 * returned — consistent with reply generation, which stores only a hash of the
 * post it replied to.
 */
import { Router } from 'express';
import { z } from 'zod';
import { ok, err, VOICE_LIMITS } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { hasOpenAI } from '../openai/client.js';
import { trainVoiceProfile } from '../openai/train-voice.js';
import { UserModel, toUserDTO } from '../models/user.model.js';

export const voiceRouter = Router();

const trainSchema = z.object({
  posts: z
    .array(z.string().trim().min(1).max(VOICE_LIMITS.maxPostChars))
    .min(VOICE_LIMITS.minSamples)
    .max(VOICE_LIMITS.maxSamples),
});

voiceRouter.post(
  '/train',
  requireAuth,
  // Training is a deliberate, occasional act and the most expensive call we
  // make. Five an hour is generous for "retrain because it sounds off".
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    key: (req) => `voice:${req.auth?.sub ?? req.ip}`,
  }),
  validate(trainSchema),
  asyncHandler(async (req, res) => {
    if (!hasOpenAI()) {
      res.status(503).json(err('openai_unconfigured', 'OPENAI_API_KEY not set on the server'));
      return;
    }
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const { posts } = req.body as z.infer<typeof trainSchema>;

    // Near-duplicate posts (a user who reposts the same announcement) would
    // skew the profile toward one phrasing, so collapse exact repeats.
    const unique = [...new Set(posts.map((p) => p.trim()))];
    if (unique.length < VOICE_LIMITS.minSamples) {
      res.status(400).json(
        err(
          'not_enough_posts',
          `Need at least ${VOICE_LIMITS.minSamples} distinct posts to learn a voice — found ${unique.length}.`,
        ),
      );
      return;
    }

    let summary: string | null;
    try {
      summary = await trainVoiceProfile(unique);
    } catch (e) {
      req.log.error({ err: e }, 'voice training failed');
      res.status(502).json(err('training_failed', 'Could not analyse your posts right now'));
      return;
    }
    if (!summary) {
      res
        .status(502)
        .json(err('empty_profile', 'Could not make out a consistent style from those posts'));
      return;
    }

    const user = await UserModel.findByIdAndUpdate(
      req.auth.sub,
      {
        $set: {
          voiceProfile: { summary, sampleCount: unique.length, trainedAt: new Date() },
        },
      },
      { new: true },
    );
    if (!user) {
      res.status(404).json(err('user_not_found', 'User no longer exists'));
      return;
    }

    req.log.info({ userId: req.auth.sub, samples: unique.length }, 'voice profile trained');
    res.json(ok(toUserDTO(user.toObject() as Parameters<typeof toUserDTO>[0])));
  }),
);

voiceRouter.delete(
  '/',
  requireAuth,
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    key: (req) => `voicedel:${req.auth?.sub ?? req.ip}`,
  }),
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const user = await UserModel.findByIdAndUpdate(
      req.auth.sub,
      { $set: { voiceProfile: null } },
      { new: true },
    );
    if (!user) {
      res.status(404).json(err('user_not_found', 'User no longer exists'));
      return;
    }
    res.json(ok(toUserDTO(user.toObject() as Parameters<typeof toUserDTO>[0])));
  }),
);
