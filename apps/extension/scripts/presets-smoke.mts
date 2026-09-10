/* eslint-disable no-console */
/**
 * Safety-preset smoke.
 *
 * A preset is a promise about how hard the engine will work, so the things
 * pinned here are the ones a careless edit would quietly break: that Careful is
 * actually careful, that no preset can pace below the 8-second floor, and that
 * the warm-up ramp and the age multiplier COMPOSE rather than one silently
 * winning — the case that matters is a young account on its second day, where
 * both apply at once.
 *
 * Run with: pnpm --filter @casper/extension presets-smoke
 */
import type { ExtensionSettings, SafetyPresetName } from '@casper/shared';
import {
  SAFETY_PRESETS,
  DEFAULT_PRESET,
  MIN_ACTION_DELAY_MS,
  WARMUP_DAYS,
  WARMUP_FLOOR,
  actionDelayFor,
  applyPreset,
  presetOf,
  warmupFactor,
} from '../src/lib/presets.js';
import { computeDailyCaps, ageMultiplier } from '../src/scheduler/quotas.js';
import { ACTION_DELAY_MS } from '../src/scheduler/timegate.js';
import { HOURLY_CEILINGS, DEFAULT_HOURLY_CEILING } from '../src/scheduler/rate-limit.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

const NAMES: SafetyPresetName[] = ['careful', 'balanced', 'growth'];

// --- every preset is internally sane ---------------------------------------
for (const name of NAMES) {
  const p = SAFETY_PRESETS[name];
  assert(p.name === name, `${name}: the table key matches the preset's own name`);
  assert(
    p.actionDelayMs.min >= MIN_ACTION_DELAY_MS,
    `${name}: never paces faster than the 8s floor`,
  );
  assert(p.actionDelayMs.max > p.actionDelayMs.min, `${name}: delay range is not inverted`);
  assert(p.hourlyCeiling > 0 && p.sessionMinutes > 0, `${name}: has a ceiling and a session length`);
  assert(!p.actions.quote && !p.actions.repost, `${name}: nothing that publishes is on by default`);
  // An hour of work at this preset's own pace must not be able to outrun its
  // own ceiling by more than the ceiling itself — otherwise the two numbers
  // describe different products.
  const fastestPerHour = 3_600_000 / p.actionDelayMs.min;
  assert(p.hourlyCeiling <= fastestPerHour, `${name}: the ceiling is reachable at its own pace`);
}

// --- the three are actually ordered ----------------------------------------
assert(
  SAFETY_PRESETS.careful.caps.likesPerDay < SAFETY_PRESETS.balanced.caps.likesPerDay &&
    SAFETY_PRESETS.balanced.caps.likesPerDay < SAFETY_PRESETS.growth.caps.likesPerDay,
  'caps rise careful → balanced → growth',
);
assert(
  SAFETY_PRESETS.careful.hourlyCeiling < SAFETY_PRESETS.balanced.hourlyCeiling &&
    SAFETY_PRESETS.balanced.hourlyCeiling < SAFETY_PRESETS.growth.hourlyCeiling,
  'hourly ceilings rise in the same order',
);
assert(
  SAFETY_PRESETS.careful.actionDelayMs.min > SAFETY_PRESETS.balanced.actionDelayMs.min,
  'Careful waits longer between actions than Balanced',
);
assert(!SAFETY_PRESETS.careful.actions.follow, 'Careful does not follow anyone');

// Balanced is the shipped configuration — changing it changes every existing
// install, so it is pinned to the documented 8–45s range and today's caps.
assert(DEFAULT_PRESET === 'balanced', 'Balanced is the default');
assert(
  SAFETY_PRESETS.balanced.actionDelayMs.min === ACTION_DELAY_MS.min &&
    SAFETY_PRESETS.balanced.actionDelayMs.max === ACTION_DELAY_MS.max,
  'Balanced is exactly the documented 8–45s range',
);
assert(SAFETY_PRESETS.balanced.caps.likesPerDay === 100, 'Balanced keeps the shipped like cap');

// --- the ceiling table in rate-limit is derived, not duplicated -------------
for (const name of NAMES) {
  assert(
    HOURLY_CEILINGS[name] === SAFETY_PRESETS[name].hourlyCeiling,
    `${name}: rate-limit reads its ceiling from the preset table`,
  );
}
assert(
  DEFAULT_HOURLY_CEILING === SAFETY_PRESETS[DEFAULT_PRESET].hourlyCeiling,
  'the default ceiling follows the default preset',
);

// --- actionDelayFor enforces the floor even if a preset were edited badly ---
const settingsWith = (name: SafetyPresetName): ExtensionSettings =>
  ({ safetyPreset: name }) as ExtensionSettings;
for (const name of NAMES) {
  const d = actionDelayFor(settingsWith(name));
  assert(d.min >= MIN_ACTION_DELAY_MS, `${name}: actionDelayFor never returns under 8s`);
  assert(d.max >= d.min, `${name}: actionDelayFor range is not inverted`);
}
assert(
  presetOf({ safetyPreset: 'nonsense' as SafetyPresetName }).name === DEFAULT_PRESET,
  'an unknown preset name falls back to the default, not to undefined',
);

// --- the warm-up ramp -------------------------------------------------------
const at = (days: number): Date => new Date(Date.UTC(2026, 0, 1) + days * 86_400_000);
const START = new Date(Date.UTC(2026, 0, 1)).toISOString();

assert(warmupFactor(START, at(0)) === WARMUP_FLOOR, 'day 0 is ~10% of caps');
assert(Math.abs(warmupFactor(START, at(7)) - 0.55) < 1e-9, 'day 7 is ~55%');
assert(warmupFactor(START, at(WARMUP_DAYS)) === 1, 'day 14 is full caps');
assert(warmupFactor(START, at(40)) === 1, 'past day 14 stays at full caps, never above');
assert(
  warmupFactor(START, at(3)) > warmupFactor(START, at(2)),
  'the ramp is monotonic day to day',
);
assert(warmupFactor(null) === 1, 'no ramp running → full caps (installs that predate setup)');
assert(warmupFactor('not-a-date') === 1, 'an unparseable start date does not throttle to zero');
assert(warmupFactor(START, at(-3)) === WARMUP_FLOOR, 'a clock skewed backwards floors, not soars');

// --- warm-up and age compose, and never exceed the base caps ----------------
const base = SAFETY_PRESETS.balanced.caps;
const full = computeDailyCaps(base, 24, 1.0, 1);
assert(full.likesPerDay === base.likesPerDay, 'mature account, ramp done → the base caps exactly');

const day0Mature = computeDailyCaps(base, 24, 1.0, warmupFactor(START, at(0)));
assert(day0Mature.likesPerDay === Math.round(base.likesPerDay * 0.1), 'day 0 on a mature account = 10%');

// The riskiest combination in the product: a three-month-old account on day two.
const young = computeDailyCaps(base, 3, 1.0, warmupFactor(START, at(2)));
const expected = Math.round(base.likesPerDay * ageMultiplier(3) * warmupFactor(START, at(2)));
assert(young.likesPerDay === expected, 'young account × early ramp multiply, neither one wins');
assert(
  young.likesPerDay < day0Mature.likesPerDay * 10,
  'the young account is capped below the mature one at the same point on the ramp',
);

for (const name of NAMES) {
  for (const months of [null, 0, 3, 8, 24]) {
    for (const day of [0, 1, 7, 13, 14, 100]) {
      const caps = computeDailyCaps(
        SAFETY_PRESETS[name].caps,
        months,
        1.0,
        warmupFactor(START, at(day)),
      );
      if (caps.likesPerDay > SAFETY_PRESETS[name].caps.likesPerDay) {
        fails.push(`${name} m=${months} d=${day} exceeded its base caps`);
      }
    }
  }
}
assert(
  !fails.some((f) => f.includes('exceeded its base caps')),
  'no combination of preset × age × ramp ever exceeds the preset caps',
);

// --- applyPreset writes a coherent settings object --------------------------
const baseSettings = {
  safetyPreset: 'balanced',
  sessionMinutes: 60,
  warmupStartedAt: null,
  caps: { twitter: { ...base }, linkedin: { ...base } },
  homeFeed: { enabled: true, like: false, comment: false, follow: true, bookmark: true, repost: true, quote: true },
} as unknown as ExtensionSettings;

const careful = applyPreset(baseSettings, 'careful', at(0));
assert(careful.safetyPreset === 'careful', 'applyPreset records the choice');
assert(careful.sessionMinutes === SAFETY_PRESETS.careful.sessionMinutes, 'session length follows');
assert(careful.caps.twitter.likesPerDay === SAFETY_PRESETS.careful.caps.likesPerDay, 'caps follow');
assert(careful.homeFeed.follow === false, 'action toggles follow the preset (follow off on Careful)');
assert(careful.homeFeed.quote === false, 'a preset turns publishing actions OFF, never on');
assert(careful.homeFeed.enabled === true, 'applyPreset leaves unrelated settings alone');
assert(careful.warmupStartedAt === at(0).toISOString(), 'the first preset choice starts the ramp');
assert(
  careful.caps.linkedin.likesPerDay === base.likesPerDay,
  'LinkedIn caps are untouched — its automation is gone, the type is not',
);

const switched = applyPreset(careful, 'growth', at(5));
assert(
  switched.warmupStartedAt === careful.warmupStartedAt,
  'switching preset does NOT restart a ramp already in progress',
);
assert(switched.caps.twitter.likesPerDay === SAFETY_PRESETS.growth.caps.likesPerDay, 'new caps apply');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 presets-smoke OK');
