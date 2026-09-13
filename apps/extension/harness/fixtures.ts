/**
 * The account the screenshots show.
 *
 * Invented, on purpose. These shots go on a public marketing page, so nothing
 * here is a real handle, a real post or a real person's numbers — and the
 * figures are deliberately modest (a few weeks of a small account) rather than
 * the kind that would misrepresent what the product does.
 *
 * Every shape is the product's own type. If one drifts, `pnpm typecheck` fails
 * here first.
 */
import type {
  ActionLog,
  ActionType,
  ActionTypeCounts,
  CountersState,
  ExtensionSettings,
  GrowthSummary,
  PendingReply,
  PlatformCaps,
  User,
} from '@casper/shared';
import type { PostOutcome } from '@casper/shared';
import type { ScheduledPost } from '../src/lib/storage.js';
import { STORAGE_KEYS } from '../src/lib/storage.js';
import { INITIAL_TRUST } from '../src/lib/trust.js';

const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London';
const DAY = 86_400_000;
const HOUR = 3_600_000;
const MIN = 60_000;
const now = Date.now();

/** The same YYYY-MM-DD the scheduler computes, so the counter reads as today. */
export const today = new Intl.DateTimeFormat('en-CA', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
}).format(new Date());

const iso = (msAgo: number) => new Date(now - msAgo).toISOString();
const dateOnly = (daysAgo: number) => new Date(now - daysAgo * DAY).toISOString().slice(0, 10);

/* -- the user ---------------------------------------------------------------- */

export const user: User = {
  id: 'demo-user',
  name: 'Maya Okonjo',
  email: 'maya@example.com',
  hasGoogleLink: true,
  hasPassword: false,
  createdAt: iso(41 * DAY),
  subscriptionStatus: 'active',
  subscriptionPlan: 'monthly',
  currentPeriodEnd: new Date(now + 18 * DAY).toISOString(),
  monthlyActionCount: 412,
  actionPeriodKey: today.slice(0, 7),
  voiceProfile: {
    summary:
      'Writes in lowercase most of the time, and opens with the point rather than a wind-up. Sentences are short, usually one or two. Favours concrete nouns over adjectives, uses em dashes instead of semicolons, and almost never uses an exclamation mark. Ends a reply with a question, but not a post. No hashtags at all, and at most one emoji, never as punctuation.',
    sampleCount: 50,
    trainedAt: iso(6 * DAY),
  },
  preferences: {} as User['preferences'],
};

/* -- settings ---------------------------------------------------------------- */

const caps: PlatformCaps = {
  likesPerDay: 100,
  commentsPerDay: 30,
  followsPerDay: 50,
  bookmarksPerDay: 60,
  repostsPerDay: 30,
  quotesPerDay: 15,
};

export const settings: ExtensionSettings = {
  isPaused: false,
  timezone: TZ,
  tone: 'friendly',
  commentLength: 1,
  sessionMinutes: 45,
  autoResume: true,
  breakMinutes: 20,
  spotlight: true,
  interactiveMode: true,
  activeHours: { startHour: 8, endHour: 23 },
  accountAgeMonths: { twitter: 14, linkedin: null },
  targetCreators: [
    { platform: 'twitter', handle: 'indiehackers', addedAt: iso(20 * DAY) },
    { platform: 'twitter', handle: 'swyx', addedAt: iso(17 * DAY) },
    { platform: 'twitter', handle: 'levelsio', addedAt: iso(11 * DAY) },
    { platform: 'twitter', handle: 'shl', addedAt: iso(5 * DAY) },
  ],
  searchQueries: [
    { platform: 'twitter', query: 'design systems -is:retweet', addedAt: iso(19 * DAY) },
    { platform: 'twitter', query: 'shipping solo lang:en', addedAt: iso(12 * DAY) },
    { platform: 'twitter', query: '"first paying customer"', addedAt: iso(4 * DAY) },
  ],
  searchFeed: { like: true, comment: true, follow: false, bookmark: false, repost: false, quote: false },
  contentTopics: ['design systems', 'shipping solo', 'developer tools'],
  earlyReply: true,
  skipReplies: true,
  whitelist: [],
  followFilter: { keywords: [], excludeKeywords: [] },
  caps: {
    twitter: caps,
    linkedin: {
      likesPerDay: 60,
      commentsPerDay: 20,
      followsPerDay: 30,
      bookmarksPerDay: 30,
      repostsPerDay: 15,
      quotesPerDay: 10,
    },
  },
  homeFeed: {
    enabled: true,
    platforms: ['twitter'],
    like: true,
    comment: true,
    follow: true,
    bookmark: false,
    repost: false,
    quote: false,
    keywords: ['design systems', 'shipping solo', 'developer tools'],
    excludeKeywords: ['crypto', 'giveaway'],
  },
  followBack: true,
  replyApproval: true,
  xAccountPlan: 'pro',
  postLength: 'short',
  safetyPreset: 'balanced',
  warmupStartedAt: null,
  setupCompletedAt: iso(38 * DAY),
  autoPost: { enabled: false, quietHours: 20, maxQueued: 3, lastRunAt: null },
  trust: INITIAL_TRUST,
  mentions: { enabled: true },
  notifications: { problems: true, bigReplies: true },
  autoTune: { enabled: false, lastRunAt: null },
};

/* -- today's counters -------------------------------------------------------- */

const homeCounts: ActionTypeCounts = { like: 34, comment: 9, follow: 6, bookmark: 0, repost: 0, quote: 0 };
const searchCounts: ActionTypeCounts = { like: 12, comment: 4, follow: 0, bookmark: 0, repost: 0, quote: 0 };
const searchCap: PlatformCaps = {
  likesPerDay: 30,
  commentsPerDay: 9,
  followsPerDay: 15,
  bookmarksPerDay: 18,
  repostsPerDay: 9,
  quotesPerDay: 4,
};

export const counters: CountersState = {
  twitter: {
    date: today,
    byActionType: homeCounts,
    effectiveCap: caps,
    searchByActionType: searchCounts,
    searchCap,
  },
  linkedin: null,
};

/* -- what it did ------------------------------------------------------------- */

type LogSeed = [minutesAgo: number, kind: ActionType, handle: string, failed?: true];

const LOG: LogSeed[] = [
  [4, 'like', 'ashleymayer'],
  [9, 'comment', 'indiehackers'],
  // A failure near the top on purpose: "every action is logged" has to mean
  // the ones that did not work too, and the shot should show one.
  [13, 'comment', 'patio11', true],
  [18, 'follow', 'rauchg'],
  [24, 'like', 'swyx'],
  [31, 'comment', 'levelsio'],
  [37, 'like', 'dhh'],
  [44, 'follow', 'sarahdrasner'],
  [52, 'like', 'shl'],
  [58, 'like', 'jasonfried'],
  [66, 'like', 'mijustin'],
  [74, 'like', 'csallen'],
  [81, 'follow', 'natfriedman'],
  [95, 'comment', 'tdinh_me'],
  [108, 'like', 'steipete'],
  [121, 'like', 'kentcdodds'],
  [140, 'repost', 'swyx'],
  [156, 'like', 'rrhoover'],
  [173, 'comment', 'arvidkahl'],
  [190, 'like', 'yongfook'],
];

export const actionLog: ActionLog[] = LOG.map(([mins, actionType, handle, failed], i) => ({
  id: `log-${i}`,
  userId: user.id,
  clientId: `c-${i}`,
  platform: 'twitter' as const,
  actionType,
  targetUrl: `https://x.com/${handle}/status/${1700000000000000 + i}`,
  targetHandle: handle,
  success: failed !== true,
  ...(failed === true ? { errorMessage: 'The post was deleted before the reply landed' } : {}),
  timestamp: iso(mins * MIN),
}));

/* -- what it got ------------------------------------------------------------- */

/**
 * The outcome history the Growth tab and the best-times model are computed
 * FROM, rather than a set of numbers typed to look plausible.
 *
 * A seeded generator, so every run produces the same shots: 46 posts over 35
 * days, replies attributed to the target creators they answered, published in
 * the evening/lunchtime clusters a real account tends to have. Everything the
 * panel then shows — totals, averages, per-target engagement, the heatmap and
 * the "best time to post" picks — is derived by the product's own code from
 * exactly this, so no two numbers in a screenshot can contradict each other.
 */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

/**
 * When this account's posts land well: a weekday pattern, not a flat list, so
 * the best-times model has a real weekly shape to find rather than the same
 * hour on every day of the week.
 */
const GOOD_HOURS: Record<number, number[]> = {
  0: [11],
  1: [9, 18],
  2: [9, 13, 19],
  3: [13, 19],
  4: [9, 18],
  5: [13],
  6: [11],
};
const REPLY_TARGETS = ['indiehackers', 'levelsio', 'swyx', 'indiehackers', 'levelsio', 'shl'];

const HEADLINES = [
  'the fix was never a bigger design system — it was deleting the four components nobody used',
  'shipping solo means your roadmap is whatever broke this morning',
  'first paying customer changes the questions you ask, not the code you write',
  'every tool i kept was one i used on day one. everything else was a bet on a future me',
  'the best onboarding i ever shipped was three screens shorter than the one before it',
  'you do not need a design system. you need four people to agree on spacing.',
];

const FILLER = [
  'read the error message. the whole error message.',
  'a feature nobody asked for is a bug with a roadmap',
  'renamed it twice, shipped it once',
  'the demo is the spec',
  'deleted 300 lines today. net positive.',
  'support emails are the only user research that shows up on its own',
  'i keep a file of things i decided not to build',
  'good docs are a retention feature',
];

const outcomeAt = (i: number): PostOutcome => {
  const r = rng(i * 977);
  const daysAgo = Math.floor((i / 46) * 34) + 1;
  const when = new Date(now - daysAgo * DAY);
  const slots = GOOD_HOURS[when.getDay()] ?? [9];
  const good = r() < 0.72;
  when.setHours(good ? slots[i % slots.length]! : 2 + Math.floor(r() * 5), Math.floor(r() * 60), 0, 0);

  // The best-times model scores standalone POSTS only (a reply's timing is the
  // other person's, not yours), so the history needs enough of them to find a
  // pattern in — MIN_POSTS is 8 and this account is past that.
  const isReply = i % 2 !== 0;
  // Good hours earn roughly three times what the dead hours do — the signal the
  // best-times model is supposed to find.
  const base = good ? 22 + r() * 34 : 4 + r() * 9;
  const lift = i < HEADLINES.length ? 4.4 - i * 0.55 : 1;
  const likes = Math.round(base * lift);

  return {
    tweetId: `18${String(100 + i)}`,
    url: `https://x.com/mayabuilds/status/18${String(100 + i)}`,
    text: i < HEADLINES.length ? HEADLINES[i]! : FILLER[i % FILLER.length]!,
    isReply,
    likes,
    replies: Math.max(0, Math.round(likes * (0.1 + r() * 0.08))),
    reposts: Math.max(0, Math.round(likes * (0.05 + r() * 0.05))),
    views: Math.round(likes * (150 + r() * 90)),
    publishedAt: when.toISOString(),
    repliedToHandle: isReply ? REPLY_TARGETS[i % REPLY_TARGETS.length]! : null,
  };
};

export const outcomes: PostOutcome[] = Array.from({ length: 46 }, (_, i) => outcomeAt(i));

const sum = (ns: number[]) => ns.reduce((a, b) => a + b, 0);
const round1 = (n: number) => Math.round(n * 10) / 10;
const byLikes = [...outcomes].sort((a, b) => b.likes - a.likes);

/** Real aggregates of `outcomes`, the same way the server computes them. */
const engagementFor = (handle: string) => {
  const mine = outcomes.filter((o) => o.repliedToHandle === handle);
  return {
    likes: sum(mine.map((o) => o.likes)),
    replies: sum(mine.map((o) => o.replies)),
    reposts: sum(mine.map((o) => o.reposts)),
    views: sum(mine.map((o) => o.views ?? 0)),
  };
};

const lastActionFor = (handle: string) =>
  outcomes.filter((o) => o.repliedToHandle === handle).map((o) => o.publishedAt).sort().at(-1) ?? null;

const FOLLOWERS = [
  1184, 1189, 1193, 1191, 1198, 1204, 1211, 1209, 1217, 1226, 1231, 1238, 1244, 1249, 1247,
  1255, 1263, 1271, 1278, 1284, 1291, 1299, 1304, 1312, 1319, 1327, 1334, 1340, 1349, 1358,
];

export const growth: GrowthSummary = {
  latest: {
    date: today,
    followers: FOLLOWERS.at(-1)!,
    following: 604,
    posts: 1142,
    followedBack: 27,
    followedBackSample: 100,
  },
  series: FOLLOWERS.map((followers, i) => ({ date: dateOnly(FOLLOWERS.length - 1 - i), followers })),
  deltas: {
    day: { change: FOLLOWERS.at(-1)! - FOLLOWERS.at(-2)!, days: 1 },
    week: { change: FOLLOWERS.at(-1)! - FOLLOWERS.at(-8)!, days: 7 },
    month: { change: FOLLOWERS.at(-1)! - FOLLOWERS[0]!, days: 30 },
  },
  replies: {
    tracked: outcomes.length,
    totalLikes: sum(outcomes.map((o) => o.likes)),
    totalReplies: sum(outcomes.map((o) => o.replies)),
    avgLikes: round1(sum(outcomes.map((o) => o.likes)) / outcomes.length),
    top: byLikes.slice(0, 5),
  },
  sources: {
    postsLikes: sum(outcomes.filter((o) => !o.isReply).map((o) => o.likes)),
    repliesLikes: sum(outcomes.filter((o) => o.isReply).map((o) => o.likes)),
  },
  targets: settings.targetCreators.map(({ handle }) => {
    const last = lastActionFor(handle);
    return {
      handle,
      repliesSent: outcomes.filter((o) => o.repliedToHandle === handle).length,
      engagement: engagementFor(handle),
      lastActionAt: last,
      stale: last !== null && Date.now() - Date.parse(last) > 21 * DAY,
    };
  }),
  topics: [
    { keyword: 'design systems', repliesSent: 21, lastActionAt: iso(2 * HOUR), stale: false },
    { keyword: 'shipping solo', repliesSent: 14, lastActionAt: iso(9 * HOUR), stale: false },
    { keyword: 'developer tools', repliesSent: 6, lastActionAt: iso(3 * DAY), stale: false },
  ],
};

/* -- replies waiting on a human ---------------------------------------------- */

export const pendingReplies: PendingReply[] = [
  {
    id: 'draft-1',
    platform: 'twitter',
    postId: '1901',
    postUrl: 'https://x.com/indiehackers/status/1901',
    postText:
      'Solo founders: what is the one thing you stopped doing this year that gave you the most time back?',
    authorHandle: 'indiehackers',
    draftText:
      'stopped rewriting the landing page every sunday. picked one message, left it alone for a quarter, and spent the hours on support emails instead — those turned into the only two features anyone asked for twice.',
    createdAt: now - 11 * MIN,
    matchedKeyword: 'shipping solo',
  },
  {
    id: 'draft-2',
    platform: 'twitter',
    postId: '1902',
    postUrl: 'https://x.com/swyx/status/1902',
    postText: 'Design systems are a tax you pay upfront for consistency you might never need.',
    authorHandle: 'swyx',
    draftText:
      'the tax is real but it is charged per component, not per system. ours got cheap the week we deleted everything with one usage — what did you keep?',
    createdAt: now - 26 * MIN,
    matchedKeyword: 'design systems',
  },
  {
    id: 'draft-3',
    platform: 'twitter',
    postId: '1903',
    postUrl: 'https://x.com/levelsio/status/1903',
    postText: 'Just shipped a thing in 4 hours that I had been putting off for 4 months.',
    authorHandle: 'levelsio',
    draftText: 'the four months were the estimate, the four hours were the work. what made today the day?',
    createdAt: now - 48 * MIN,
  },
];

/* -- the composer ------------------------------------------------------------ */

export const scheduledPosts: ScheduledPost[] = [
  {
    id: 'post-1',
    text: 'a design system is not a component library. it is an agreement about what you will not build.',
    link: '',
    imageDataUrl: null,
    thread: [
      'the library is the artifact. the agreement is the thing that saves you time, and it is the part nobody writes down.',
      'we wrote ours on one page. four rules. every component that broke a rule got deleted, or got an exception with a name on it.',
      'six months later the library is 40% smaller and nobody argues about spacing any more.',
    ],
    scheduledAt: now + 5 * HOUR,
    status: 'scheduled',
    createdAt: now - 40 * MIN,
    origin: 'user',
  },
  {
    id: 'post-2',
    text: 'the fastest code review is the pull request you did not open',
    link: '',
    imageDataUrl: null,
    scheduledAt: now + 29 * HOUR,
    status: 'scheduled',
    createdAt: now - 3 * HOUR,
    origin: 'auto',
  },
  {
    id: 'post-3',
    text: 'shipped the new onboarding today. three steps instead of seven, and the drop-off moved to the step that actually matters.',
    link: '',
    imageDataUrl: null,
    scheduledAt: now - 20 * HOUR,
    status: 'posted',
    createdAt: now - DAY,
    postedAt: now - 20 * HOUR,
    origin: 'user',
  },
];

export const standingInstructions = [
  'Never reply to threads about politics.',
  'Keep replies to one sentence unless I ask for more.',
  'Always write in lowercase.',
];

/** The state every scene starts from; a scene may override any key. */
export const baseStorage: Record<string, unknown> = {
  [STORAGE_KEYS.auth]: { token: 'harness-token', user, savedAt: iso(DAY) },
  [STORAGE_KEYS.settings]: settings,
  [STORAGE_KEYS.counters]: counters,
  [STORAGE_KEYS.schedulerState]: {
    nextEligibleAt: now + 41_000,
    lastFlushAt: now - 2 * MIN,
    activeSince: now - 22 * MIN,
  },
  [STORAGE_KEYS.blockReason]: null,
  [STORAGE_KEYS.actionLogBuffer]: [],
  [STORAGE_KEYS.pendingReplies]: [],
  [STORAGE_KEYS.scheduledPosts]: scheduledPosts,
  [STORAGE_KEYS.ownHandle]: 'mayabuilds',
  [STORAGE_KEYS.growthMilestones]: [
    { at: iso(20 * DAY), kind: 'target-added', detail: '@indiehackers' },
    { at: iso(9 * DAY), kind: 'preset-changed', detail: 'Balanced' },
  ],
  [STORAGE_KEYS.autoTuneDropped]: [],
  [STORAGE_KEYS.standingInstructions]: standingInstructions,
  [STORAGE_KEYS.postOutcomes]: outcomes,
  [STORAGE_KEYS.correctedDrafts]: [],
  // Setup is finished, so Home never shows the "finish setting up" card. The
  // onboarding scene overrides this.
  [STORAGE_KEYS.onboarding]: { step: 'ready', goals: ['followers'], skippedAt: null },
  [STORAGE_KEYS.notificationsSeen]: { at: now - 3 * HOUR, cleared: [] },
  [STORAGE_KEYS.diagnostics]: [],
};
