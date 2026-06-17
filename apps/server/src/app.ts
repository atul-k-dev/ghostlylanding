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
import { billingRouter } from './routes/billing.js';
import { billingWebhookRouter } from './routes/billing-webhook.js';
import { returnPagesRouter } from './routes/return-pages.js';
import { adminRouter } from './routes/admin.js';
import { enforceBan } from './middleware/enforce-ban.js';

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
  app.use('/api/auth', authRouter);

  // Block suspended accounts on every authenticated request, even with a still-valid JWT.
  app.use(enforceBan);

  app.use('/api/me', meRouter);
  app.use('/api/account', accountRouter);
  app.use('/api/actions', actionsRouter);
  app.use('/api/comments', commentsRouter);
  app.use('/api/billing', billingRouter);
  app.use('/api/admin', adminRouter);

  // Stripe checkout redirect targets — minimal HTML, no nav/marketing.
  app.use('/r', returnPagesRouter);

  app.use((req: Request, res: Response) => {
    res.status(404).json(err('not_found', `Route not found: ${req.method} ${req.path}`));
  });

  app.use((error: Error, req: Request, res: Response, _next: NextFunction) => {
    req.log.error({ error }, 'unhandled error');
    res.status(500).json(err('internal_error', 'Something went wrong'));
  });

  return app;
};
