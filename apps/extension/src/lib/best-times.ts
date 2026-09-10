import type { ActiveHours, PostOutcome } from '@casper/shared';

/**
 * When to publish (updateplan 3.1).
 *
 * The engine already knows how the user's own posts performed — the growth scan
 * reads their timeline and records likes, replies and reposts against a
 * timestamp. This turns that history into the two questions the auto-draft loop
 * has to answer: which hours are worth publishing in, and when is the next one.
 *
 * Everything here is PURE and works in the browser's LOCAL time, the same way
 * `schedule-time.ts` does — a slot is a wall-clock time the user recognises,
 * not an instant in UTC.
 *
 * The honesty rule this module exists to enforce: below `MIN_DAYS` of history it
 * returns a **fallback** and says so (`personalised: false`), so the UI can tell
 * the user these are sensible defaults rather than implying it has learned their
 * audience from four posts. A confident wrong answer here is worse than an
 * openly generic one.
 */

/** A publishing slot. `weekday` null means "any day" — the fallback's shape. */
export interface Slot {
  /** 0 = Sunday … 6 = Saturday, or null for every day. */
  weekday: number | null;
  /** 0–23, local. */
  hour: number;
}

export interface BestTimes {
  /** Best first. Never empty — the fallback always has at least one. */
  slots: Slot[];
  /** False when these are the fallback slots and must be labelled as such. */
  personalised: boolean;
  /** Days the history spans, so the UI can say how much it is working from. */
  days: number;
  /** Posts (not replies) the model actually used. */
  posts: number;
}

/**
 * Below two weeks of history there is no weekly pattern to find — one good
 * Tuesday is a coincidence, not a habit.
 */
export const MIN_DAYS = 14;

/**
 * …and a fortnight of silence is not history either. Both gates have to pass:
 * three posts spread over a month would otherwise be "personalised" from three
 * data points.
 */
export const MIN_POSTS = 8;

/**
 * The fallback: the start of the working day and the evening scroll. Not
 * "optimal" — just the two times most audiences are on X, offered plainly.
 */
export const FALLBACK_HOURS = [9, 18] as const;

/**
 * What a post was worth. A repost puts it in front of an audience the user
 * doesn't have, a reply is someone spending a minute on it, a like is a thumb.
 * Weighted in that order rather than treating all engagement as equal.
 */
export const scoreOutcome = (o: Pick<PostOutcome, 'likes' | 'replies' | 'reposts'>): number =>
  (o.likes ?? 0) + 2 * (o.replies ?? 0) + 3 * (o.reposts ?? 0);

/**
 * Pseudo-posts of "average" mixed into every bucket mean.
 *
 * 7 × 24 = 168 buckets and a realistic history holds a few dozen posts, so
 * almost every exact bucket has one post or none. Without this the winner is
 * whichever single post happened to go viral, and the model is really saying
 * "post again at the exact minute you got lucky". Shrinking each mean toward the
 * overall mean makes a bucket earn its score with more than one post.
 */
const PRIOR = 3;

/** How much of a slot's score comes from its hour, its weekday, and itself. */
const W_HOUR = 0.5;
const W_DAY = 0.2;
const W_EXACT = 0.3;

/** Most slots to return on one weekday, and how far apart they have to sit. */
const MAX_PER_WEEKDAY = 2;
const MIN_HOURS_APART = 3;

const DAY_MS = 86_400_000;

/**
 * Is this hour inside the user's active window? Half-open, exactly like
 * `isWithinActiveHours` — active at `startHour`, asleep at `endHour` — because
 * publishing while the engine is asleep is the machine-like thing active hours
 * exist to prevent.
 */
export const isHourActive = (hour: number, hours: ActiveHours): boolean => {
  const h = ((hour % 24) + 24) % 24;
  if (hours.startHour <= hours.endHour) return h >= hours.startHour && h < hours.endHour;
  return h >= hours.startHour || h < hours.endHour;
};

/** Push an hour into the active window, so the fallback stays usable for a user
 *  whose window contains neither 9am nor 6pm. */
const clampToActive = (hour: number, hours: ActiveHours): number =>
  isHourActive(hour, hours) ? hour : hours.startHour;

const fallback = (hours: ActiveHours, days: number, posts: number): BestTimes => {
  const slots: Slot[] = [];
  for (const h of FALLBACK_HOURS) {
    const hour = clampToActive(h, hours);
    if (!slots.some((s) => s.hour === hour)) slots.push({ weekday: null, hour });
  }
  return { slots, personalised: false, days, posts };
};

export interface BestTimesOptions {
  /** Most slots to return. The fallback ignores it — it has its own two. */
  count?: number;
  activeHours: ActiveHours;
}

/**
 * Rank publishing slots from the user's own results.
 *
 * Replies are excluded on purpose: they publish whenever the engine happens to
 * be running, so their timestamps describe the engine's active hours rather
 * than the audience's. Only what the user chose to post says anything about
 * when their audience is awake.
 */
export const bestTimes = (
  outcomes: readonly PostOutcome[],
  { count = 4, activeHours }: BestTimesOptions,
): BestTimes => {
  const usable = outcomes
    .filter((o) => !o.isReply && o.publishedAt !== null)
    .map((o) => ({ at: Date.parse(o.publishedAt as string), score: scoreOutcome(o) }))
    .filter((o) => Number.isFinite(o.at));

  if (usable.length === 0) return fallback(activeHours, 0, 0);

  const times = usable.map((o) => o.at);
  const days = Math.round((Math.max(...times) - Math.min(...times)) / DAY_MS) + 1;
  if (days < MIN_DAYS || usable.length < MIN_POSTS) {
    return fallback(activeHours, days, usable.length);
  }

  const mean = usable.reduce((sum, o) => sum + o.score, 0) / usable.length;

  const hourSum = new Array<number>(24).fill(0);
  const hourN = new Array<number>(24).fill(0);
  const daySum = new Array<number>(7).fill(0);
  const dayN = new Array<number>(7).fill(0);
  const exactSum = new Map<string, number>();
  const exactN = new Map<string, number>();

  for (const { at, score } of usable) {
    const d = new Date(at);
    const h = d.getHours();
    const wd = d.getDay();
    const key = `${wd}:${h}`;
    hourSum[h] = (hourSum[h] ?? 0) + score;
    hourN[h] = (hourN[h] ?? 0) + 1;
    daySum[wd] = (daySum[wd] ?? 0) + score;
    dayN[wd] = (dayN[wd] ?? 0) + 1;
    exactSum.set(key, (exactSum.get(key) ?? 0) + score);
    exactN.set(key, (exactN.get(key) ?? 0) + 1);
  }

  const shrunk = (sum: number, n: number): number => (sum + PRIOR * mean) / (n + PRIOR);

  const ranked: { slot: Slot; score: number }[] = [];
  for (let wd = 0; wd < 7; wd += 1) {
    for (let h = 0; h < 24; h += 1) {
      if (!isHourActive(h, activeHours)) continue;
      const key = `${wd}:${h}`;
      const score =
        W_HOUR * shrunk(hourSum[h] ?? 0, hourN[h] ?? 0) +
        W_DAY * shrunk(daySum[wd] ?? 0, dayN[wd] ?? 0) +
        W_EXACT * shrunk(exactSum.get(key) ?? 0, exactN.get(key) ?? 0);
      ranked.push({ slot: { weekday: wd, hour: h }, score });
    }
  }
  // Ties broken by the earlier hour, so an arbitrary winner is at least stable.
  ranked.sort((a, b) => b.score - a.score || a.slot.hour - b.slot.hour);

  // Spread them out. Four slots inside three hours of one Tuesday is a ranking,
  // not a schedule.
  const chosen: Slot[] = [];
  for (const { slot } of ranked) {
    if (chosen.length >= count) break;
    const sameDay = chosen.filter((s) => s.weekday === slot.weekday);
    if (sameDay.length >= MAX_PER_WEEKDAY) continue;
    if (sameDay.some((s) => Math.abs(s.hour - slot.hour) < MIN_HOURS_APART)) continue;
    chosen.push(slot);
  }

  if (chosen.length === 0) return fallback(activeHours, days, usable.length);
  return { slots: chosen, personalised: true, days, posts: usable.length };
};

export interface NextSlotsOptions {
  /** ms epoch to search forward from. */
  from: number;
  /** How many slots to hand back. */
  count: number;
  /** ms epochs already spoken for — existing scheduled posts. */
  taken?: readonly number[];
  /** Nothing may be scheduled this close to another post. */
  minGapMs: number;
  activeHours: ActiveHours;
}

/** How far ahead we look for a free slot before giving up. */
const HORIZON_DAYS = 14;

/**
 * The next free moments matching these slots.
 *
 * Returns fewer than `count` — possibly none — rather than inventing a time
 * that breaks the gap rule. An empty day in the week strip is a true statement;
 * two posts twenty minutes apart is not.
 */
export const nextSlots = (
  best: BestTimes,
  { from, count, taken = [], minGapMs, activeHours }: NextSlotsOptions,
): number[] => {
  if (count <= 0) return [];
  const picked: number[] = [];
  const clashes = (ms: number): boolean =>
    [...taken, ...picked].some((t) => Math.abs(t - ms) < minGapMs);

  const cursor = new Date(from);
  cursor.setMinutes(0, 0, 0);
  // Never land on the hour that is already half gone — start from the next one.
  cursor.setHours(cursor.getHours() + 1);

  const limit = from + HORIZON_DAYS * DAY_MS;
  while (cursor.getTime() <= limit && picked.length < count) {
    const ms = cursor.getTime();
    const hour = cursor.getHours();
    const weekday = cursor.getDay();
    const matches = best.slots.some(
      (s) => s.hour === hour && (s.weekday === null || s.weekday === weekday),
    );
    if (matches && isHourActive(hour, activeHours) && !clashes(ms)) picked.push(ms);
    cursor.setHours(cursor.getHours() + 1);
  }
  return picked;
};

/** "Tuesdays at 3pm" / "9am" — how a slot is written for the user. */
export const describeSlot = (slot: Slot): string => {
  const h = ((slot.hour % 24) + 24) % 24;
  const suffix = h < 12 ? 'am' : 'pm';
  const twelve = h % 12 === 0 ? 12 : h % 12;
  const time = `${twelve}${suffix}`;
  if (slot.weekday === null) return time;
  // 2026-01-04 was a Sunday, so +weekday lands on the right day name.
  const day = new Date(2026, 0, 4 + slot.weekday).toLocaleDateString(undefined, {
    weekday: 'long',
  });
  return `${day}s at ${time}`;
};
