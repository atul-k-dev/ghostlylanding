import type { PostOutcome, TargetPerformance } from '@casper/shared';
import type { CorrectedDraft } from './storage.js';
import { scoreOutcome } from './best-times.js';

/**
 * Proactive questions in Ask (updateplan 6.2) — "it notices things and comes
 * to ask." Every one of these is a deterministic pattern over data Ask's own
 * tools already surface (growth outcomes, target performance, the corrected-
 * draft pairs 2.4 already collects) — no model call, so there is nothing here
 * that could hallucinate a pattern that isn't there. Deliberately at most ONE
 * nudge at a time (the same "never two cards" rule 1.7 already established
 * for condition cards) — three separate observations competing for attention
 * on open would just be noise.
 */

export type ProactiveNudgeKind = 'standout-day' | 'targets-quiet' | 'edits-shorter';

export interface ProactiveNudge {
  kind: ProactiveNudgeKind;
  /** Exactly what the user would read — written here, not templated at the
   *  call site, so the wording can be pinned and tested. */
  message: string;
  /** The follow-up message sent to Ask if they say yes — phrased as a normal
   *  user turn, so it goes through the exact same diff-confirmation path as
   *  anything typed by hand. Never applies anything directly itself. */
  onYesMessage: string;
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** A single day standing out well above the others (updateplan 6.2, example
 *  1). Needs at least 2 posts on the standout day and 2 elsewhere — a single
 *  lucky post is a coincidence, not a pattern (the same reasoning MIN_POSTS
 *  applies to best-times personalisation). */
export const detectStandoutDay = (
  outcomes: readonly PostOutcome[],
  multiplier = 4,
): ProactiveNudge | null => {
  const byDay = new Map<number, number[]>();
  for (const o of outcomes) {
    if (o.isReply || !o.publishedAt) continue;
    const t = Date.parse(o.publishedAt);
    if (!Number.isFinite(t)) continue;
    const wd = new Date(t).getDay();
    (byDay.get(wd) ?? byDay.set(wd, []).get(wd))?.push(scoreOutcome(o));
  }
  const days = [...byDay.entries()].filter(([, scores]) => scores.length >= 2);
  if (days.length < 2) return null;

  const avg = (xs: number[]): number => xs.reduce((a, b) => a + b, 0) / xs.length;
  const ranked = days.map(([wd, scores]) => ({ wd, avg: avg(scores) })).sort((a, b) => b.avg - a.avg);
  const top = ranked[0];
  const rest = ranked.slice(1);
  if (!top || top.avg <= 0 || rest.length === 0) return null;
  const restAvg = avg(rest.map((r) => r.avg));
  if (restAvg <= 0 || top.avg < restAvg * multiplier) return null;

  const dayName = WEEKDAY_NAMES[top.wd] ?? 'that day';
  const factor = Math.round((top.avg / restAvg) * 10) / 10;
  return {
    kind: 'standout-day',
    message: `Your ${dayName} posts did ${factor}× your usual — more in that direction?`,
    onYesMessage: `Write more posts aimed at ${dayName}s, like the ones that have done well then.`,
  };
};

/** A majority of watched targets have gone quiet (updateplan 6.2, example
 *  2) — reads the exact `stale` flag the Growth tab already shows, never a
 *  second threshold. Needs at least 3 targets total, so "1 of 1 is quiet"
 *  doesn't trip it — that's just early, not a pattern. */
export const detectTargetsQuiet = (targets: readonly TargetPerformance[]): ProactiveNudge | null => {
  if (targets.length < 3) return null;
  const stale = targets.filter((t) => t.stale);
  if (stale.length < Math.ceil(targets.length / 2)) return null;
  const names = stale
    .slice(0, 3)
    .map((t) => `@${t.handle}`)
    .join(', ');
  return {
    kind: 'targets-quiet',
    message: `${stale.length} of ${targets.length} targets produced nothing in three weeks (${names}${
      stale.length > 3 ? ', …' : ''
    }). Swap them?`,
    onYesMessage: `Drop the target creators that have produced nothing in three weeks, and suggest some to replace them.`,
  };
};

/** The user keeps cutting the model's replies down (updateplan 6.2, example
 *  3). Looks at the most recent N corrections and asks only when a clear
 *  majority got SHORTER, not just different. */
export const detectEditsShorter = (
  corrected: readonly CorrectedDraft[],
  sampleSize = 6,
  threshold = 5,
): ProactiveNudge | null => {
  const recent = corrected.slice(-sampleSize);
  if (recent.length < sampleSize) return null;
  const shorter = recent.filter((c) => c.corrected.trim().length < c.generated.trim().length * 0.85).length;
  if (shorter < threshold) return null;
  return {
    kind: 'edits-shorter',
    message: `You've edited my last ${recent.length} replies to make them shorter. Write shorter from now on?`,
    onYesMessage: 'Write my replies shorter from now on.',
  };
};

/**
 * At most one nudge, in this priority order: a target list going quiet is
 * the most actionable (it's blocking real work), then a standout day (an
 * opportunity), then the voice signal (a style tweak, lowest urgency).
 */
export const detectProactiveNudge = (data: {
  outcomes: readonly PostOutcome[];
  targets: readonly TargetPerformance[];
  corrected: readonly CorrectedDraft[];
}): ProactiveNudge | null =>
  detectTargetsQuiet(data.targets) ?? detectStandoutDay(data.outcomes) ?? detectEditsShorter(data.corrected);
