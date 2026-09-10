import type { ExtensionSettings, PlatformCaps, SafetyPresetName } from '@casper/shared';

/**
 * Safety presets — one choice instead of six sliders.
 *
 * Before this, every safety number was independently editable and independently
 * wrong: an account-age box that said "leave blank if unsure" (and then granted
 * full caps), a session length, six per-day caps, and delays nobody could see.
 * A preset moves all of them together, so the numbers can't end up in a
 * combination nobody designed — 15 follows a day paced at one every 8 seconds.
 *
 * Three, and only three. A fourth would be a slider with extra steps.
 */
export interface SafetyPreset {
  name: SafetyPresetName;
  label: string;
  /** One line, second person, for the setup card. No percentages. */
  blurb: string;
  /** Base daily caps for X, BEFORE age multiplier, warm-up and daily variance. */
  caps: PlatformCaps;
  /**
   * Delay between two consecutive actions in a session. Never below 8s in any
   * preset — that floor is a product promise (`CONTEXT.md` §10), not a setting.
   */
  actionDelayMs: { min: number; max: number };
  /** Rolling 60-minute ceiling. Enforced in `scheduler/rate-limit.ts`. */
  hourlyCeiling: number;
  /** Safety auto-pause after this many minutes of continuous work. */
  sessionMinutes: number;
  /** Which action types this preset turns on. Quote/repost stay off by default
   *  in every preset: they publish under the user's name. */
  actions: {
    like: boolean;
    comment: boolean;
    follow: boolean;
    bookmark: boolean;
    repost: boolean;
    quote: boolean;
  };
}

/** The floor every preset is checked against. Mirrors `ACTION_DELAY_MS.min`. */
export const MIN_ACTION_DELAY_MS = 8_000;

/** How long a new account takes to reach its full caps. */
export const WARMUP_DAYS = 14;

/** Where the ramp starts: a tenth of the preset's caps on day one. */
export const WARMUP_FLOOR = 0.1;

export const SAFETY_PRESETS: Record<SafetyPresetName, SafetyPreset> = {
  careful: {
    name: 'careful',
    label: 'Careful',
    blurb: 'A handful of replies a day, slowly. Best if the account matters to you.',
    caps: {
      likesPerDay: 40,
      commentsPerDay: 8,
      followsPerDay: 12,
      bookmarksPerDay: 20,
      repostsPerDay: 6,
      quotesPerDay: 3,
    },
    // Slower than the documented 8–45s, deliberately: this preset exists for
    // people who would rather it did less. Never faster, only slower.
    actionDelayMs: { min: 15_000, max: 75_000 },
    hourlyCeiling: 12,
    sessionMinutes: 30,
    actions: { like: true, comment: true, follow: false, bookmark: false, repost: false, quote: false },
  },
  balanced: {
    name: 'balanced',
    label: 'Balanced',
    blurb: 'Steady all day, at a pace a person could keep up. Most people want this.',
    // The caps this product has shipped with. Balanced is not a new setting —
    // it is what every existing install is already running.
    caps: {
      likesPerDay: 100,
      commentsPerDay: 30,
      followsPerDay: 50,
      bookmarksPerDay: 60,
      repostsPerDay: 30,
      quotesPerDay: 15,
    },
    actionDelayMs: { min: 8_000, max: 45_000 },
    hourlyCeiling: 30,
    sessionMinutes: 60,
    actions: { like: true, comment: true, follow: true, bookmark: false, repost: false, quote: false },
  },
  growth: {
    name: 'growth',
    label: 'Growth',
    blurb: 'As much as I can do safely. Best on an account you can afford to rebuild.',
    // The ONLY place any cap goes above what ships today, and even here it is an
    // order of magnitude under the limits X actually enforces. The hourly
    // ceiling, the warm-up ramp and the age multiplier all still apply on top.
    caps: {
      likesPerDay: 140,
      commentsPerDay: 40,
      followsPerDay: 70,
      bookmarksPerDay: 80,
      repostsPerDay: 40,
      quotesPerDay: 20,
    },
    actionDelayMs: { min: 8_000, max: 45_000 },
    hourlyCeiling: 60,
    sessionMinutes: 90,
    actions: { like: true, comment: true, follow: true, bookmark: true, repost: false, quote: false },
  },
};

export const DEFAULT_PRESET: SafetyPresetName = 'balanced';

export const presetOf = (settings: Pick<ExtensionSettings, 'safetyPreset'>): SafetyPreset =>
  SAFETY_PRESETS[settings.safetyPreset] ?? SAFETY_PRESETS[DEFAULT_PRESET];

/**
 * The in-session pacing this account is on, with the 8s floor enforced here
 * rather than trusted. A preset is code, so it cannot drift — but this is the
 * one number the product promises out loud, and a promise worth making is worth
 * making unconditional at the point of use.
 */
export const actionDelayFor = (
  settings: Pick<ExtensionSettings, 'safetyPreset'>,
): { min: number; max: number } => {
  const { min, max } = presetOf(settings).actionDelayMs;
  const floor = Math.max(MIN_ACTION_DELAY_MS, min);
  return { min: floor, max: Math.max(floor, max) };
};

/**
 * Where this account is on its warm-up ramp: `WARMUP_FLOOR` on day 0, rising
 * linearly to 1.0 on day `WARMUP_DAYS`.
 *
 * `null` means no ramp is running — an install that predates setup. Those keep
 * the caps they already had rather than being throttled retroactively for
 * something they have already been doing safely for months.
 */
export const warmupFactor = (startedAt: string | null, now: Date = new Date()): number => {
  if (!startedAt) return 1;
  const start = Date.parse(startedAt);
  if (Number.isNaN(start)) return 1;
  const days = (now.getTime() - start) / 86_400_000;
  if (days <= 0) return WARMUP_FLOOR;
  if (days >= WARMUP_DAYS) return 1;
  return WARMUP_FLOOR + (1 - WARMUP_FLOOR) * (days / WARMUP_DAYS);
};

/**
 * Write everything a preset implies into settings. The preset is not a hint the
 * engine consults later — it is applied once, here, so the stored settings are
 * always a combination somebody designed.
 *
 * LinkedIn's caps are left alone: its automation was removed, and the type only
 * still carries it so the platform maps stay total.
 */
export const applyPreset = (
  settings: ExtensionSettings,
  name: SafetyPresetName,
  now: Date = new Date(),
): ExtensionSettings => {
  const preset = SAFETY_PRESETS[name] ?? SAFETY_PRESETS[DEFAULT_PRESET];
  return {
    ...settings,
    safetyPreset: preset.name,
    sessionMinutes: preset.sessionMinutes,
    caps: { ...settings.caps, twitter: { ...preset.caps } },
    homeFeed: { ...settings.homeFeed, ...preset.actions },
    // Switching presets never restarts a ramp that is already running — that
    // would re-throttle an account for choosing to go slower.
    warmupStartedAt: settings.warmupStartedAt ?? now.toISOString(),
  };
};
