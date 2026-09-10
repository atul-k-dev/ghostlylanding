/* eslint-disable no-console */
/**
 * Graduated-trust smoke (updateplan 3.3).
 *
 * This is the state machine that decides whether Ghostly may publish under
 * someone's name without them reading it first, so the assertions here are
 * mostly about what it REFUSES to do:
 *
 *  - it never grants itself trust, at any streak, ever;
 *  - one edit at #19 puts the streak back to zero, not to 19;
 *  - declining is not a snooze — the next ask is another full streak away.
 *
 * The auto-draft decision (3.2) is checked in the same file, because it is the
 * other half of the same promise: with trust ungranted, an auto-drafted post
 * lands as a `draft`, which the publisher cannot select.
 *
 * Run with: pnpm --filter @casper/extension trust-smoke
 */
import type { ExtensionSettings } from '@casper/shared';
import {
  INITIAL_TRUST,
  TRUST_THRESHOLD,
  TRUST_OFFER,
  recordApproval,
  answerOffer,
  revokeTrust,
  hasOpenOffer,
  isTrusted,
  normalizeTrust,
  type TrustState,
} from '../src/lib/trust.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

/** n clean approvals in a row. */
const clean = (state: TrustState, n: number): TrustState => {
  let s = state;
  for (let i = 0; i < n; i += 1) s = recordApproval(s, { edited: false });
  return s;
};

// --- nothing is trusted until it is ---------------------------------------
assert(!isTrusted(INITIAL_TRUST), 'a fresh install is not trusted');
assert(!isTrusted(null), 'a missing trust object is not trusted');
assert(!isTrusted(undefined), 'an undefined trust object is not trusted');
assert(!hasOpenOffer(INITIAL_TRUST), 'and there is no offer on the table');

// --- 20 clean approvals trip the offer -------------------------------------
const nineteen = clean(INITIAL_TRUST, TRUST_THRESHOLD - 1);
assert(nineteen.streak === TRUST_THRESHOLD - 1, `${TRUST_THRESHOLD - 1} clean approvals counted`);
assert(!hasOpenOffer(nineteen), 'nineteen is not twenty — no offer yet');

const twenty = recordApproval(nineteen, { edited: false });
assert(twenty.streak === TRUST_THRESHOLD, 'the twentieth lands');
assert(hasOpenOffer(twenty), 'the offer appears at exactly the threshold');
assert(!isTrusted(twenty), 'an OFFER is not a grant — nothing is trusted yet');

// The offer is asked once, not once per approval after it.
const twentyOne = recordApproval(twenty, { edited: false });
assert(twentyOne.streak === TRUST_THRESHOLD + 1, 'the streak keeps counting past the offer');
assert(
  twentyOne.offeredAt === twenty.offeredAt,
  'the offer is not re-raised on every further approval',
);

// --- an edit at #19 resets to 0 --------------------------------------------
const edited = recordApproval(nineteen, { edited: true });
assert(edited.streak === 0, 'an edit at #19 resets the streak to zero, not to 19');
assert(edited.best === TRUST_THRESHOLD - 1, 'the high-water mark is kept, honestly');
assert(!hasOpenOffer(edited), 'and no offer is raised');

// An edit while an offer is on screen takes the offer down with it: an offer
// that survived an edit would be asking to publish unread the very thing that
// was just rewritten.
const editedAfterOffer = recordApproval(twenty, { edited: true });
assert(editedAfterOffer.offeredAt === null, 'an edit withdraws a live offer');
assert(editedAfterOffer.streak === 0, 'and resets the streak');

// --- trust never enables itself --------------------------------------------
const marathon = clean(INITIAL_TRUST, TRUST_THRESHOLD * 5);
assert(marathon.streak === TRUST_THRESHOLD * 5, 'a hundred clean approvals counted');
assert(!isTrusted(marathon), 'a hundred approvals still do not grant trust on their own');
assert(hasOpenOffer(marathon), 'the question is still just a question');

// --- the answers -----------------------------------------------------------
const granted = answerOffer(twenty, { accept: true });
assert(isTrusted(granted), 'an explicit yes grants it');
assert(!hasOpenOffer(granted), 'and takes the card down');
assert(granted.grantedAt !== null, 'the grant is stamped');

const declined = answerOffer(twenty, { accept: false });
assert(!isTrusted(declined), 'a no does not grant it');
assert(declined.declinedAt !== null, 'the no is remembered');
assert(declined.streak === 0, 'declining resets the streak — the next ask is a full streak away');
assert(!hasOpenOffer(declined), 'and there is no offer left open to answer twice');

// Declining and then approving nineteen more must NOT re-ask early.
const afterDecline = clean(declined, TRUST_THRESHOLD - 1);
assert(!hasOpenOffer(afterDecline), 'nineteen more after a no is still not another ask');
assert(hasOpenOffer(clean(afterDecline, 1)), 'the twentieth after a no asks again');

// Answering an offer that does not exist changes nothing.
assert(
  answerOffer(INITIAL_TRUST, { accept: true }).grantedAt === null,
  'you cannot accept an offer that was never made',
);

// --- giving the keys back --------------------------------------------------
const revoked = revokeTrust(granted);
assert(!isTrusted(revoked), 'revoking stops the trust');
assert(revoked.streak === 0, 'and starts the streak again from nothing');
assert(!hasOpenOffer(revoked), 'with no offer left hanging');

// A granted account is never re-offered — there is nothing left to ask for.
assert(!hasOpenOffer(clean(granted, TRUST_THRESHOLD * 2)), 'a trusted account is not re-asked');

// --- a state persisted before this shape existed --------------------------
const legacy = normalizeTrust({ streak: 4 } as Partial<TrustState>);
assert(legacy.streak === 4 && legacy.grantedAt === null, 'a partial stored state fills in safely');
assert(normalizeTrust(null).streak === 0, 'a missing state normalises to nothing');

// --- the copy says what the code does -------------------------------------
assert(
  TRUST_OFFER.title.includes(String(TRUST_THRESHOLD)),
  'the offer names the threshold the code actually uses',
);
assert(
  TRUST_OFFER.body.includes('undo'),
  'the offer says the decision is reversible, because it is',
);

/* -- the auto-draft decision (3.2) ---------------------------------------- */

const { decideAutoDraft } = await import('../src/scheduler/auto-posting.js');
const { SAFETY_PRESETS } = await import('../src/lib/presets.js');

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 10, 12, 0, 0);

const settings = (over: Partial<ExtensionSettings> = {}): ExtensionSettings =>
  ({
    contentTopics: ['building in public'],
    safetyPreset: 'balanced',
    activeHours: { startHour: 9, endHour: 22 },
    autoPost: { enabled: true, quietHours: 20, maxQueued: 3, lastRunAt: null },
    trust: INITIAL_TRUST,
    ...over,
  }) as ExtensionSettings;

const scheduled = (id: string, at: number, status: 'draft' | 'scheduled' | 'posted') =>
  ({
    id,
    text: 't',
    link: '',
    imageDataUrl: null,
    scheduledAt: at,
    status,
    createdAt: at,
    ...(status === 'posted' ? { postedAt: at } : {}),
  }) as Parameters<typeof decideAutoDraft>[0]['posts'][number];

assert(
  decideAutoDraft({ settings: settings({ autoPost: { enabled: false, quietHours: 20, maxQueued: 3, lastRunAt: null } }), posts: [], now: NOW }).skip ===
    'disabled',
  'auto-posting off means the loop does nothing at all',
);
assert(
  decideAutoDraft({ settings: settings({ contentTopics: [] }), posts: [], now: NOW }).skip ===
    'no-topics',
  'with no topics it refuses to guess what this person talks about',
);
assert(
  decideAutoDraft({ settings: settings(), posts: [], now: NOW }).want ===
    SAFETY_PRESETS.balanced.postsPerDay,
  'the cadence comes from the safety preset',
);
assert(
  decideAutoDraft({ settings: settings({ safetyPreset: 'growth' }), posts: [], now: NOW }).want ===
    SAFETY_PRESETS.growth.postsPerDay,
  'a different preset means a different cadence',
);
assert(
  decideAutoDraft({
    settings: settings({
      autoPost: { enabled: true, quietHours: 20, maxQueued: 3, lastRunAt: new Date(NOW - HOUR).toISOString() },
    }),
    posts: [],
    now: NOW,
  }).skip === 'ran-recently',
  'it runs daily, not on every 30-second tick',
);
assert(
  decideAutoDraft({
    settings: settings(),
    posts: [scheduled('a', NOW - HOUR, 'posted')],
    now: NOW,
  }).skip === 'posted-recently',
  'someone who posted an hour ago is not topped up',
);
assert(
  decideAutoDraft({
    settings: settings(),
    posts: [scheduled('b', NOW + 2 * HOUR, 'scheduled')],
    now: NOW,
  }).skip === 'posted-recently',
  'a post already booked for later counts too — it does not stack drafts on top of it',
);
assert(
  decideAutoDraft({
    settings: settings(),
    posts: [
      scheduled('c', NOW + 40 * HOUR, 'draft'),
      scheduled('d', NOW + 60 * HOUR, 'draft'),
      scheduled('e', NOW + 80 * HOUR, 'draft'),
    ],
    now: NOW,
  }).skip === 'enough-queued',
  'three unread drafts is enough — a backlog nobody reads is a chore, not a pipeline',
);
const stale = decideAutoDraft({
  settings: settings(),
  posts: [scheduled('f', NOW - 40 * HOUR, 'posted')],
  now: NOW,
});
assert(stale.skip === null && stale.want > 0, 'a genuinely quiet profile IS topped up');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 trust-smoke OK');
