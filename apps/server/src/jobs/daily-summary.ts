/**
 * End-of-day digest scheduler. Runs hourly; for each user whose local day has
 * just ended (in THEIR timezone) it emails a recap of that day's actions, once.
 *
 * Timezone handling is dependency-free (Intl): we pull the last ~48h of a user's
 * action logs and bucket each entry by its local calendar date, so we never have
 * to compute UTC day boundaries.
 *
 * Dedup is a single `lastDailySummaryDate` marker on the user, CLAIMED before
 * the email is sent rather than stamped after it. Two instances (or an overlapping
 * run after a slow pass) would otherwise both find the marker unset and both
 * send — every user getting the same recap twice. The claim is a conditional
 * update, so exactly one runner wins; if the send then fails we roll the marker
 * back so the next pass can retry.
 */
import { UserModel } from '../models/user.model.js';
import { ActionLogModel } from '../models/action-log.model.js';
import { CommentDraftModel } from '../models/comment-draft.model.js';
import { GrowthSnapshotModel } from '../models/growth-snapshot.model.js';
import { PostOutcomeModel } from '../models/post-outcome.model.js';
import { deltaOver } from '../growth/series.js';
import { sendEmail } from '../email/resend.js';
import { renderDailySummary, buildUnsubscribeUrl } from '../email/daily-summary.js';
import type { DigestGrowth } from '../email/daily-summary.js';
import { logger } from '../logger.js';

const HOUR_MS = 60 * 60 * 1000;
const LOOKBACK_MS = 48 * HOUR_MS;
// Deliver in the user's morning, so a completed day lands as a fresh recap.
const SEND_AFTER_LOCAL_HOUR = 6;

type CountKey = 'like' | 'comment' | 'follow' | 'bookmark' | 'repost' | 'quote';

const partsOf = (date: Date, tz: string): Record<string, string> => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return map;
};

/** YYYY-MM-DD for `date` as seen in `tz`. */
const localDateString = (date: Date, tz: string): string => {
  const p = partsOf(date, tz);
  return `${p.year}-${p.month}-${p.day}`;
};

/** 0–23 local hour for `date` in `tz`. */
const localHour = (date: Date, tz: string): number => Number(partsOf(date, tz).hour);

/** "Tuesday, 8 July 2025" for a YYYY-MM-DD day string. */
const friendlyDate = (day: string): string => {
  const d = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
};

const safeTz = (tz: string | undefined): string => {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
};

const emptyCounts = (): Record<CountKey, number> => ({
  like: 0,
  comment: 0,
  follow: 0,
  bookmark: 0,
  repost: 0,
  quote: 0,
});

/**
 * One pass: find users with recent successful activity, and for each whose
 * previous local day hasn't been summarised yet (and who's past their morning
 * send hour), compose and send the recap.
 */
export const runDailySummaryJob = async (): Promise<void> => {
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
      if (user.preferences?.dailyDigest === false) continue;
      const tz = safeTz(user.preferences?.timezone);
      if (localHour(now, tz) < SEND_AFTER_LOCAL_HOUR) continue;

      // The day that just ended, in the user's timezone.
      const targetDay = localDateString(new Date(now.getTime() - 24 * HOUR_MS), tz);
      if (user.lastDailySummaryDate === targetDay) continue;

      const logs = await ActionLogModel.find({
        userId: user._id,
        success: true,
        timestamp: { $gte: since },
      }).lean();
      const dayLogs = logs.filter((l) => localDateString(l.timestamp as Date, tz) === targetDay);
      if (dayLogs.length === 0) {
        // Nothing to report for the completed day — mark so we don't re-check.
        await UserModel.updateOne({ _id: user._id }, { $set: { lastDailySummaryDate: targetDay } });
        continue;
      }

      const counts = emptyCounts();
      const follows: { handle: string; url: string }[] = [];
      for (const l of dayLogs) {
        const t = l.actionType as CountKey;
        if (t in counts) counts[t] += 1;
        if (t === 'follow' && l.targetHandle) {
          follows.push({ handle: String(l.targetHandle).replace(/^@/, ''), url: l.targetUrl as string });
        }
      }

      const drafts = await CommentDraftModel.find({
        userId: user._id,
        status: 'posted',
        postedAt: { $gte: since },
      }).lean();
      const dayDrafts = drafts.filter(
        (d) => d.postedAt && localDateString(d.postedAt as Date, tz) === targetDay,
      );
      const replies = dayDrafts.slice(0, 25).map((d) => ({
        text: String(d.draftText),
        postUrl: String(d.postUrl),
        tone: String(d.tone),
      }));

      // Follower movement — the "did it work?" line. Only included when there
      // are at least two readings to compare, so the recap never implies a
      // trend the growth scan hasn't actually measured yet.
      let growth: DigestGrowth | null = null;
      // The DAY's own change (updateplan 4.5) — what a daily email should
      // actually lead with. Separate from the 7-day trend above: two
      // consecutive daily readings is a different, stricter bar than two
      // readings a week apart, and either can exist without the other.
      let dayChange: { followers: number; change: number } | null = null;
      const snaps = await GrowthSnapshotModel.find({ userId: user._id })
        .sort({ date: -1 })
        .limit(31)
        .lean();
      if (snaps.length >= 2) {
        const series = snaps
          .map((snap) => ({ date: snap.date, followers: snap.followers }))
          .reverse();
        const week = deltaOver(series, 7);
        const newest = series[series.length - 1];
        if (newest && week.change !== null) {
          growth = { followers: newest.followers, change: week.change, days: week.days };
        }
        const day = deltaOver(series, 1);
        if (newest && day.change !== null && day.days === 1) {
          dayChange = { followers: newest.followers, change: day.change };
        }
      }

      // The day's single best-performing reply (updateplan 4.5) — matched by
      // EXACT text against a scraped PostOutcome, never a guess. `postReplyInArticle`
      // types the draft text verbatim, so a match here is a real one; no match
      // (too fresh for a growth scan to have found it yet, or none posted) means
      // no best reply is named, rather than naming one with invented numbers.
      let bestReply: { text: string; postUrl: string; likes: number; replies: number } | null = null;
      if (dayDrafts.length > 0) {
        const outcomes = await PostOutcomeModel.find({ userId: user._id })
          .sort({ likes: -1 })
          .limit(200)
          .lean();
        const byText = new Map(outcomes.map((o) => [o.text.trim(), o]));
        for (const draft of dayDrafts) {
          const match = byText.get(draft.draftText.trim());
          if (!match) continue;
          if (!bestReply || match.likes > bestReply.likes) {
            bestReply = {
              text: match.text,
              postUrl: match.url,
              likes: match.likes,
              replies: match.replies,
            };
          }
        }
      }

      // Claim this user's day BEFORE sending. Conditional on the marker still
      // being unset, so concurrent runners can't both win it.
      const claim = await UserModel.updateOne(
        { _id: user._id, lastDailySummaryDate: { $ne: targetDay } },
        { $set: { lastDailySummaryDate: targetDay } },
      );
      if (claim.modifiedCount === 0) {
        // Someone else got there first (or already sent it) — nothing to do.
        continue;
      }

      const { subject, html, text } = renderDailySummary({
        firstName: (user.name ?? '').split(/\s+/)[0] || 'there',
        dateLabel: friendlyDate(targetDay),
        counts,
        totalActions: dayLogs.length,
        replies,
        moreReplies: Math.max(0, dayDrafts.length - replies.length),
        follows: follows.slice(0, 15),
        moreFollows: Math.max(0, follows.length - 15),
        growth,
        dayChange,
        bestReply,
        unsubscribeUrl: buildUnsubscribeUrl(userId),
      });

      try {
        await sendEmail({ to: user.email, subject, html, text });
      } catch (sendError) {
        // Release the claim so the next hourly pass can try again — otherwise a
        // transient email outage silently costs the user that day's recap.
        await UserModel.updateOne(
          { _id: user._id, lastDailySummaryDate: targetDay },
          { $set: { lastDailySummaryDate: null } },
        );
        throw sendError;
      }
      sent += 1;
      logger.info({ userId, day: targetDay, actions: dayLogs.length }, '[daily-summary] recap sent');
    } catch (e) {
      logger.error({ err: e, userId }, '[daily-summary] failed for user');
    }
  }
  if (sent > 0) logger.info({ sent }, '[daily-summary] pass complete');
};

/** Start the hourly scheduler (plus one run shortly after boot). */
export const startDailySummaryScheduler = (): void => {
  const run = (): void => {
    runDailySummaryJob().catch((e) => logger.error({ err: e }, '[daily-summary] job error'));
  };
  setTimeout(run, 30_000).unref();
  setInterval(run, HOUR_MS).unref();
  logger.info('[daily-summary] scheduler started (hourly)');
};
