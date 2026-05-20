import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';
import { err } from '@casper/shared';

type Source = 'body' | 'query' | 'params';

export const validate =
  <T>(schema: ZodSchema<T>, source: Source = 'body') =>
  (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      res.status(400).json(
        err(
          'validation_error',
          result.error.issues
            .map((i) => `${i.path.join('.') || source}: ${i.message}`)
            .join('; '),
        ),
      );
      return;
    }
    // Mutate request payload to the parsed (typed) value
    (req as Request & Record<Source, unknown>)[source] = result.data;
    next();
  };
