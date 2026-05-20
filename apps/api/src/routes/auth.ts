import { Router } from 'express';
import { z } from 'zod';
import { ok, err, type AuthResponse } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { generateMagicLink, consumeMagicLink } from '../auth/magic-link.js';
import { sendMagicLinkEmail } from '../auth/email.js';
import { signJwt } from '../auth/jwt.js';
import { UserModel, toUserDTO } from '../models/user.model.js';

export const authRouter = Router();

const requestSchema = z.object({
  email: z.string().email().max(254),
  /** Optional nonce supplied by the extension to defend against drive-by handoff. */
  nonce: z.string().min(16).max(128).optional(),
});

authRouter.post(
  '/request-magic-link',
  rateLimit({ windowMs: 60_000, max: 5 }),
  validate(requestSchema),
  asyncHandler(async (req, res) => {
    const { email, nonce } = req.body as z.infer<typeof requestSchema>;
    const { verifyUrl } = await generateMagicLink(email, nonce);
    const result = await sendMagicLinkEmail({
      to: email,
      verifyUrl,
      ttlMinutes: config.magicLinkTtlMinutes,
    });
    if (result.via === 'console') {
      logger.info({ verifyUrl }, '👻 dev magic link');
    }
    // Dev convenience: expose the verify URL inline only when (a) not in production
    // AND (b) Resend wasn't actually used. Lets local smoke tests run without inboxes.
    const devUrl =
      config.env !== 'production' && result.via === 'console' ? verifyUrl : undefined;
    res.json(ok({ sent: true, via: result.via, ...(devUrl ? { devVerifyUrl: devUrl } : {}) }));
  }),
);

const verifySchema = z.object({
  token: z.string().min(8),
});

authRouter.get(
  '/verify',
  validate(verifySchema, 'query'),
  asyncHandler(async (req, res) => {
    const { token } = req.query as unknown as z.infer<typeof verifySchema>;
    const consumed = await consumeMagicLink(token);
    if (!consumed) {
      res.status(400).json(err('invalid_token', 'Magic link is invalid, used, or expired'));
      return;
    }

    let user = await UserModel.findOne({ email: consumed.email });
    if (!user) {
      user = await UserModel.create({ email: consumed.email });
    }

    const jwt = signJwt({ sub: user._id.toString(), email: user.email });
    const dto = toUserDTO(user.toObject() as Parameters<typeof toUserDTO>[0]);
    const payload: AuthResponse & { nonce?: string | null } = {
      token: jwt,
      user: dto,
      nonce: consumed.nonce,
    };
    res.json(ok(payload));
  }),
);
