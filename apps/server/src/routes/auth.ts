import { Router } from 'express';
import { z } from 'zod';
import { ok, err, type AuthResponse } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { generateAuthCode, consumeAuthCode } from '../auth/magic-link.js';
import { sendAuthCodeEmail } from '../auth/email.js';
import { signJwt } from '../auth/jwt.js';
import { UserModel, toUserDTO } from '../models/user.model.js';

export const authRouter = Router();

// -- POST /request-code -----------------------------------------------------
const requestSchema = z.object({
  email: z.string().email().max(254),
});

authRouter.post(
  '/request-code',
  rateLimit({ windowMs: 60_000, max: 5 }),
  validate(requestSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body as z.infer<typeof requestSchema>;
    const { code } = await generateAuthCode(email);
    const result = await sendAuthCodeEmail({
      to: email,
      code,
      ttlMinutes: config.magicLinkTtlMinutes,
    });
    if (result.via === 'console') {
      logger.info({ code, email }, '👻 dev sign-in code');
    }
    // Dev-only inline code for local testing. Stripped in prod.
    const devCode = config.env !== 'production' && result.via === 'console' ? code : undefined;
    res.json(
      ok({
        sent: true,
        via: result.via,
        ttlMinutes: config.magicLinkTtlMinutes,
        ...(devCode ? { devCode } : {}),
      }),
    );
  }),
);

// -- POST /verify-code ------------------------------------------------------
const verifySchema = z.object({
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/, '6-digit code required'),
});

authRouter.post(
  '/verify-code',
  rateLimit({ windowMs: 60_000, max: 10 }),
  validate(verifySchema),
  asyncHandler(async (req, res) => {
    const { email, code } = req.body as z.infer<typeof verifySchema>;
    const result = await consumeAuthCode(email, code);
    if (!result.ok) {
      const messages = {
        expired: 'That code has expired. Request a new one.',
        locked: 'Too many wrong attempts. Request a new code.',
        invalid: 'That code is not right.',
      };
      res.status(400).json(err(result.reason, messages[result.reason]));
      return;
    }

    let user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await UserModel.create({ email: email.toLowerCase() });
    }

    const jwt = signJwt({ sub: user._id.toString(), email: user.email });
    const dto = toUserDTO(user.toObject() as Parameters<typeof toUserDTO>[0]);
    const payload: AuthResponse = { token: jwt, user: dto };
    res.json(ok(payload));
  }),
);
