/* eslint-disable no-console */
/**
 * Block-reason smoke.
 *
 * The engine has always known why it wasn't acting; it wrote the answer to a
 * console.log in a service worker where nobody could read it. These assertions
 * pin down the resolver that replaced it — one fixture per condition, plus the
 * precedence rules for when several conditions hold at once.
 *
 * Run with: pnpm --filter @casper/extension block-reason-smoke
 */
import {
  resolveBlockReason,
  precedenceOf,
  BLOCK_REASON_PRECEDENCE,
  DEGRADED_STREAK_LIMIT,
  type BlockReasonInput,
} from '../src/scheduler/block-reason.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

/** A fully healthy, fully configured engine with work to do. */
const healthy: BlockReasonInput = {
  isPaused: false,
  signedInToX: true,
  subscriptionLapsed: false,
  freeCapHit: false,
  serverReachable: true,
  degradedStreak: 0,
  capsSpent: false,
  withinActiveHours: true,
  hasTargets: true,
  hasSearchQueries: true,
  homeFeedEnabled: true,
  anyActionEnabled: true,
  scannedButNoMatch: false,
};

const of = (patch: Partial<BlockReasonInput>) => resolveBlockReason({ ...healthy, ...patch });

// --- the healthy case reports nothing --------------------------------------
assert(of({}) === null, 'a working engine with work to do reports no reason');

// --- one fixture per condition ---------------------------------------------
assert(of({ isPaused: true }) === 'paused', 'paused');
assert(of({ signedInToX: false }) === 'signed-out', 'signed out of X');
assert(of({ subscriptionLapsed: true }) === 'sub-lapsed', 'subscription lapsed');
assert(of({ freeCapHit: true }) === 'free-cap', 'free monthly allowance spent');
assert(of({ serverReachable: false }) === 'server-unreachable', 'server unreachable');
assert(
  of({ degradedStreak: DEGRADED_STREAK_LIMIT }) === 'degraded',
  'degraded streak at the limit trips the breaker',
);
assert(of({ capsSpent: true }) === 'caps-spent', 'daily caps spent');
assert(of({ withinActiveHours: false }) === 'outside-hours', 'outside active hours');
assert(
  of({ hasTargets: false, hasSearchQueries: false, homeFeedEnabled: false }) === 'not-configured',
  'no targets, no topics, no home feed → not configured',
);
assert(of({ scannedButNoMatch: true }) === 'nothing-matched', 'scanned and matched nothing');

// --- the silent killer: topic feeds saved, home feed off --------------------
// executor.ts derives a search feed's actions from the home-feed toggles
// (doLike = hf.like), and scheduler.ts gates search on homeHasBudget — so this
// combination runs nothing and, before this module, reported nothing.
assert(
  of({ hasSearchQueries: true, hasTargets: false, homeFeedEnabled: false }) === 'feed-off',
  'topic feeds saved but home feed off → feed-off, not silence',
);
assert(
  of({ homeFeedEnabled: true, anyActionEnabled: false }) === 'feed-off',
  'home feed on but every action type off → feed-off',
);

// --- degraded is a streak, not a single bad run ----------------------------
assert(
  of({ degradedStreak: DEGRADED_STREAK_LIMIT - 1 }) !== 'degraded',
  'one run below the limit does NOT report degraded',
);

// --- precedence: the rules that decide which truth to tell ------------------
assert(
  of({ isPaused: true, signedInToX: false, capsSpent: true, freeCapHit: true }) === 'paused',
  'paused wins over everything — the user asked for it',
);
assert(
  of({ signedInToX: false, capsSpent: true }) === 'signed-out',
  'signed-out beats caps-spent',
);
assert(
  of({ capsSpent: true, withinActiveHours: false }) === 'caps-spent',
  'caps-spent beats outside-hours — it is the more complete truth',
);
assert(
  of({ freeCapHit: true, capsSpent: true }) === 'free-cap',
  'free-cap beats caps-spent — upgrading is the actionable fix',
);
assert(
  of({ subscriptionLapsed: true, degradedStreak: 99 }) === 'sub-lapsed',
  'sub-lapsed beats degraded',
);
assert(
  of({ hasTargets: false, hasSearchQueries: false, homeFeedEnabled: false, scannedButNoMatch: true }) ===
    'not-configured',
  'not-configured beats nothing-matched — setup first, quiet feed second',
);

// --- precedence table is internally consistent -----------------------------
assert(
  precedenceOf('paused') === 0,
  'paused sits at the top of the precedence table',
);
assert(
  precedenceOf('nothing-matched') === BLOCK_REASON_PRECEDENCE.length - 1,
  'nothing-matched sits at the bottom — it is not a fault',
);
assert(
  new Set(BLOCK_REASON_PRECEDENCE).size === BLOCK_REASON_PRECEDENCE.length,
  'no duplicate codes in the precedence table',
);
assert(
  precedenceOf('signed-out') < precedenceOf('caps-spent'),
  'precedence table agrees with the resolver on signed-out vs caps-spent',
);

// --- determinism: same input, same answer, every time ----------------------
const mixed: Partial<BlockReasonInput> = {
  capsSpent: true,
  withinActiveHours: false,
  scannedButNoMatch: true,
};
assert(
  of(mixed) === of(mixed) && of(mixed) === of(mixed),
  'resolution is deterministic for a given input',
);

if (fails.length > 0) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 block-reason-smoke OK');
