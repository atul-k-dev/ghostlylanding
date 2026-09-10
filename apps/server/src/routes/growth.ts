/**
 * Growth scoreboard endpoints.
 *
 * The extension scrapes the user's own profile once a day (followers, following,
 * and how their recent replies performed) and posts it here. The summary
 * endpoint does the aggregation so the popup can stay a dumb renderer.
 */
import { Router } from 'express';
import { z } from 'zod';
import { ok, err, GROWTH_LIMITS, ATTRIBUTION_STALE_DAYS } from '@casper/shared';
import type { GrowthSummary, PostOutcome, TargetPerformance, TopicPerformance } from '@casper/shared';
import { asyncHandler } from '../middleware/async-handler.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { Types } from 'mongoose';
import { GrowthSnapshotModel } from '../models/growth-snapshot.model.js';
import { PostOutcomeModel } from '../models/post-outcome.model.js';
import { ActionLogModel } from '../models/action-log.model.js';
import { deltaOver } from '../growth/series.js';

const STALE_MS = ATTRIBUTION_STALE_DAYS * 24 * 60 * 60 * 1000;

export const growthRouter = Router();

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// -- POST /snapshot ----------------------------------------------------------
const snapshotSchema = z.object({
  date: z.string().regex(DATE_RE, 'expected YYYY-MM-DD'),
  followers: z.number().int().min(0).max(1_000_000_000),
  following: z.number().int().min(0).max(1_000_000_000),
  posts: z.number().int().min(0).max(10_000_000).nullable().optional(),
  followedBack: z.number().int().min(0).max(100_000).nullable().optional(),
  followedBackSample: z.number().int().min(0).max(100_000).nullable().optional(),
});

growthRouter.post(
  '/snapshot',
  requireAuth,
  // One scan a day is the norm; 10/hour absorbs manual refreshes and retries.
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    key: (req) => `growthsnap:${req.auth?.sub ?? req.ip}`,
  }),
  validate(snapshotSchema),
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const body = req.body as z.infer<typeof snapshotSchema>;
    // Upsert on (user, date): re-running the scan the same day refreshes the
    // point instead of forking the series.
    await GrowthSnapshotModel.updateOne(
      { userId: req.auth.sub, date: body.date },
      {
        $set: {
          followers: body.followers,
          following: body.following,
          posts: body.posts ?? null,
          // Only overwrite the follow-back sample when this run actually took
          // one — a scan that skipped it must not blank yesterday's number.
          ...(typeof body.followedBack === 'number'
            ? {
                followedBack: body.followedBack,
                followedBackSample: body.followedBackSample ?? null,
              }
            : {}),
        },
      },
      { upsert: true },
    );
    res.json(ok({ date: body.date }));
  }),
);

// -- POST /outcomes ----------------------------------------------------------
const outcomeSchema = z.object({
  tweetId: z.string().regex(/^\d{1,25}$/),
  url: z.string().url().max(2_048),
  text: z.string().max(4_000).default(''),
  isReply: z.boolean().default(false),
  likes: z.number().int().min(0).max(100_000_000),
  replies: z.number().int().min(0).max(100_000_000),
  reposts: z.number().int().min(0).max(100_000_000),
  views: z.number().int().min(0).max(100_000_000_000).nullable().optional(),
  publishedAt: z.string().datetime().nullable().optional(),
  /** Who this reply was posted under (updateplan 5.1) — omitted/null for a
   *  standalone post. */
  repliedToHandle: z.string().max(80).nullable().optional(),
});

const outcomesSchema = z.object({
  outcomes: z.array(outcomeSchema).min(1).max(GROWTH_LIMITS.maxOutcomesPerBatch),
});

growthRouter.post(
  '/outcomes',
  requireAuth,
  rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    key: (req) => `growthout:${req.auth?.sub ?? req.ip}`,
  }),
  validate(outcomesSchema),
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const { outcomes } = req.body as z.infer<typeof outcomesSchema>;
    const now = new Date();
    // Numbers only ever grow on X, but a re-scrape of a *partly rendered* card
    // could read low. $max keeps the best figure we've seen so a bad read can't
    // walk a good reply backwards.
    const operations = outcomes.map((o) => ({
      updateOne: {
        filter: { userId: req.auth!.sub, tweetId: o.tweetId },
        update: {
          $set: {
            url: o.url,
            text: o.text,
            isReply: o.isReply,
            publishedAt: o.publishedAt ? new Date(o.publishedAt) : null,
            lastCheckedAt: now,
            // Only overwrite when this scan actually read a "Replying to"
            // line — an older extension (or a standalone post) sends none,
            // and that must not blank out a value a previous scan captured.
            ...(o.repliedToHandle ? { repliedToHandle: o.repliedToHandle } : {}),
          },
          $max: {
            likes: o.likes,
            replies: o.replies,
            reposts: o.reposts,
            ...(typeof o.views === 'number' ? { views: o.views } : {}),
          },
        },
        upsert: true,
      },
    }));
    const result = await PostOutcomeModel.bulkWrite(operations, { ordered: false });
    res.json(
      ok({
        received: outcomes.length,
        inserted: result.upsertedCount ?? 0,
        updated: result.modifiedCount ?? 0,
      }),
    );
  }),
);

// -- GET /summary ------------------------------------------------------------
const summarySchema = z.object({
  days: z.coerce.number().int().positive().max(GROWTH_LIMITS.maxSeriesDays).default(30),
});

growthRouter.get(
  '/summary',
  requireAuth,
  rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    key: (req) => `growthsum:${req.auth?.sub ?? req.ip}`,
  }),
  validate(summarySchema, 'query'),
  asyncHandler(async (req, res) => {
    if (!req.auth) {
      res.status(401).json(err('unauthorized', 'No auth context'));
      return;
    }
    const { days } = req.query as unknown as z.infer<typeof summarySchema>;
    const userObjectId = new Types.ObjectId(req.auth.sub);

    const [snapshots, top, totals, sourcesAgg, targetEngagementAgg, targetRepliesAgg, topicsAgg] =
      await Promise.all([
        GrowthSnapshotModel.find({ userId: req.auth.sub })
          .sort({ date: -1 })
          .limit(days)
          .lean(),
        PostOutcomeModel.find({ userId: req.auth.sub })
          .sort({ likes: -1, replies: -1 })
          .limit(GROWTH_LIMITS.topPosts)
          .lean(),
        // aggregate() bypasses Mongoose casting — $match needs a real ObjectId
        // here, unlike the find() calls above.
        PostOutcomeModel.aggregate<{ tracked: number; totalLikes: number; totalReplies: number }>([
          { $match: { userId: userObjectId } },
          {
            $group: {
              _id: null,
              tracked: { $sum: 1 },
              totalLikes: { $sum: '$likes' },
              totalReplies: { $sum: '$replies' },
            },
          },
        ]),
        // Where the engagement is coming from (5.1) — split by whether the
        // user's own post WAS a reply, not a follower attribution (there
        // isn't one).
        PostOutcomeModel.aggregate<{ _id: boolean; likes: number }>([
          { $match: { userId: userObjectId } },
          { $group: { _id: '$isReply', likes: { $sum: '$likes' } } },
        ]),
        // Per-target engagement: sum of what THIS user's own replies earned,
        // grouped by who they replied to (5.1's TargetPerformance.engagement).
        PostOutcomeModel.aggregate<{
          _id: string;
          likes: number;
          replies: number;
          reposts: number;
          views: number;
        }>([
          { $match: { userId: userObjectId, repliedToHandle: { $ne: null } } },
          {
            $group: {
              _id: { $toLower: '$repliedToHandle' },
              likes: { $sum: '$likes' },
              replies: { $sum: '$replies' },
              reposts: { $sum: '$reposts' },
              views: { $sum: { $ifNull: ['$views', 0] } },
            },
          },
        ]),
        // Per-target REPLIES SENT — a real count from the action log, not from
        // scraped outcomes (which only cover what the growth scan has read so
        // far). Also carries the handle's original casing, via $first.
        ActionLogModel.aggregate<{ _id: string; handle: string; repliesSent: number; lastActionAt: Date }>(
          [
            {
              $match: {
                userId: userObjectId,
                actionType: 'comment',
                success: true,
                targetHandle: { $ne: null },
              },
            },
            {
              $group: {
                _id: { $toLower: '$targetHandle' },
                handle: { $first: '$targetHandle' },
                repliesSent: { $sum: 1 },
                lastActionAt: { $max: '$timestamp' },
              },
            },
          ],
        ),
        // Per-topic replies sent (5.1's TopicPerformance). No engagement figure
        // — a keyword match isn't the author of anything a PostOutcome could
        // be linked back to, unlike a target creator's handle.
        ActionLogModel.aggregate<{ _id: string; repliesSent: number; lastActionAt: Date }>([
          {
            $match: {
              userId: userObjectId,
              actionType: 'comment',
              success: true,
              matchedKeyword: { $ne: null },
            },
          },
          {
            $group: {
              _id: '$matchedKeyword',
              repliesSent: { $sum: 1 },
              lastActionAt: { $max: '$timestamp' },
            },
          },
        ]),
      ]);

    // Mongo gave us newest-first (so `limit` keeps the RECENT days); the series
    // and every delta below read oldest-first.
    const ordered = [...snapshots].reverse();
    const series = ordered.map((s) => ({ date: s.date, followers: s.followers }));
    const newest = ordered[ordered.length - 1];
    const agg = totals[0] ?? { tracked: 0, totalLikes: 0, totalReplies: 0 };

    const postsLikes = sourcesAgg.find((s) => s._id === false)?.likes ?? 0;
    const repliesLikes = sourcesAgg.find((s) => s._id === true)?.likes ?? 0;

    const now = Date.now();
    const engagementByHandle = new Map(targetEngagementAgg.map((e) => [e._id, e]));
    const targets: TargetPerformance[] = targetRepliesAgg
      .map((t): TargetPerformance => {
        const eng = engagementByHandle.get(t._id);
        const lastActionAt = t.lastActionAt ? t.lastActionAt.toISOString() : null;
        return {
          handle: t.handle,
          repliesSent: t.repliesSent,
          engagement: {
            likes: eng?.likes ?? 0,
            replies: eng?.replies ?? 0,
            reposts: eng?.reposts ?? 0,
            views: eng?.views ?? 0,
          },
          lastActionAt,
          stale: t.lastActionAt ? now - t.lastActionAt.getTime() > STALE_MS : true,
        };
      })
      .sort((a, b) => b.repliesSent - a.repliesSent);

    const topics: TopicPerformance[] = topicsAgg
      .map((t): TopicPerformance => ({
        keyword: t._id,
        repliesSent: t.repliesSent,
        lastActionAt: t.lastActionAt ? t.lastActionAt.toISOString() : null,
        stale: t.lastActionAt ? now - t.lastActionAt.getTime() > STALE_MS : true,
      }))
      .sort((a, b) => b.repliesSent - a.repliesSent);

    const summary: GrowthSummary = {
      latest: newest
        ? {
            date: newest.date,
            followers: newest.followers,
            following: newest.following,
            posts: newest.posts ?? null,
            followedBack: newest.followedBack ?? null,
            followedBackSample: newest.followedBackSample ?? null,
          }
        : null,
      series,
      deltas: {
        day: deltaOver(series, 1),
        week: deltaOver(series, 7),
        month: deltaOver(series, 30),
      },
      replies: {
        tracked: agg.tracked,
        totalLikes: agg.totalLikes,
        totalReplies: agg.totalReplies,
        avgLikes: agg.tracked > 0 ? Math.round((agg.totalLikes / agg.tracked) * 10) / 10 : 0,
        top: top.map(
          (t): PostOutcome => ({
            tweetId: t.tweetId,
            url: t.url,
            text: t.text ?? '',
            isReply: t.isReply ?? false,
            likes: t.likes ?? 0,
            replies: t.replies ?? 0,
            reposts: t.reposts ?? 0,
            views: t.views ?? null,
            publishedAt: t.publishedAt ? (t.publishedAt as Date).toISOString() : null,
            repliedToHandle: t.repliedToHandle ?? null,
          }),
        ),
      },
      sources: { postsLikes, repliesLikes },
      targets,
      topics,
    };

    res.json(ok(summary));
  }),
);
