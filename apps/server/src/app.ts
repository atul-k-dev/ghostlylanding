import express, { type Express, type NextFunction, type Request, type Response } from 'express';
import { randomUUID } from 'node:crypto';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { err } from '@casper/shared';
import { config } from './config.js';
import { logger } from './logger.js';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { meRouter } from './routes/me.js';
import { accountRouter } from './routes/account.js';
import { actionsRouter } from './routes/actions.js';
import { commentsRouter } from './routes/comments.js';
import { postsRouter } from './routes/posts.js';
import { growthRouter } from './routes/growth.js';
import { askRouter } from './routes/ask.js';
import { voiceRouter } from './routes/voice.js';
import { configRouter } from './routes/config.js';
import { diagnosticsRouter } from './routes/diagnostics.js';
import { billingRouter } from './routes/billing.js';
import { billingWebhookRouter } from './routes/billing-webhook.js';
import { returnPagesRouter } from './routes/return-pages.js';
import { adminRouter } from './routes/admin.js';
import { supportRouter } from './routes/support.js';
import { enforceBan } from './middleware/enforce-ban.js';
import { rateLimit } from './middleware/rate-limit.js';

export const createApp = (): Express => {
  const app = express();

  app.disable('x-powered-by');
  app.use(helmet());

  app.use(
    cors({
      origin: (origin, cb) => {
        if (!origin) return cb(null, true);
        if (origin.startsWith('chrome-extension://')) return cb(null, true);
        if (config.allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`Origin not allowed: ${origin}`));
      },
      credentials: true,
    }),
  );

  // Stripe webhook MUST receive the raw body for signature verification —
  // mount it before express.json() so the buffer isn't parsed.
  app.use('/api/billing', billingWebhookRouter);

  app.use(express.json({ limit: '1mb' }));
  app.use(
    pinoHttp({
      logger,
      // Stable request ID for log correlation — honor inbound header if present.
      genReqId: (req, res) => {
        const inbound = req.headers['x-request-id'];
        const id =
          typeof inbound === 'string' && inbound.length > 0 && inbound.length <= 128
            ? inbound
            : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      // Don't log /api/health — it's polled by uptime monitors and floods the log.
      autoLogging: {
        ignore: (req) => req.url === '/api/health',
      },
    }),
  );

  app.use('/api/health', healthRouter);

  // Global per-IP backstop on top of the per-route/per-user limiters below.
  // Generous enough not to bother legit users (incl. shared NATs) but it stops a
  // single IP from flooding the API. Mounted after /health so uptime monitors
  // aren't throttled, and after the Stripe webhook (which legitimately bursts).
  app.use(rateLimit({ windowMs: 60_000, max: 600 }));

  app.use('/api/auth', authRouter);
  // Public contact form — unauthenticated, before the ban gate.
  app.use('/api/support', supportRouter);

  // Block suspended accounts on every authenticated request, even with a still-valid JWT.
  app.use(enforceBan);

  app.use('/api/me', meRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/actions', actionsRouter);
  app.use('/api/comments', commentsRouter);
  app.use('/api/posts', postsRouter);
  app.use('/api/growth', growthRouter);
  app.use('/api/ask', askRouter);
  app.use('/api/voice', voiceRouter);
  app.use('/api/config', configRouter);
  app.use('/api/diagnostics', diagnosticsRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/admin', adminRouter);

  // Stripe checkout redirect targets — minimal HTML, no nav/marketing.
  app.use('/r', returnPagesRouter);

  app.use((req: Request, res: Response) => {
    res.status(404).json(err('not_found', `Route not found: ${req.method} ${req.path}`));
  });

  app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
    req.log.error({ error }, 'unhandled error');
    // Hand back the request id (already on the response header and in every log
    // line for this request), so a support report can be traced to the exact
    // failure instead of "it broke this morning".
    const requestId = res.getHeader('x-request-id');
    res
      .status(500)
      .json(
        err(
          'internal_error',
          typeof requestId === 'string'
            ? `Something went wrong. Reference: ${requestId}`
            : 'Something went wrong',
        ),
      );
  });

  return app;
};
