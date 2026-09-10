/* eslint-disable no-console */
/**
 * Follow-back attribution smoke (updateplan 5.1/5.2).
 *
 * The only per-account follower figure this product ever claims: of a sample
 * of the user's own followers, how many did Ghostly follow first. Pins the
 * maths AND the "no sample = null, never a guessed zero" rule.
 *
 * Run with: pnpm --filter @casper/extension attribution-smoke
 */
import { computeFollowedBack } from '../src/lib/attribution.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

const followed = new Set(['levelsio', 'naval', 'pmarca']);

assert(computeFollowedBack([], followed) === null, 'an empty sample returns null, not a guessed zero');
assert(
  computeFollowedBack([{ handle: 'levelsio' }], new Set()) !== null,
  'an empty followed-set with a real sample is still a real (zero) answer, not null',
);
assert(
  computeFollowedBack([{ handle: 'levelsio' }], new Set())?.followedBack === 0,
  '...specifically zero, not a guess',
);

const mixed = [
  { handle: 'levelsio' },
  { handle: '@naval' },
  { handle: 'someRandomPerson' },
  { handle: 'pmarca' },
];
const result = computeFollowedBack(mixed, followed);
assert(result !== null, 'a real sample against a real followed-set is never null');
assert(result?.followedBackSample === 4, 'the sample size is the whole sample, not just the matches');
assert(result?.followedBack === 3, '3 of 4 sampled followers were followed first — @ and case handled');

const allNew = [{ handle: 'stranger1' }, { handle: 'stranger2' }];
const noneResult = computeFollowedBack(allNew, followed);
assert(noneResult?.followedBack === 0, 'zero matches is a real zero, not null — there WAS a sample');
assert(noneResult?.followedBackSample === 2, 'sample size is still reported even at zero matches');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 attribution-smoke OK');
