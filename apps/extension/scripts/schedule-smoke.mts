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

const { getScheduledPosts, setScheduledPosts, MAX_SCHEDULED_POSTS, isPendingPost } = await import(
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

/* -- auto-scheduled drafts (updateplan 3.2) --------------------------------
 * A draft is a post Ghostly wrote that nobody has said yes to. The whole
 * safety of auto-posting rests on it being a distinct STATUS rather than a
 * flag, because the publisher selects on `status === 'scheduled'` — so no
 * amount of confusion elsewhere can put an unapproved post on the timeline.
 * ---------------------------------------------------------------------- */

const draft = (i: number) => ({ ...post(i, 'draft' as const), origin: 'auto' as const, generated: `post ${i}` });

await setScheduledPosts([draft(1), post(2, 'scheduled'), post(3, 'posted')]);
const mixed = await getScheduledPosts();
assert(mixed.filter((p) => p.status === 'draft').length === 1, 'a draft round-trips as a draft');
assert(
  mixed.filter((p) => p.status === 'scheduled' && p.scheduledAt <= Date.now() + 10 * 60_000)
    .length <= 1,
  'the publisher’s own selector sees only the scheduled one',
);
assert(
  mixed.find((p) => p.status === 'draft')?.origin === 'auto',
  'a drafted post remembers that Ghostly wrote it',
);
assert(
  mixed.find((p) => p.status === 'draft')?.generated === 'post 1',
  'and what it originally wrote, so an edit can be detected on approval',
);

// A draft is PENDING. It holds a slot in the week and counts against the queue
// limit — the point being that we stop writing more until it has been read.
assert(isPendingPost(draft(9)), 'a draft counts as pending');
assert(isPendingPost(post(9, 'scheduled')), 'so does a scheduled post');
assert(isPendingPost(post(9, 'publishing')), 'and one mid-publish');
assert(!isPendingPost(post(9, 'posted')), 'a published post does not');
assert(!isPendingPost(post(9, 'failed')), 'nor a failed one');

// Trimming must never drop an unread draft to make room for old history.
const drafts = Array.from({ length: MAX_SCHEDULED_POSTS }, (_, i) => draft(200 + i));
const oldHistory = Array.from({ length: 80 }, (_, i) => post(300 + i, 'posted'));
await setScheduledPosts([...drafts, ...oldHistory]);
const afterTrim = await getScheduledPosts();
assert(
  afterTrim.filter((p) => p.status === 'draft').length === MAX_SCHEDULED_POSTS,
  'every unread draft survives trimming',
);
assert(afterTrim.length < drafts.length + oldHistory.length, 'old history is still trimmed');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 schedule-smoke OK');
