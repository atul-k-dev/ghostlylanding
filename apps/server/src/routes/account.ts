import { Router } from 'express';
import { ok, err } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { UserModel } from '../models/user.model.js';
import { ActionLogModel } from '../models/action-log.model.js';
import { CommentDraftModel } from '../models/comment-draft.model.js';

export const accountRouter = Router();

/**
 * §10 — user-owned deletion. Hard-delete all derived data.
 */
accountRouter.delete(
  '/',
  requireAuth,
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 5,
    key: (req) => `delacct:${req.auth?.sub ?? req.ip}`,
  }),
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const userId = req.auth.sub;

    const [actionLogs, drafts] = await Promise.all([
      ActionLogModel.deleteMany({ userId }),
      CommentDraftModel.deleteMany({ userId }),
    ]);
    const user = await UserModel.findByIdAndDelete(userId);

    req.log.info(
      {
        userId,
        deleted: {
          user: user ? 1 : 0,
          actionLogs: actionLogs.deletedCount,
          drafts: drafts.deletedCount,
        },
      },
      'account wiped',
    );

    res.json(
      ok({
        deleted: {
          user: user ? 1 : 0,
          actionLogs: actionLogs.deletedCount,
          drafts: drafts.deletedCount,
        },
      }),
    );
  }),
);
