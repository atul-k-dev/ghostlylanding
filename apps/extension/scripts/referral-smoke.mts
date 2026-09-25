/* eslint-disable no-console */
/**
 * Referral credits smoke.
 *
 * A referral pays out in bonus actions, and bonus actions are spent by the same
 * free-tier gates every action passes. What this pins down:
 *
 *  - the bonus pool is untouched until the monthly allowance is gone, and then
 *    spent one action at a time — never counted twice against the cap;
 *  - "5 friends" really is 50 extra actions, not 50 minus something;
 *  - a new month refills the allowance but leaves the pool where it was;
 *  - only the website, sending a well-formed code, can hand one to the
 *    extension (the welcome-page handoff).
 *
 * Run with: pnpm --filter @casper/extension referral-smoke
 */
import {
  FREE_TIER,
  REFERRAL_DEFAULTS as REFERRAL,
  bumpMonthly,
  normalizeReferralCode,
  currentPeriodKey,
  freeActionsLeft,
  freeLimitReached,
  type User,
} from '@casper/shared';
import { allowedSiteOrigins, referralFromExternalMessage } from '../src/lib/referral.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

type Allowance = Pick<User, 'monthlyActionCount' | 'actionPeriodKey' | 'bonusCredits'>;
const key = currentPeriodKey();
const cap = FREE_TIER.monthlyActions;

/** Take `n` actions the way the extension does, one bump at a time. */
const spend = (u: Allowance, n: number): Allowance => {
  let cur = u;
  for (let i = 0; i < n; i++) cur = { ...cur, ...bumpMonthly(cur) };
  return cur;
};

// -- the numbers the feature was asked for -----------------------------------
assert(REFERRAL.creditsPerReferral === 10, 'one friend is worth 10 credits');
assert(REFERRAL.maxRewardedReferrals === 20, 'the referrer is paid for at most 20 friends');

const fiveFriends: Allowance = { monthlyActionCount: 0, actionPeriodKey: key, bonusCredits: 5 * REFERRAL.creditsPerReferral };
assert(freeActionsLeft(fiveFriends) === cap + 50, '5 friends = 50 extra actions on top of the monthly allowance');

// -- the pool is spent only after the allowance ------------------------------
const afterAllowance = spend(fiveFriends, cap);
assert(afterAllowance.bonusCredits === 50, 'the monthly allowance is used first — the pool is untouched');
assert(!freeLimitReached(afterAllowance), 'with the allowance gone, the pool keeps the engine going');
assert(freeActionsLeft(afterAllowance) === 50, 'exactly the pool is left once the allowance is spent');

const midPool = spend(afterAllowance, 20);
assert(midPool.bonusCredits === 30 && freeActionsLeft(midPool) === 30, 'each action past the allowance costs one credit — no double count');

const drained = spend(midPool, 30);
assert(drained.bonusCredits === 0, 'the pool drains to zero');
assert(freeLimitReached(drained), 'with the allowance and the pool gone, free actions stop');

const overdrawn = spend(drained, 3);
assert(overdrawn.bonusCredits === 0, 'the pool never goes negative');

// -- a new month -------------------------------------------------------------
const lastMonth: Allowance = { monthlyActionCount: cap + 7, actionPeriodKey: '1999-01', bonusCredits: 13 };
assert(freeActionsLeft(lastMonth) === cap + 13, 'a new month refills the allowance and keeps the leftover pool');
const firstOfMonth = spend(lastMonth, 1);
assert(firstOfMonth.monthlyActionCount === 1 && firstOfMonth.bonusCredits === 13, 'the first action of a new month comes from the allowance');

// -- users with no pool behave exactly as before -----------------------------
const legacy: Allowance = { monthlyActionCount: cap, actionPeriodKey: key };
assert(freeLimitReached(legacy), 'no bonus field: the cap is still the monthly allowance');
assert(freeActionsLeft(null) === cap, 'no user yet: the full allowance');

// -- invite codes --------------------------------------------------------------
assert(normalizeReferralCode(' abc-d234 ') === 'ABCD234', 'a pasted code with spaces and a dash still resolves');
assert(normalizeReferralCode('ABCD2345') === null, 'codes are exactly 7 characters');
assert(normalizeReferralCode('ABCD0O1') === null, 'codes never contain 0, O or 1');
assert(normalizeReferralCode('ABCDIL2') === null, 'codes never contain I or L');
assert(normalizeReferralCode('') === null, 'an empty code is no code');

// -- the website → extension handoff -------------------------------------------
const store = ['https://www.ghostly247.com', 'https://ghostly247.com'];
assert(allowedSiteOrigins().includes('https://www.ghostly247.com'), 'outside an extension, the configured (www) site is trusted');
const msg = { type: 'REFERRAL', code: 'abcd234' };
assert(referralFromExternalMessage(msg, 'https://www.ghostly247.com', store) === 'ABCD234', 'the site (www) can hand over a code');
assert(referralFromExternalMessage(msg, 'https://ghostly247.com', store) === 'ABCD234', 'the bare domain can too');
assert(referralFromExternalMessage(msg, 'https://evil.example', store) === null, 'any other origin is refused');
assert(referralFromExternalMessage(msg, 'http://localhost:3000', store) === null, 'an origin missing from the manifest (localhost, on a store build) is refused');
assert(referralFromExternalMessage(msg, undefined, store) === null, 'no origin, no code');
assert(referralFromExternalMessage({ type: 'REFERRAL', code: '<img>' }, 'https://ghostly247.com', store) === null, 'a malformed code is refused');
assert(referralFromExternalMessage({ type: 'OTHER', code: 'ABCD234' }, 'https://ghostly247.com', store) === null, 'only REFERRAL messages are accepted');
assert(referralFromExternalMessage('ABCD234', 'https://ghostly247.com', store) === null, 'a bare string is not a message');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 referral-smoke OK');
