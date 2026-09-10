/**
 * Weekly digest scheduler (updateplan 4.4).
 *
 * Same shape as `daily-summary.ts` on purpose — the plan says reuse its
 * timezone bucketing and its claim-before-send dedup rather than reinventing
 * either, and this job does exactly that (`./local-time.js` is the shared
 * bucketing; the claim below is the identical pattern, one week wide instead
 * of one day).
 *
 * Runs hourly; for each user whose local week just ended on a Monday (in
 * THEIR timezone) and who is past their morning send hour, it emails once.
 */
import { UserModel } from '../models/user.model.js';
import { ActionLogModel } from '../models/action-log.model.js';
import { GrowthSnapshotModel } from '../models/growth-snapshot.model.js';
import { PostOutcomeModel } from '../models/post-outcome.model.js';
import { CommentDraftModel } from '../models/comment-draft.model.js';
import { deltaOver, type SeriesPoint } from '../growth/series.js';
import { sendEmail } from '../email/resend.js';
import { renderWeeklySummary, type WeeklyGrowth, type WeeklyBestPost } from '../email/weekly-summary.js';
import { buildUnsubscribeUrl } from '../email/unsubscribe.js';
import { localDateString, localHour, localIsoWeekday, friendlyWeekRange, safeTz } from './local-time.js';
import { logger } from '../logger.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const LOOKBACK_MS = 8 * DAY_MS;
// Monday, same morning window as the daily email — a completed week lands as
// a fresh recap rather than arriving mid-Sunday-night.
const SEND_ON_ISO_WEEKDAY = 1;
const SEND_AFTER_LOCAL_HOUR = 8;

type CountKey = 'like' | 'comment' | 'follow' | 'bookmark' | 'repost' | 'quote';

const emptyCounts = (): Record<CountKey, number> => ({
  like: 0,
  comment: 0,
  follow: 0,
  bookmark: 0,
  repost: 0,
  quote: 0,
});

/** A week-long delta is only reported as "this week" within a day either side
 *  of exactly 7 — readings are gappy (the browser has to be open), and a
 *  10-day span mislabeled as "this week" would be a trend the data can't back. */
const isWeekSpan = (days: number): boolean => Math.abs(days - 7) <= 1;

/**
 * This week's follower change, compared with the week before it — computed by
 * running `deltaOver` a second time on the series truncated to end a week
 * earlier, so "last week" uses the exact same nearest-reading logic "this
 * week" does rather than a second, looser rule.
 */
const weeklyGrowth = (series: SeriesPoint[]): WeeklyGrowth | null => {
  if (series.length < 2) return null;
  const newest = series[series.length - 1];
  if (!newest) return null;

  const thisWeek = deltaOver(series, 7);
  const changeThisWeek = isWeekSpan(thisWeek.days) ? thisWeek.change : null;

  const weekAgoCutoff = localDateString(new Date(Date.parse(`${newest.date}T00:00:00Z`) - 7 * DAY_MS), 'UTC');
  const truncated = series.filter((p) => p.date <= weekAgoCutoff);
  const lastWeek = deltaOver(truncated, 7);
  const changeLastWeek = isWeekSpan(lastWeek.days) ? lastWeek.change : null;

  if (changeThisWeek === null && changeLastWeek === null) return null;
  return { followers: newest.followers, changeThisWeek, changeLastWeek };
};

export const runWeeklySummaryJob = async (): Promise<void> => {
  const now = new Date();
  const since = new Date(now.getTime() - LOOKBACK_MS);

  const activeIds = await ActionLogModel.distinct('userId', {
    timestamp: { $gte: since },
    success: true,
  });
  if (activeIds.length === 0) return;

  const users = await UserModel.find({
    _id: { $in: activeIds },
    isBanned: { $ne: true },
  }).lean();

  let sent = 0;
  for (const user of users) {
    const userId = String(user._id);
    try {
      if (user.preferences?.weeklyDigest === false) continue;
      const tz = safeTz(user.preferences?.timezone);
      if (localIsoWeekday(now, tz) !== SEND_ON_ISO_WEEKDAY) continue;
      if (localHour(now, tz) < SEND_AFTER_LOCAL_HOUR) continue;

      // The Monday of the week that just finished (yesterday was its Sunday).
      const weekStart = localDateString(new Date(now.getTime() - 7 * DAY_MS), tz);
      if (user.lastWeeklySummaryWeek === weekStart) continue;

      const logs = await ActionLogModel.find({
        userId: user._id,
        success: true,
        timestamp: { $gte: since },
      }).lean();
      const weekLogs = logs.filter((l) => {
        const day = localDateString(l.timestamp as Date, tz);
        return day >= weekStart && day < localDateString(now, tz);
      });

      const snaps = await GrowthSnapshotModel.find({ userId: user._id })
        .sort({ date: -1 })
        .limit(60)
        .lean();
      const series = snaps.map((snap) => ({ date: snap.date, followers: snap.followers })).reverse();
      const growth = weeklyGrowth(series);

      // Nothing happened and nothing measurable moved — a week that genuinely
      // had no activity isn't worth an email, and marking it means we don't
      // re-check every hour until the next Monday.
      if (weekLogs.length === 0 && !growth) {
        await UserModel.updateOne({ _id: user._id }, { $set: { lastWeeklySummaryWeek: weekStart } });
        continue;
      }

      const counts = emptyCounts();
      for (const l of weekLogs) {
        const t = l.actionType as CountKey;
        if (t in counts) counts[t] += 1;
      }

      // This week's single best-performing reply/post (updateplan 4.4) — same
      // exact-text match against a scraped PostOutcome that the daily email
      // uses, widened to the week's window. No match means no best post, never
      // a guessed one.
      let bestPost: WeeklyBestPost | null = null;
      const drafts = await CommentDraftModel.find({
        userId: user._id,
        status: 'posted',
        postedAt: { $gte: since },
      }).lean();
      const weekDrafts = drafts.filter((d) => {
        if (!d.postedAt) return false;
        const day = localDateString(d.postedAt as Date, tz);
        return day >= weekStart && day < localDateString(now, tz);
      });
      if (weekDrafts.length > 0) {
        const outcomes = await PostOutcomeModel.find({ userId: user._id })
          .sort({ likes: -1 })
          .limit(300)
          .lean();
        const byText = new Map(outcomes.map((o) => [o.text.trim(), o]));
        for (const draft of weekDrafts) {
          const match = byText.get(draft.draftText.trim());
          if (!match) continue;
          if (!bestPost || match.likes > bestPost.likes) {
            bestPost = { text: match.text, postUrl: match.url, likes: match.likes, replies: match.replies };
          }
        }
      }

      // Claim this user's week BEFORE sending — identical pattern to the
      // daily job's conditional update, so two overlapping hourly runs can't
      // both win it.
      const claim = await UserModel.updateOne(
        { _id: user._id, lastWeeklySummaryWeek: { $ne: weekStart } },
        { $set: { lastWeeklySummaryWeek: weekStart } },
      );
      if (claim.modifiedCount === 0) continue;

      const { subject, html, text } = renderWeeklySummary({
        firstName: (user.name ?? '').split(/\s+/)[0] || 'there',
        weekRangeLabel: friendlyWeekRange(weekStart),
        growth,
        bestPost,
        counts,
        totalActions: weekLogs.length,
        unsubscribeUrl: buildUnsubscribeUrl(userId, 'weekly'),
      });

      try {
        await sendEmail({ to: user.email, subject, html, text });
      } catch (sendError) {
        await UserModel.updateOne(
          { _id: user._id, lastWeeklySummaryWeek: weekStart },
          { $set: { lastWeeklySummaryWeek: null } },
        );
        throw sendError;
      }
      sent += 1;
      logger.info({ userId, weekStart, actions: weekLogs.length }, '[weekly-summary] recap sent');
    } catch (e) {
      logger.error({ err: e, userId }, '[weekly-summary] failed for user');
    }
  }
  if (sent > 0) logger.info({ sent }, '[weekly-summary] pass complete');
};

/** Start the hourly scheduler (plus one run shortly after boot). Offset from
 *  the daily job's own boot run so they don't both hit Mongo in the same tick. */
export const startWeeklySummaryScheduler = (): void => {
  const run = (): void => {
    runWeeklySummaryJob().catch((e) => logger.error({ err: e }, '[weekly-summary] job error'));
  };
  setTimeout(run, 45_000).unref();
  setInterval(run, HOUR_MS).unref();
  logger.info('[weekly-summary] scheduler started (hourly, Mondays only)');
};
