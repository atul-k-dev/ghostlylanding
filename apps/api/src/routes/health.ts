import { Router } from 'express';
import mongoose from 'mongoose';
import { ok } from '@casper/shared';

export const healthRouter = Router();

const STATES: Record<number, string> = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
  99: 'uninitialized',
};

healthRouter.get('/', (_req, res) => {
  const dbState = STATES[mongoose.connection.readyState] ?? 'unknown';
  res.json(
    ok({
      status: 'healthy',
      service: 'casper-api',
      db: dbState,
      timestamp: new Date().toISOString(),
    }),
  );
});
