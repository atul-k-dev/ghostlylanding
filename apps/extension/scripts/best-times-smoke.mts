/* eslint-disable no-console */
/**
 * Best-time smoke (updateplan 3.1).
 *
 * Two things are pinned here, and the second one matters more than the first.
 *
 *  1. A history with a real peak in it produces that peak.
 *  2. A history WITHOUT enough data says so. `personalised: false` is the flag
 *     the UI uses to say "these are sensible defaults" instead of implying it
 *     learned the user's audience from four posts — a confident wrong answer
 *     about when to publish is worse than an openly generic one.
 *
 * Everything under test is pure, so all of it runs in node.
 *
 * Run with: pnpm --filter @casper/extension best-times-smoke
 */
import type { ActiveHours, PostOutcome } from '@casper/shared';
import {
  bestTimes,
  nextSlots,
  describeSlot,
  isHourActive,
  scoreOutcome,
  FALLBACK_HOURS,
  MIN_DAYS,
  MIN_POSTS,
} from '../src/lib/best-times.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

const HOURS: ActiveHours = { startHour: 9, endHour: 22 };
const DAY_MS = 86_400_000;

/** A post published `daysAgo` days back, at `hour` local, with a given score. */
const post = (
  id: number,
  daysAgo: number,
  hour: number,
  likes: number,
  isReply = false,
): PostOutcome => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return {
    tweetId: `t${id}`,
    url: `https://x.com/me/status/${id}`,
    text: `post ${id}`,
    isReply,
    likes,
    replies: 0,
    reposts: 0,
    views: null,
    publishedAt: d.toISOString(),
  };
};

// --- the score weights amplification over applause ------------------------
assert(
  scoreOutcome({ likes: 0, replies: 0, reposts: 1 }) >
    scoreOutcome({ likes: 2, replies: 0, reposts: 0 }),
  'one repost beats two likes — it reaches an audience you do not have',
);
assert(
  scoreOutcome({ likes: 0, replies: 1, reposts: 0 }) >
    scoreOutcome({ likes: 1, replies: 0, reposts: 0 }),
  'a reply beats a like — someone spent a minute on it',
);

// --- a known peak comes back ----------------------------------------------
// 30 days, one post a day at 10am, plus a strong Tuesday-3pm habit.
const withPeak: PostOutcome[] = [];
let id = 0;
for (let d = 1; d <= 30; d += 1) {
  withPeak.push(post(id++, d, 10, 2));
  const when = new Date();
  when.setDate(when.getDate() - d);
  if (when.getDay() === 2) withPeak.push(post(id++, d, 15, 90));
}
const peak = bestTimes(withPeak, { activeHours: HOURS, count: 3 });
assert(peak.personalised, 'a month of posts is personalised');
assert(peak.days >= MIN_DAYS, 'the span it reports is the real one');
assert(peak.slots[0]?.hour === 15, 'the peak HOUR is the top slot');
assert(peak.slots[0]?.weekday === 2, 'and on the weekday the peak actually happened');
assert(
  peak.slots.every((s) => isHourActive(s.hour, HOURS)),
  'no slot falls outside the active window',
);

// A peak the engine is asleep for is not a slot it may use.
const nightOwl = bestTimes(withPeak, {
  activeHours: { startHour: 6, endHour: 12 },
  count: 3,
});
assert(
  nightOwl.slots.every((s) => s.hour >= 6 && s.hour < 12),
  '3pm is not offered to someone whose engine sleeps at noon',
);

// --- sparse data falls back, and SAYS so -----------------------------------
const sparse = [post(900, 1, 11, 40), post(901, 3, 11, 30), post(902, 5, 11, 25)];
const fb = bestTimes(sparse, { activeHours: HOURS });
assert(!fb.personalised, 'three posts over five days is NOT personalised');
assert(fb.posts === 3 && fb.days <= MIN_DAYS, 'it reports how little it had');
assert(
  fb.slots.every((s) => s.weekday === null),
  'fallback slots are day-agnostic — they claim nothing about the week',
);
assert(
  fb.slots.map((s) => s.hour).join(',') === FALLBACK_HOURS.join(','),
  'the fallback is the documented pair of hours',
);

// Enough days but not enough posts — BOTH gates have to pass, or three posts
// spread across a month would be "personalised" from three data points.
const thin: PostOutcome[] = [];
for (let d = 1; d <= 30; d += 10) thin.push(post(910 + d, d, 11, 20));
assert(thin.length < MIN_POSTS, 'the thin set is under the post floor by construction');
assert(!bestTimes(thin, { activeHours: HOURS }).personalised, 'a month of silence is not history');

// Replies are excluded: they publish when the ENGINE runs, not when the
// audience is awake, so their timestamps say nothing about either.
const repliesOnly: PostOutcome[] = [];
for (let d = 1; d <= 30; d += 1) repliesOnly.push(post(1000 + d, d, 14, 50, true));
const fromReplies = bestTimes(repliesOnly, { activeHours: HOURS });
assert(!fromReplies.personalised, '30 days of replies is not 30 days of posts');
assert(fromReplies.posts === 0, 'replies are not counted as posts at all');

// An empty history is the fallback too, not a crash and not an empty list.
const empty = bestTimes([], { activeHours: HOURS });
assert(!empty.personalised && empty.slots.length > 0, 'no history still yields usable slots');

// A window that contains neither 9am nor 6pm still gets a usable fallback.
const odd = bestTimes([], { activeHours: { startHour: 0, endHour: 6 } });
assert(
  odd.slots.length > 0 && odd.slots.every((s) => isHourActive(s.hour, { startHour: 0, endHour: 6 })),
  'the fallback is clamped into an unusual active window',
);

// --- nextSlots: real timestamps, spaced, inside the window -----------------
const from = new Date();
from.setHours(8, 30, 0, 0);
const times = nextSlots(fb, {
  from: from.getTime(),
  count: 4,
  minGapMs: 6 * 60 * 60 * 1000,
  activeHours: HOURS,
});
assert(times.length === 4, 'four free slots are found within the horizon');
assert(
  times.every((t) => t > from.getTime()),
  'every slot is in the future',
);
assert(
  times.every((t, i) => i === 0 || t > (times[i - 1] as number)),
  'slots come back in order',
);
assert(
  times.every((t, i) => i === 0 || t - (times[i - 1] as number) >= 6 * 60 * 60 * 1000),
  'the minimum gap is respected between chosen slots',
);
assert(
  times.every((t) => isHourActive(new Date(t).getHours(), HOURS)),
  'nothing is scheduled while the engine is asleep',
);
assert(
  times.every((t) => FALLBACK_HOURS.includes(new Date(t).getHours() as 9 | 18)),
  'every slot lands on one of the model’s own hours',
);

// An hour already spoken for is skipped, not doubled up on.
const taken = [times[0] as number];
const avoided = nextSlots(fb, {
  from: from.getTime(),
  count: 1,
  taken,
  minGapMs: 6 * 60 * 60 * 1000,
  activeHours: HOURS,
});
assert(avoided[0] !== times[0], 'a slot within the gap of an existing post is not reused');

// Asking for nothing gets nothing; an impossible gap gets fewer, never a lie.
assert(
  nextSlots(fb, { from: Date.now(), count: 0, minGapMs: 0, activeHours: HOURS }).length === 0,
  'count 0 returns no slots',
);
const impossible = nextSlots(fb, {
  from: Date.now(),
  count: 5,
  minGapMs: 30 * DAY_MS,
  activeHours: HOURS,
});
assert(
  impossible.length <= 1,
  'an impossible gap yields fewer slots rather than breaking its own rule',
);

// --- how a slot reads ------------------------------------------------------
assert(describeSlot({ weekday: null, hour: 9 }) === '9am', 'a day-agnostic slot is just a time');
assert(describeSlot({ weekday: null, hour: 18 }) === '6pm', '18:00 reads as 6pm');
assert(describeSlot({ weekday: null, hour: 0 }) === '12am', 'midnight is 12am, not 0am');
assert(describeSlot({ weekday: null, hour: 12 }) === '12pm', 'noon is 12pm, not 0pm');
assert(
  describeSlot({ weekday: 2, hour: 15 }).endsWith('at 3pm'),
  'a weekday slot names the day and the time',
);

// --- the active-hours predicate matches the engine's ----------------------
assert(isHourActive(9, HOURS), 'active AT the start hour (half-open window)');
assert(!isHourActive(22, HOURS), 'asleep AT the end hour');
assert(isHourActive(23, { startHour: 22, endHour: 6 }), 'overnight window: 11pm is active');
assert(!isHourActive(12, { startHour: 22, endHour: 6 }), 'overnight window: noon is not');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 best-times-smoke OK');
