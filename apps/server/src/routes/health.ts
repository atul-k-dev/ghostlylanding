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
  const readyState = mongoose.connection.readyState;
  const dbState = STATES[readyState] ?? 'unknown';
  // 1 === connected. Anything else means this node cannot serve a single real
  // request, so it must NOT answer 200: platform health checks read the status
  // code, and a cheerful 200 keeps traffic routed to a node that can only fail.
  const healthy = readyState === 1;
  res.status(healthy ? 200 : 503).json(
    ok({
      status: healthy ? 'healthy' : 'degraded',
      service: 'casper-api',
      db: dbState,
      timestamp: new Date().toISOString(),
    }),
  );
});
