/* eslint-disable no-console */
/**
 * Scheduling smoke: the time maths behind time-of-day posting, and the trimming
 * rule that must never drop a post the user is still waiting on.
 * Run with: pnpm --filter @casper/extension schedule-smoke
 */
import {
  toDateInputValue,
  toTimeInputValue,
  localDateTime,
  startOfLocalDay,
} from '../src/lib/schedule-time.js';

// --- chrome.storage.local stub (before importing storage.js) ----------------
const store: Record<string, unknown> = {};
(globalThis as unknown as { chrome: unknown }).chrome = {
  storage: {
    local: {
      get: async (key: string) => ({ [key]: store[key] }),
      set: async (obj: Record<string, unknown>) => {
        Object.assign(store, obj);
      },
      remove: async (key: string) => {
        delete store[key];
      },
    },
  },
};

const { getScheduledPosts, setScheduledPosts, MAX_SCHEDULED_POSTS } = await import(
  '../src/lib/storage.js'
);
type ScheduledPost = Awaited<ReturnType<typeof getScheduledPosts>>[number];

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

// --- time maths -------------------------------------------------------------
const at = localDateTime('2026-09-04', '14:30');
const back = new Date(at);
assert(back.getFullYear() === 2026 && back.getMonth() === 8 && back.getDate() === 4, 'date survives the round trip');
assert(back.getHours() === 14 && back.getMinutes() === 30, 'time is interpreted in LOCAL time, not UTC');

assert(
  localDateTime('2026-09-04', '09:00') > startOfLocalDay('2026-09-04'),
  '9am is later than the start of the same day',
);
assert(
  localDateTime('2026-09-04', '00:00') === startOfLocalDay('2026-09-04'),
  'midnight matches the old day-granular stamp',
);
assert(
  localDateTime('2026-09-05', '08:00') > localDateTime('2026-09-04', '23:00'),
  'the next morning is after the previous night',
);

// A blank or malformed time must not silently mean midnight — nobody schedules
// a post for 3am by leaving a box empty.
const nine = new Date(localDateTime('2026-09-04', ''));
assert(nine.getHours() === 9, 'a blank time falls back to 09:00, not midnight');
assert(new Date(localDateTime('2026-09-04', 'garbage')).getHours() === 9, 'a malformed time also falls back to 09:00');
assert(Number.isNaN(localDateTime('not-a-date', '09:00')), 'an invalid date yields NaN (rejected upstream)');

// Round-tripping through the input helpers must be stable.
const sample = new Date(2026, 8, 4, 7, 5);
assert(toDateInputValue(sample) === '2026-09-04', 'toDateInputValue pads month and day');
assert(toTimeInputValue(sample) === '07:05', 'toTimeInputValue pads hour and minute');
assert(
  localDateTime(toDateInputValue(sample), toTimeInputValue(sample)) === sample.getTime(),
  'date + time round-trips back to the same instant',
);

// --- trimming must never drop a pending post --------------------------------
const post = (i: number, status: ScheduledPost['status']): ScheduledPost => ({
  id: `p${i}`,
  text: `post ${i}`,
  link: '',
  imageDataUrl: null,
  scheduledAt: Date.now() + i * 60_000,
  status,
  createdAt: Date.now() - i * 1_000,
  ...(status === 'posted' ? { postedAt: Date.now() - i * 1_000 } : {}),
});

// A full queue plus a long history: history gets trimmed, pending never does.
const pending = Array.from({ length: MAX_SCHEDULED_POSTS }, (_, i) => post(i, 'scheduled'));
const history = Array.from({ length: 80 }, (_, i) => post(100 + i, 'posted'));
await setScheduledPosts([...pending, ...history]);

const saved = await getScheduledPosts();
const savedPending = saved.filter((p) => p.status === 'scheduled' || p.status === 'publishing');
assert(
  savedPending.length === MAX_SCHEDULED_POSTS,
  `all ${MAX_SCHEDULED_POSTS} pending posts survive trimming`,
);
assert(saved.length < pending.length + history.length, 'history is trimmed');
assert(
  pending.every((p) => saved.some((x) => x.id === p.id)),
  'every scheduled post is still present by id',
);

// A thread round-trips intact.
await setScheduledPosts([{ ...post(1, 'scheduled'), thread: ['second', 'third'] }]);
const [threaded] = await getScheduledPosts();
assert(threaded?.thread?.length === 2, 'thread parts persist');
assert(threaded?.thread?.[1] === 'third', 'thread order is preserved');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 schedule-smoke OK');
