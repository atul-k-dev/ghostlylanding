import { Router } from 'express';
import { z } from 'zod';
import { ok, err, isPro, PLATFORMS, ACTION_TYPES } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/require-admin.js';
import { validate } from '../middleware/validate.js';
import { UserModel } from '../models/user.model.js';
import { ActionLogModel } from '../models/action-log.model.js';
import { CommentDraftModel } from '../models/comment-draft.model.js';
import { getRevenueOverview } from '../stripe/revenue.js';

export const adminRouter = Router();

// All admin routes require an authenticated admin.
adminRouter.use(requireAuth, requireAdmin);

const startOfUTCDay = (d: Date): Date =>
  new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));

const PRO_STATUSES = ['active', 'trialing'];

// -- GET /stats — top-level totals for the dashboard -------------------------
adminRouter.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const now = new Date();
    const todayStart = startOfUTCDay(now);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      proUsers,
      adminUsers,
      newUsersToday,
      newUsers7d,
      newUsers30d,
      totalActions,
      actionsToday,
      actions7d,
      byTypeAgg,
      successAgg,
      totalDrafts,
      pendingDrafts,
      postedDrafts,
    ] = await Promise.all([
      UserModel.countDocuments({}),
      UserModel.countDocuments({ subscriptionStatus: { $in: PRO_STATUSES } }),
      UserModel.countDocuments({ isAdmin: true }),
      UserModel.countDocuments({ createdAt: { $gte: todayStart } }),
      UserModel.countDocuments({ createdAt: { $gte: weekAgo } }),
      UserModel.countDocuments({ createdAt: { $gte: monthAgo } }),
      ActionLogModel.countDocuments({}),
      ActionLogModel.countDocuments({ timestamp: { $gte: todayStart } }),
      ActionLogModel.countDocuments({ timestamp: { $gte: weekAgo } }),
      ActionLogModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$actionType', count: { $sum: 1 } } },
      ]),
      ActionLogModel.aggregate<{ _id: boolean; count: number }>([
        { $group: { _id: '$success', count: { $sum: 1 } } },
      ]),
      CommentDraftModel.countDocuments({}),
      CommentDraftModel.countDocuments({ status: 'pending' }),
      CommentDraftModel.countDocuments({ status: 'posted' }),
    ]);

    const byType: Record<string, number> = { like: 0, comment: 0, follow: 0 };
    for (const row of byTypeAgg) byType[row._id] = row.count;
    const success = successAgg.find((r) => r._id === true)?.count ?? 0;
    const failure = successAgg.find((r) => r._id === false)?.count ?? 0;
    const successRate = success + failure > 0 ? success / (success + failure) : 1;

    res.json(
      ok({
        users: {
          total: totalUsers,
          pro: proUsers,
          free: totalUsers - proUsers,
          admins: adminUsers,
          newToday: newUsersToday,
          newLast7d: newUsers7d,
          newLast30d: newUsers30d,
        },
        actions: {
          total: totalActions,
          today: actionsToday,
          last7d: actions7d,
          byType,
          successRate,
        },
        drafts: { total: totalDrafts, pending: pendingDrafts, posted: postedDrafts },
      }),
    );
  }),
);

// -- GET /revenue — real Stripe revenue overview (MRR, charges, subs) --------
adminRouter.get(
  '/revenue',
  validate(z.object({ days: z.coerce.number().int().min(7).max(90).default(30) }), 'query'),
  asyncHandler(async (req, res) => {
    const { days } = req.query as unknown as { days: number };
    try {
      const overview = await getRevenueOverview(days);
      res.json(ok(overview));
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to reach Stripe';
      res.status(502).json(err('stripe_error', message));
    }
  }),
);

// -- GET /stats/timeseries — daily actions + signups for charts --------------
adminRouter.get(
  '/stats/timeseries',
  validate(z.object({ days: z.coerce.number().int().min(1).max(90).default(14) }), 'query'),
  asyncHandler(async (req, res) => {
    const { days } = req.query as unknown as { days: number };
    const now = new Date();
    const start = startOfUTCDay(new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000));

    const [actionRows, signupRows] = await Promise.all([
      ActionLogModel.aggregate<{ _id: { day: string; type: string }; count: number }>([
        { $match: { timestamp: { $gte: start } } },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
              type: '$actionType',
            },
            count: { $sum: 1 },
          },
        },
      ]),
      UserModel.aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: { $gte: start } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // Build a zero-filled row per day so the chart has no gaps.
    const byDay = new Map<
      string,
      { date: string; like: number; comment: number; follow: number; actions: number; signups: number }
    >();
    for (let i = 0; i < days; i++) {
      const d = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, { date: key, like: 0, comment: 0, follow: 0, actions: 0, signups: 0 });
    }
    for (const row of actionRows) {
      const day = byDay.get(row._id.day);
      if (!day) continue;
      if (row._id.type === 'like') day.like = row.count;
      else if (row._id.type === 'comment') day.comment = row.count;
      else if (row._id.type === 'follow') day.follow = row.count;
      day.actions += row.count;
    }
    for (const row of signupRows) {
      const day = byDay.get(row._id);
      if (day) day.signups = row.count;
    }

    res.json(ok({ days: [...byDay.values()] }));
  }),
);

// -- GET /users — searchable, paginated list ---------------------------------
adminRouter.get(
  '/users',
  validate(
    z.object({
      search: z.string().trim().max(120).optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(25),
      plan: z.enum(['all', 'pro', 'free']).default('all'),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { search, page, limit, plan } = req.query as unknown as {
      search?: string;
      page: number;
      limit: number;
      plan: 'all' | 'pro' | 'free';
    };
    const filter: Record<string, unknown> = {};
    if (search) {
      const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ email: rx }, { name: rx }];
    }
    if (plan === 'pro') filter.subscriptionStatus = { $in: PRO_STATUSES };
    if (plan === 'free') filter.subscriptionStatus = { $nin: PRO_STATUSES };

    const [docs, total] = await Promise.all([
      UserModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      UserModel.countDocuments(filter),
    ]);

    const users = docs.map((u) => ({
      id: u._id.toString(),
      name: u.name,
      email: u.email,
      isAdmin: u.isAdmin ?? false,
      isBanned: u.isBanned ?? false,
      subscriptionStatus: u.subscriptionStatus ?? 'free',
      subscriptionPlan: u.subscriptionPlan ?? 'free',
      isPro: isPro(u.subscriptionStatus as Parameters<typeof isPro>[0]),
      lifetimeActionCount: u.lifetimeActionCount ?? 0,
      createdAt: (u.createdAt as Date).toISOString(),
    }));

    res.json(ok({ users, total, page, limit }));
  }),
);

// -- GET /users/:id — full detail + action breakdown -------------------------
adminRouter.get(
  '/users/:id',
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.params.id).lean();
    if (!user) {
      res.status(404).json(err('user_not_found', 'No such user'));
      return;
    }
    const [byTypeAgg, recent, drafts] = await Promise.all([
      ActionLogModel.aggregate<{ _id: string; count: number }>([
        { $match: { userId: user._id } },
        { $group: { _id: '$actionType', count: { $sum: 1 } } },
      ]),
      ActionLogModel.find({ userId: user._id }).sort({ timestamp: -1 }).limit(25).lean(),
      CommentDraftModel.find({ userId: user._id }).sort({ createdAt: -1 }).limit(25).lean(),
    ]);
    const actionCounts: Record<string, number> = { like: 0, comment: 0, follow: 0 };
    for (const row of byTypeAgg) actionCounts[row._id] = row.count;

    res.json(
      ok({
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          isAdmin: user.isAdmin ?? false,
          isBanned: user.isBanned ?? false,
          subscriptionStatus: user.subscriptionStatus ?? 'free',
          subscriptionPlan: user.subscriptionPlan ?? 'free',
          isPro: isPro(user.subscriptionStatus as Parameters<typeof isPro>[0]),
          lifetimeActionCount: user.lifetimeActionCount ?? 0,
          currentPeriodEnd: user.currentPeriodEnd
            ? (user.currentPeriodEnd as Date).toISOString()
            : null,
          keywords: user.preferences?.keywords ?? [],
          createdAt: (user.createdAt as Date).toISOString(),
        },
        actionCounts,
        recentActions: recent.map((a) => ({
          id: a._id.toString(),
          platform: a.platform,
          actionType: a.actionType,
          targetUrl: a.targetUrl,
          targetHandle: a.targetHandle ?? null,
          success: a.success,
          errorMessage: a.errorMessage ?? null,
          timestamp: (a.timestamp as Date).toISOString(),
        })),
        recentComments: drafts.map((d) => ({
          id: d._id.toString(),
          platform: d.platform,
          postUrl: d.postUrl,
          draftText: d.draftText,
          tone: d.tone,
          status: d.status,
          createdAt: (d.createdAt as Date).toISOString(),
        })),
      }),
    );
  }),
);

// -- PATCH /users/:id/ban — suspend or reinstate an account ------------------
adminRouter.patch(
  '/users/:id/ban',
  validate(z.object({ banned: z.boolean() })),
  asyncHandler(async (req, res) => {
    const { banned } = req.body as { banned: boolean };
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      res.status(404).json(err('user_not_found', 'No such user'));
      return;
    }
    if (banned && user.isAdmin) {
      res
        .status(400)
        .json(err('cannot_ban_admin', 'Admins cannot be banned. Revoke admin access first.'));
      return;
    }
    user.isBanned = banned;
    user.bannedAt = banned ? new Date() : null;
    await user.save();
    res.json(ok({ id: user._id.toString(), isBanned: banned }));
  }),
);

// -- PATCH /users/:id/pro — grant or revoke Pro ------------------------------
adminRouter.patch(
  '/users/:id/pro',
  validate(z.object({ pro: z.boolean() })),
  asyncHandler(async (req, res) => {
    const { pro } = req.body as { pro: boolean };
    const user = await UserModel.findById(req.params.id);
    if (!user) {
      res.status(404).json(err('user_not_found', 'No such user'));
      return;
    }
    if (pro) {
      user.subscriptionStatus = 'active';
      user.subscriptionPlan = 'monthly';
      user.currentPeriodEnd = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    } else {
      user.subscriptionStatus = 'free';
      user.subscriptionPlan = 'free';
      user.currentPeriodEnd = null;
    }
    await user.save();
    res.json(ok({ id: user._id.toString(), isPro: pro }));
  }),
);

// -- GET /actions — global action-log feed with filters ----------------------
adminRouter.get(
  '/actions',
  validate(
    z.object({
      platform: z.enum(['all', ...PLATFORMS]).default('all'),
      actionType: z.enum(['all', ...ACTION_TYPES]).default('all'),
      success: z.enum(['all', 'true', 'false']).default('all'),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { platform, actionType, success, page, limit } = req.query as unknown as {
      platform: string;
      actionType: string;
      success: string;
      page: number;
      limit: number;
    };
    const filter: Record<string, unknown> = {};
    if (platform !== 'all') filter.platform = platform;
    if (actionType !== 'all') filter.actionType = actionType;
    if (success !== 'all') filter.success = success === 'true';

    const [docs, total] = await Promise.all([
      ActionLogModel.find(filter)
        .sort({ timestamp: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate<{ userId: { _id: unknown; email: string; name: string } }>('userId', 'email name')
        .lean(),
      ActionLogModel.countDocuments(filter),
    ]);

    const actions = docs.map((a) => {
      const u = a.userId as unknown as { _id?: unknown; email?: string; name?: string } | null;
      return {
        id: a._id.toString(),
        user: u?._id
          ? { id: String(u._id), email: u.email ?? '', name: u.name ?? '' }
          : null,
        platform: a.platform,
        actionType: a.actionType,
        targetUrl: a.targetUrl,
        targetHandle: a.targetHandle ?? null,
        success: a.success,
        errorMessage: a.errorMessage ?? null,
        timestamp: (a.timestamp as Date).toISOString(),
      };
    });

    res.json(ok({ actions, total, page, limit }));
  }),
);

// -- GET /drafts — comment-draft feed ----------------------------------------
adminRouter.get(
  '/drafts',
  validate(
    z.object({
      status: z.enum(['all', 'pending', 'approved', 'rejected', 'posted', 'failed']).default('all'),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(50),
    }),
    'query',
  ),
  asyncHandler(async (req, res) => {
    const { status, page, limit } = req.query as unknown as {
      status: string;
      page: number;
      limit: number;
    };
    const filter: Record<string, unknown> = {};
    if (status !== 'all') filter.status = status;

    const [docs, total] = await Promise.all([
      CommentDraftModel.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate<{ userId: { _id: unknown; email: string } }>('userId', 'email')
        .lean(),
      CommentDraftModel.countDocuments(filter),
    ]);

    const drafts = docs.map((d) => {
      const u = d.userId as unknown as { _id?: unknown; email?: string } | null;
      return {
        id: d._id.toString(),
        user: u?._id ? { id: String(u._id), email: u.email ?? '' } : null,
        platform: d.platform,
        postUrl: d.postUrl,
        draftText: d.draftText,
        tone: d.tone,
        status: d.status,
        createdAt: (d.createdAt as Date).toISOString(),
      };
    });

    res.json(ok({ drafts, total, page, limit }));
  }),
);
