/* eslint-disable no-console */
/**
 * Referral reward smoke — against a THROWAWAY in-memory MongoDB.
 *
 * Boots mongodb-memory-server, points the real Express app at it and drives the
 * real HTTP routes. It never reads MONGODB_URI from .env: the in-memory URI is
 * set before anything imports config, and the connection is refused unless it
 * is on 127.0.0.1. The database vanishes when the script exits.
 *
 * Covers: both rewards; lookup; the cap under concurrent sign-ups; invalid,
 * malformed and banned-inviter codes (ignored, never blocking); duplicate email
 * (409, no reward — including a concurrent race); login never applying a code;
 * admin-configurable settings; and bonus credits being spent past the monthly
 * allowance.
 *
 * Run with: pnpm --filter @casper/server referral-smoke
 * (The first run downloads a MongoDB binary, ~100MB, into the local cache.)
 */
import type { AddressInfo } from 'node:net';
import { MongoMemoryServer } from 'mongodb-memory-server';

const mongo = await MongoMemoryServer.create();
const MEMORY_URI = mongo.getUri('ghostly_referral_smoke');
if (!/^mongodb:\/\/127\.0\.0\.1[:/]/.test(MEMORY_URI)) {
  throw new Error(`refusing to run against a non-local database: ${MEMORY_URI}`);
}
// Set BEFORE config loads — dotenv never overrides a variable that's already set.
process.env.MONGODB_URI = MEMORY_URI;
process.env.JWT_SECRET = 'referral-smoke-secret';
process.env.SITE_URL = 'https://site.test';
process.env.LOG_LEVEL = 'silent';
process.env.NODE_ENV = 'test';

const mongoose = (await import('mongoose')).default;
const { createApp } = await import('../src/app.js');
const { config } = await import('../src/config.js');
const { UserModel } = await import('../src/models/user.model.js');
const { resetReferralSettingsCache } = await import('../src/referrals/settings.js');
const { REFERRAL_CODE_PATTERN, FREE_TIER } = await import('@casper/shared');

if (config.mongoUri !== MEMORY_URI) throw new Error('config did not pick up the in-memory database');
await mongoose.connect(MEMORY_URI);
// Build the unique indexes (email, referralCode) before the concurrency tests.
await Promise.all(mongoose.modelNames().map((n) => mongoose.model(n).init()));

const app = createApp();
const server = app.listen(0);
const API = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

// ---------------------------------------------------------------------------
const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  console.log(cond ? '✓' : '✗', label);
  if (!cond) fails.push(label);
};

// Each request gets its own forwarded IP so the per-IP rate limits (5 sign-ups
// a minute) don't turn the concurrency tests into a test of the limiter.
let ipSeq = 0;
const nextIp = () => `10.0.${Math.floor(++ipSeq / 250)}.${ipSeq % 250}`;

type Api<T> = { status: number; body: { ok: true; data: T } | { ok: false; error: { code: string } } };
const call = async <T,>(method: string, path: string, body?: unknown, token?: string): Promise<Api<T>> => {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-forwarded-for': nextIp(),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: (await res.json()) as Api<T>['body'] };
};
const data = <T,>(r: Api<T>): T => {
  if (!r.body.ok) throw new Error(`expected ok, got ${r.status} ${JSON.stringify(r.body)}`);
  return r.body.data;
};

interface AuthData {
  token: string;
  user: { id: string; bonusCredits?: number };
  referralApplied?: boolean;
}
interface Summary {
  code: string;
  link: string;
  creditsPerReferral: number;
  count: number;
  creditsEarned: number;
  cap: number;
  remaining: number;
}

let emailSeq = 0;
const signup = (referralCode?: unknown, email = `user${++emailSeq}@smoke.test`, name = 'Test User') =>
  call<AuthData>('POST', '/api/auth/signup', {
    name,
    email,
    password: 'correct-horse-battery',
    ...(referralCode !== undefined ? { referralCode } : {}),
  });
const summary = async (token: string) => data(await call<Summary>('GET', '/api/referral', undefined, token));
const bonusOf = async (userId: string) => (await UserModel.findById(userId).lean())?.bonusCredits ?? 0;

try {
  // -- the inviter and their code --------------------------------------------
  const inviter = data(await signup(undefined, 'saroj@smoke.test', 'Saroj Kumar'));
  assert(inviter.referralApplied === false, 'a sign-up without a code reports referralApplied: false');
  assert((await UserModel.findById(inviter.user.id).lean())?.referralCode == null, 'no code is created until one is needed');

  const [s1, s2] = await Promise.all([summary(inviter.token), summary(inviter.token)]);
  assert(s1.code === s2.code, 'concurrent first requests agree on one code');
  assert(REFERRAL_CODE_PATTERN.test(s1.code) && s1.code.length === 7, `code is 7 chars from the safe alphabet (${s1.code})`);
  assert(!/[0O1IL]/.test(s1.code), 'code has no 0/O/1/I/L');
  assert(s1.link === `https://site.test/invite/${s1.code}`, 'link is <SITE_URL>/invite/<code>');
  assert(s1.creditsPerReferral === 10 && s1.cap === 20 && s1.remaining === 20 && s1.count === 0, 'defaults: 10 credits, cap 20, 20 remaining');

  // -- public lookup ---------------------------------------------------------
  const look = data(await call<{ valid: boolean; inviterName: string | null; bonusCredits: number }>('GET', `/api/referral/lookup/${s1.code}`));
  assert(look.valid && look.inviterName === 'Saroj' && look.bonusCredits === 10, 'lookup: valid, first name only, +10');
  const lookBad = data(await call<{ valid: boolean }>('GET', '/api/referral/lookup/ZZZZZZZ'));
  assert(!lookBad.valid, 'lookup: unknown code is invalid');
  const lookMalformed = data(await call<{ valid: boolean }>('GET', '/api/referral/lookup/<script>'));
  assert(!lookMalformed.valid, 'lookup: malformed code is invalid, not an error');

  // -- both rewards ----------------------------------------------------------
  const friend = data(await signup(`  ${s1.code.toLowerCase().slice(0, 3)}-${s1.code.toLowerCase().slice(3)} `));
  assert(friend.referralApplied === true, 'friend sign-up (code pasted in lower case with a dash) → referralApplied');
  assert(friend.user.bonusCredits === 10, 'the friend gets +10 in the sign-up response');
  const afterOne = await summary(inviter.token);
  assert(afterOne.count === 1 && afterOne.creditsEarned === 10 && afterOne.remaining === 19, 'the inviter: 1 friend, 10 earned, 19 left');
  assert((await bonusOf(inviter.user.id)) === 10, 'the inviter gets +10 immediately');

  // -- invalid codes never block --------------------------------------------
  for (const [label, code] of [
    ['unknown', 'ZZZZZZZ'],
    ['malformed', 'not a code!'],
    ['too long', 'X'.repeat(500)],
    ['wrong type', 12345],
    ['null', null],
  ] as const) {
    const r = await signup(code);
    assert(r.status === 200 && r.body.ok && r.body.data.referralApplied === false && (r.body.data.user.bonusCredits ?? 0) === 0,
      `${label} code: sign-up succeeds, no bonus, referralApplied false`);
  }
  assert((await summary(inviter.token)).count === 1, 'invalid-code sign-ups paid the inviter nothing');

  // -- duplicate email -------------------------------------------------------
  const dup = await signup(s1.code, 'saroj@smoke.test');
  assert(dup.status === 409, 'duplicate email → 409 even with a valid code');
  const racer = 'race@smoke.test';
  const race = await Promise.all(Array.from({ length: 6 }, () => signup(s1.code, racer)));
  assert(race.filter((r) => r.status === 200).length === 1 && race.filter((r) => r.status === 409).length === 5,
    'six concurrent sign-ups for one email: exactly one succeeds, five get 409');
  const afterRace = await summary(inviter.token);
  assert(afterRace.count === 2 && (await bonusOf(inviter.user.id)) === 20, 'the email race paid the inviter once, not six times');

  // -- login never applies a code -------------------------------------------
  const login = await call<AuthData>('POST', '/api/auth/login', { email: 'saroj@smoke.test', password: 'correct-horse-battery', referralCode: s1.code });
  assert(login.status === 200 && (await summary(inviter.token)).count === 2, 'logging in with a code field changes nothing');

  // -- banned inviters -------------------------------------------------------
  const banned = data(await signup());
  const bannedCode = (await summary(banned.token)).code;
  await UserModel.updateOne({ _id: banned.user.id }, { $set: { isBanned: true } });
  const viaBanned = data(await signup(bannedCode));
  assert(viaBanned.referralApplied === false && (viaBanned.user.bonusCredits ?? 0) === 0, 'a banned inviter\'s code is ignored');
  assert((await UserModel.findById(banned.user.id).lean())?.referralCount === 0, 'the banned inviter is not paid');
  assert(!data(await call<{ valid: boolean }>('GET', `/api/referral/lookup/${bannedCode}`)).valid, 'lookup: a banned inviter\'s code is invalid');

  // -- admin settings --------------------------------------------------------
  const admin = data(await signup());
  const forbidden = await call('PUT', '/api/admin/settings/referral', { creditsPerReferral: 5, maxRewardedReferrals: 3 }, friend.token);
  assert(forbidden.status === 403, 'a non-admin cannot change referral settings');
  await UserModel.updateOne({ _id: admin.user.id }, { $set: { isAdmin: true } });
  const badPut = await call('PUT', '/api/admin/settings/referral', { creditsPerReferral: -1, maxRewardedReferrals: 3 }, admin.token);
  assert(badPut.status === 400, 'negative credits are rejected');
  const put = await call<{ creditsPerReferral: number; maxRewardedReferrals: number }>('PUT', '/api/admin/settings/referral', { creditsPerReferral: 5, maxRewardedReferrals: 3 }, admin.token);
  assert(put.status === 200 && data(put).creditsPerReferral === 5 && data(put).maxRewardedReferrals === 3, 'an admin sets 5 credits, cap 3');
  const earnedBefore = (await summary(inviter.token)).creditsEarned;
  assert(earnedBefore === 20, 'changing the rate does not rewrite credits already earned');

  // -- the cap under concurrent sign-ups --------------------------------------
  const capped = data(await signup(undefined, 'capped@smoke.test', 'Cap Tester'));
  const cappedCode = (await summary(capped.token)).code;
  const burst = await Promise.all(Array.from({ length: 12 }, () => signup(cappedCode)));
  assert(burst.every((r) => r.status === 200 && r.body.ok && r.body.data.referralApplied === true),
    '12 concurrent referred sign-ups all succeed');
  assert(burst.every((r) => r.body.ok && r.body.data.user.bonusCredits === 5), 'every friend gets the configured 5 — even past the cap');
  const capSummary = await summary(capped.token);
  assert(capSummary.count === 3 && capSummary.remaining === 0 && capSummary.creditsEarned === 15,
    `the inviter is paid exactly 3 times (count ${capSummary.count}, earned ${capSummary.creditsEarned})`);
  assert((await bonusOf(capped.user.id)) === 15, 'the inviter\'s pool holds 3 × 5 = 15, not 12 × 5');

  // Back to the defaults: with the cap at 20, one inviter can earn up to 200.
  data(await call('PUT', '/api/admin/settings/referral', { creditsPerReferral: 10, maxRewardedReferrals: 20 }, admin.token));
  resetReferralSettingsCache();
  const big = data(await signup());
  const bigCode = (await summary(big.token)).code;
  await Promise.all(Array.from({ length: 25 }, () => signup(bigCode)));
  const bigSummary = await summary(big.token);
  assert(bigSummary.count === 20 && bigSummary.creditsEarned === 200 && (await bonusOf(big.user.id)) === 200,
    '25 friends at the defaults: capped at 20 rewarded, 200 credits');

  // -- spending the pool -----------------------------------------------------
  const entries = (n: number, from: number) =>
    Array.from({ length: n }, (_, i) => ({
      clientId: `smoke-action-${from + i}-${friend.user.id}`,
      platform: 'twitter',
      actionType: 'like',
      targetUrl: `https://x.com/a/status/${from + i}`,
      success: true,
      timestamp: new Date().toISOString(),
    }));
  const log1 = data(await call<{ monthlyActionCount: number; bonusCredits?: number }>('POST', '/api/actions/log', { entries: entries(FREE_TIER.monthlyActions - 2, 0) }, friend.token));
  assert(log1.bonusCredits === undefined && (await bonusOf(friend.user.id)) === 10, 'actions inside the monthly allowance leave the pool alone');
  const log2 = data(await call<{ monthlyActionCount: number; bonusCredits?: number }>('POST', '/api/actions/log', { entries: entries(6, 1_000) }, friend.token));
  assert(log2.monthlyActionCount === FREE_TIER.monthlyActions + 4 && log2.bonusCredits === 6, 'a batch crossing the allowance spends only its overflow (4 of 6)');
  const log3 = data(await call<{ bonusCredits?: number }>('POST', '/api/actions/log', { entries: entries(20, 2_000) }, friend.token));
  assert(log3.bonusCredits === 0, 'the pool floors at zero');
} catch (e) {
  console.error(e);
  fails.push(`threw: ${e instanceof Error ? e.message : String(e)}`);
} finally {
  server.close();
  await mongoose.disconnect();
  await mongo.stop();
}

if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 referral-smoke OK');
process.exit(0);
