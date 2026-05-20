import { Router } from 'express';
import { ok } from '@casper/shared';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json(
    ok({
      status: 'healthy',
      service: 'casper-api',
      timestamp: new Date().toISOString(),
    }),
  );
});
