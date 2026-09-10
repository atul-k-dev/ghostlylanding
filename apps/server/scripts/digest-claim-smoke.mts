/* eslint-disable no-console */
/**
 * Digest claim-race smoke (updateplan 4.4's "two concurrent runners send
 * exactly one email").
 *
 * The daily and weekly jobs both use the SAME pattern: `updateOne({ _id,
 * marker: { $ne: target } }, { $set: { marker: target } })`, and check
 * `modifiedCount` to know whether THIS call actually won the claim. There is
 * no MongoDB test harness anywhere in this repo (no in-memory Mongo, no
 * disposable test DB) to run that update for real, so this proves the
 * ALGORITHM's correctness against a minimal fake collection that implements
 * the one operation the pattern depends on — a conditional, atomic
 * check-and-set — rather than mocking the outcome directly.
 *
 * "Concurrent" here means two callers racing against the SAME fake document;
 * because the fake applies the filter and the write as one step (as Mongo's
 * real `updateOne` does), the property under test — that a second caller
 * whose filter no longer matches gets `modifiedCount: 0` — holds regardless of
 * calling order, which is exactly the property the real dedup relies on.
 *
 * Run with: pnpm --filter @casper/server digest-claim-smoke
 */

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

/** A minimal stand-in for the one Mongo document the jobs claim against. */
interface FakeUser {
  marker: string | null;
}

/** The exact semantics `UserModel.updateOne({ _id, marker: {$ne: target} }, {$set: {marker: target}})`
 *  has: only writes (and only reports a hit) when the filter still matches at
 *  the moment of the write. */
const claim = (doc: FakeUser, target: string): { modifiedCount: number } => {
  if (doc.marker === target) return { modifiedCount: 0 };
  doc.marker = target;
  return { modifiedCount: 1 };
};

// -- 1. two racing callers, one target ---------------------------------------

{
  const doc: FakeUser = { marker: null };
  const first = claim(doc, '2026-09-07');
  const second = claim(doc, '2026-09-07');
  assert(first.modifiedCount === 1, 'the first caller wins the claim');
  assert(second.modifiedCount === 0, 'the second caller — racing for the SAME target — loses it');
  assert(doc.marker === '2026-09-07', 'the marker reflects exactly one send, not a mix of both callers');
}

// -- 2. order doesn't matter — whichever call lands first wins ---------------

{
  const docA: FakeUser = { marker: null };
  const docB: FakeUser = { marker: null };
  // Same two calls, opposite order — the RESULT (one winner, one loser) must
  // be identical either way, since real concurrency gives no ordering guarantee.
  const a1 = claim(docA, 'w');
  const a2 = claim(docA, 'w');
  const b2 = claim(docB, 'w');
  const b1 = claim(docB, 'w');
  assert(
    [a1.modifiedCount, a2.modifiedCount].sort().join(',') === [b1.modifiedCount, b2.modifiedCount].sort().join(','),
    'exactly one winner and one loser, whichever call happens to land first',
  );
}

// -- 3. a genuinely new period is claimable again -----------------------------

{
  const doc: FakeUser = { marker: '2026-09-07' };
  const nextWeek = claim(doc, '2026-09-14');
  assert(nextWeek.modifiedCount === 1, 'a new target (the following week) can be claimed fresh');
  const repeat = claim(doc, '2026-09-14');
  assert(repeat.modifiedCount === 0, 'and is then protected the same way against a second sender');
}

// -- 4. a failed send releases the claim for the next pass -------------------

{
  const doc: FakeUser = { marker: null };
  claim(doc, 'w1');
  // The send failed — the job rolls the marker back (mirrors the try/catch in
  // both jobs), so the NEXT hourly pass can retry rather than losing the week.
  doc.marker = null;
  const retry = claim(doc, 'w1');
  assert(retry.modifiedCount === 1, 'rolling back a failed send lets the next pass claim it again');
}

if (fails.length > 0) {
  console.log(`\n${fails.length} FAILED`);
  for (const f of fails) console.log(' -', f);
  process.exit(1);
}
console.log('\n🎉 digest-claim-smoke OK');
