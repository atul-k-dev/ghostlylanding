import { randomInt } from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { ok, err, type AuthResponse } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { signJwt } from '../auth/jwt.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { hasGoogle, verifyGoogleIdToken } from '../auth/google.js';
import { sendPasswordResetCode } from '../email/resend.js';
import type { HydratedDocument } from 'mongoose';
import { UserModel, toUserDTO } from '../models/user.model.js';

export const authRouter = Router();

/** How long a password-reset code stays valid. */
const RESET_CODE_TTL_MINUTES = 15;

const generateResetCode = (): string => randomInt(0, 1_000_000).toString().padStart(6, '0');

const issueAuth = (user: HydratedDocument<unknown>): AuthResponse => {
  const obj = user.toObject() as unknown as Parameters<typeof toUserDTO>[0];
  const dto = toUserDTO(obj);
  const token = signJwt({ sub: user._id.toString(), email: obj.email });
  return { token, user: dto };
};

// -- POST /signup -----------------------------------------------------------
const signupSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
});

authRouter.post(
  '/signup',
  rateLimit({ windowMs: 60_000, max: 5 }),
  validate(signupSchema),
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body as z.infer<typeof signupSchema>;
    const normalizedEmail = email.toLowerCase();
    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) {
      res.status(409).json(err('email_in_use', 'An account already exists for that email.'));
      return;
    }
    const passwordHash = await hashPassword(password);
    const user = await UserModel.create({ name, email: normalizedEmail, passwordHash });
    res.json(ok(issueAuth(user)));
  }),
);

// -- POST /login ------------------------------------------------------------
const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

authRouter.post(
  '/login',
  rateLimit({ windowMs: 60_000, max: 10 }),
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body as z.infer<typeof loginSchema>;
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user || !user.passwordHash) {
      // Don't leak which one is wrong, and don't reveal whether this email is
      // a Google-only account.
      res.status(401).json(err('invalid_credentials', 'Email or password is incorrect.'));
      return;
    }
    const matches = await verifyPassword(password, user.passwordHash);
    if (!matches) {
      res.status(401).json(err('invalid_credentials', 'Email or password is incorrect.'));
      return;
    }
    res.json(ok(issueAuth(user)));
  }),
);

// -- POST /forgot-password --------------------------------------------------
const forgotSchema = z.object({
  email: z.string().email().max(254),
});

authRouter.post(
  '/forgot-password',
  rateLimit({ windowMs: 60_000, max: 5 }),
  validate(forgotSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body as z.infer<typeof forgotSchema>;
    const user = await UserModel.findOne({ email: email.toLowerCase() });

    // Only generate + send when the account exists, but always respond the same
    // way so we never reveal whether an email is registered.
    if (user) {
      const code = generateResetCode();
      user.passwordResetCodeHash = await hashPassword(code);
      user.passwordResetExpiresAt = new Date(Date.now() + RESET_CODE_TTL_MINUTES * 60_000);
      await user.save();
      try {
        await sendPasswordResetCode(user.email, code, RESET_CODE_TTL_MINUTES);
      } catch (e) {
        req.log.error({ err: e }, 'failed to send password reset email');
      }
    }

    res.json(
      ok({ sent: true, ttlMinutes: RESET_CODE_TTL_MINUTES }),
    );
  }),
);

// -- POST /reset-password ---------------------------------------------------
const resetSchema = z.object({
  email: z.string().email().max(254),
  code: z.string().regex(/^\d{6}$/, 'Code must be 6 digits'),
  password: z.string().min(8).max(128),
});

authRouter.post(
  '/reset-password',
  rateLimit({ windowMs: 60_000, max: 10 }),
  validate(resetSchema),
  asyncHandler(async (req, res) => {
    const { email, code, password } = req.body as z.infer<typeof resetSchema>;
    const user = await UserModel.findOne({ email: email.toLowerCase() });

    const invalid = () =>
      res.status(400).json(err('invalid_reset_code', 'That code is invalid or has expired.'));

    if (!user || !user.passwordResetCodeHash || !user.passwordResetExpiresAt) {
      invalid();
      return;
    }
    if (user.passwordResetExpiresAt.getTime() < Date.now()) {
      invalid();
      return;
    }
    const matches = await verifyPassword(code, user.passwordResetCodeHash);
    if (!matches) {
      invalid();
      return;
    }

    user.passwordHash = await hashPassword(password);
    user.passwordResetCodeHash = null;
    user.passwordResetExpiresAt = null;
    await user.save();

    // Auto-login on success so the user lands straight in the popup.
    res.json(ok(issueAuth(user)));
  }),
);

// -- POST /google -----------------------------------------------------------
const googleSchema = z.object({
  idToken: z.string().min(20).max(4_096),
});

authRouter.post(
  '/google',
  rateLimit({ windowMs: 60_000, max: 10 }),
  validate(googleSchema),
  asyncHandler(async (req, res) => {
    if (!hasGoogle()) {
      res.status(503).json(err('google_unconfigured', 'Google Sign-In is not configured.'));
      return;
    }
    const { idToken } = req.body as z.infer<typeof googleSchema>;

    let verified;
    try {
      verified = await verifyGoogleIdToken(idToken);
    } catch (e) {
      req.log.warn({ err: e }, 'google id token verification failed');
      res.status(401).json(err('invalid_google_token', 'Could not verify Google sign-in.'));
      return;
    }
    if (!verified.emailVerified) {
      res
        .status(403)
        .json(err('google_email_unverified', 'Verify your Google email first, then try again.'));
      return;
    }

    // Find existing by googleId, then by email (link), else create.
    let user = await UserModel.findOne({ googleId: verified.googleId });
    if (!user) {
      user = await UserModel.findOne({ email: verified.email });
      if (user) {
        user.googleId = verified.googleId;
        if (!user.name) user.name = verified.name;
        await user.save();
      } else {
        user = await UserModel.create({
          name: verified.name,
          email: verified.email,
          googleId: verified.googleId,
        });
      }
    }
    res.json(ok(issueAuth(user)));
  }),
);
