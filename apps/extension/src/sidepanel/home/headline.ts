import type { EngineState } from '../../ui/index.js';

/**
 * The blue card's headline: 5–6 words that read the moment — the engine's
 * state, the time of day and how today is going — rather than one fixed line.
 * Each entry is [light lead, bold rest], like the reference card.
 *
 * Picked with a per-day seed so it stays put while you look at it, and the
 * card lets you tap for another.
 */
export type Headline = readonly [string, string];

type Bucket =
  | 'paused-morning'
  | 'paused-afternoon'
  | 'paused-evening'
  | 'paused-night'
  | 'warming'
  | 'working'
  | 'gaining'
  | 'near-limit'
  | 'waiting'
  | 'attention';

const LINES: Record<Bucket, Headline[]> = {
  'paused-morning': [
    ['Rise And', 'Grow Your Audience Today'],
    ['Fresh Morning,', 'Fresh New Followers'],
    ["Let's Make", 'Today Count Big'],
  ],
  'paused-afternoon': [
    ['Perfect Time To', 'Start Growing'],
    ['Your Audience Is', 'Online Right Now'],
    ['Turn This Afternoon', 'Into Reach'],
  ],
  'paused-evening': [
    ['The Evening Crowd', 'Is Waiting'],
    ['Catch The', 'Evening Scroll Rush'],
    ['Wind Down,', 'Let Growth Run'],
  ],
  'paused-night': [
    ['Night Owls Are', 'Scrolling Right Now'],
    ['Grow While', 'The World Sleeps'],
  ],
  warming: [
    ['Warming Up', 'Your Growth Engine'],
    ['First Moves Of', 'The Day'],
  ],
  working: [
    ['Quietly Growing', 'While You Relax'],
    ['Every Reply', 'Builds Your Reach'],
    ['Your Voice Is', 'Out There Working'],
  ],
  gaining: [
    ['New Faces Are', 'Finding You Today'],
    ['Momentum Is', 'On Your Side'],
    ['People Are Noticing', 'You Today'],
  ],
  'near-limit': [
    ['Strong Day,', 'Winding Down Safely'],
    ['Great Work,', 'Almost At Limit'],
  ],
  waiting: [
    ['Taking A Breather,', 'Back Soon'],
    ['Resting Now,', 'Keeping You Safe'],
  ],
  attention: [
    ['One Quick Fix', 'Needs You'],
    ["Let's Get", 'Back On Track'],
  ],
};

const bucketFor = (
  state: EngineState,
  { hour, spent, pace, gained }: { hour: number; spent: number; pace: number; gained: number },
): Bucket => {
  if (state === 'paused') {
    if (hour >= 5 && hour < 12) return 'paused-morning';
    if (hour >= 12 && hour < 17) return 'paused-afternoon';
    if (hour >= 17 && hour < 22) return 'paused-evening';
    return 'paused-night';
  }
  if (state === 'attention') return 'attention';
  if (state === 'waiting') return 'waiting';
  if (pace >= 0.8) return 'near-limit';
  if (gained > 0) return 'gaining';
  if (spent === 0) return 'warming';
  return 'working';
};

const dayOfYear = (d: Date) => Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86_400_000);

export const pickHeadline = (
  state: EngineState,
  ctx: { spent: number; pace: number; gained: number },
  /** Taps on the card — each one moves to the next line in the pool. */
  shuffle = 0,
  now = new Date(),
): Headline => {
  const pool = LINES[bucketFor(state, { hour: now.getHours(), ...ctx })];
  return pool[(dayOfYear(now) + shuffle) % pool.length]!;
};
