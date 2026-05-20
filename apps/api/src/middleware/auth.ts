import type { Request, Response, NextFunction } from 'express';
import { err } from '@casper/shared';
import { verifyJwt, type JwtPayload } from '../auth/jwt.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: JwtPayload;
    }
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  const header = req.header('authorization');
  if (!header || !header.toLowerCase().startsWith('bearer ')) {
    res.status(401).json(err('unauthorized', 'Missing bearer token'));
    return;
  }
  const token = header.slice(7).trim();
  try {
    req.auth = verifyJwt(token);
    next();
  } catch {
    res.status(401).json(err('unauthorized', 'Invalid or expired token'));
  }
};
