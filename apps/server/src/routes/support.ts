import { Router } from 'express';
import { z } from 'zod';
import { ok, err } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { sendSupportMessage } from '../email/resend.js';
import { logger } from '../logger.js';

export const supportRouter = Router();

const supportSchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(254),
  subject: z.string().trim().max(150).optional(),
  message: z.string().trim().min(1).max(5000),
  // Honeypot — bots fill hidden fields; humans leave it empty.
  company: z.string().max(0).optional(),
});

// POST /api/support — public contact form. Emails support@ghostly247.com.
supportRouter.post(
  '/',
  // Spam guard: a handful of messages per IP per 10 min is plenty for a human.
  rateLimit({ windowMs: 10 * 60 * 1000, max: 5, key: (req) => `support:${req.ip}` }),
  validate(supportSchema),
  asyncHandler(async (req, res) => {
    const { name, email, subject, message, company } = req.body as z.infer<typeof supportSchema>;
    // Silently accept honeypot hits so bots don't learn they were caught.
    if (company) {
      res.json(ok({ sent: true }));
      return;
    }
    try {
      await sendSupportMessage({ name, email, subject, message });
    } catch (e) {
      logger.error({ err: e }, 'support message send failed');
      res.status(502).json(err('send_failed', 'Could not send your message. Please email us directly.'));
      return;
    }
    res.json(ok({ sent: true }));
  }),
);
