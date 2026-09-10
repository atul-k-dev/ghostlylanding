/* eslint-disable no-console */
/**
 * Voice-tune gate smoke (updateplan 6.3).
 *
 * Pins the gate a retrain sits behind: weekly cadence AND at least 5 NEW
 * corrections since the last tune — never one without the other, so a
 * chatty week of edits can't trigger daily retrains and a quiet week can't
 * trigger one on stale data.
 *
 * Run with: pnpm --filter @casper/extension voice-tune-smoke
 */
import { decideVoiceTune, VOICE_TUNE_INTERVAL_DAYS, MIN_NEW_CORRECTIONS } from '../src/lib/voice-tune.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

const NOW = Date.parse('2026-09-11T12:00:00Z');
const DAY_MS = 86_400_000;
const WEEK_AGO = new Date(NOW - VOICE_TUNE_INTERVAL_DAYS * DAY_MS).toISOString();
const YESTERDAY = new Date(NOW - DAY_MS).toISOString();

assert(
  decideVoiceTune({ lastTunedAt: null, lastCorrectionCount: 0 }, NOW, MIN_NEW_CORRECTIONS) === true,
  'never tuned before, and enough corrections exist → due',
);
assert(
  decideVoiceTune({ lastTunedAt: null, lastCorrectionCount: 0 }, NOW, MIN_NEW_CORRECTIONS - 1) === false,
  'never tuned before, but not enough corrections yet → not due',
);
assert(
  decideVoiceTune({ lastTunedAt: WEEK_AGO, lastCorrectionCount: 10 }, NOW, 10 + MIN_NEW_CORRECTIONS) === true,
  'a week since the last tune AND enough NEW corrections → due',
);
assert(
  decideVoiceTune({ lastTunedAt: WEEK_AGO, lastCorrectionCount: 10 }, NOW, 10 + MIN_NEW_CORRECTIONS - 1) === false,
  'a week since the last tune but not enough NEW corrections → not due (cadence alone is not enough)',
);
assert(
  decideVoiceTune({ lastTunedAt: YESTERDAY, lastCorrectionCount: 0 }, NOW, 500) === false,
  'plenty of corrections but under a week since the last tune → not due (volume alone is not enough)',
);
assert(
  decideVoiceTune({ lastTunedAt: WEEK_AGO, lastCorrectionCount: 50 }, NOW, 50) === false,
  'a week has passed but zero NEW corrections since then → not due',
);
assert(
  decideVoiceTune({ lastTunedAt: 'not a real date', lastCorrectionCount: 0 }, NOW, MIN_NEW_CORRECTIONS) === true,
  'an unparseable lastTunedAt is treated as "never tuned" — due, not silently blocked forever',
);

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 voice-tune-smoke OK');
