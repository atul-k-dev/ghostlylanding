import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wrap an async route so thrown errors flow into the Express error pipeline.
 */
export const asyncHandler =
  <Req extends Request = Request, Res extends Response = Response>(
    fn: (req: Req, res: Res, next: NextFunction) => Promise<unknown>,
  ): RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req as Req, res as Res, next)).catch(next);
  };
