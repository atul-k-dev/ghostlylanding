/**
 * Per-hour action ceiling — a rolling 60-minute window.
 *
 * Daily caps alone are not pacing. The executor deliberately hands the content
 * script the FULL remaining daily budget for one continuous session, so before
 * this module existed a single session could legally spend the entire day's
 * allowance — likes + comments + follows + bookmarks + reposts + quotes, 285
 * actions at the default caps — inside one hour and then sit idle. No human
 * reads their timeline that way, and a burst like that is exactly the shape
 * platform anomaly detection looks for.
 *
 * Two halves, same split as `block-reason.ts`:
 *   - the window maths is PURE, takes `now` as an argument, and is what the
 *     smoke suite drives.
 *   - the four `*Now` helpers persist the window and are the only part that
 *     needs a browser. They run in BOTH contexts: the service worker records
 *     (via `incrementCounter`), the content script reads before each action.
 *     `chrome.storage.local` is what makes that work across the boundary.
 */
import { STORAGE_KEYS } from '../lib/storage.js';

/** The window is a true rolling hour, not a clock hour — no reset at :00. */
export const RATE_WINDOW_MS = 60 * 60 * 1_000;

/**
 * Ceilings per safety preset. Phase 1.3 introduces the presets themselves and
 * `settings.safetyPreset`; this map is already keyed for them, so that step
 * only has to start writing the field. Until then every account is Balanced.
 */
export const HOURLY_CEILINGS = { careful: 12, balanced: 30, growth: 60 } as const;

export type SafetyPresetName = keyof typeof HOURLY_CEILINGS;

export const DEFAULT_HOURLY_CEILING = HOURLY_CEILINGS.balanced;

/** ms-epoch of every action inside the window, oldest first. */
export interface RateWindowState {
  actedAt: number[];
}

/* -- pure window maths ------------------------------------------------------ */

/** Drop everything that has aged out, and keep the result sorted ascending. */
export const pruneWindow = (actedAt: readonly number[], now: number): number[] =>
  actedAt.filter((t) => t > now - RATE_WINDOW_MS).sort((a, b) => a - b);

export const actionsInWindow = (actedAt: readonly number[], now: number): number =>
  pruneWindow(actedAt, now).length;

export const slotsLeft = (
  actedAt: readonly number[],
  now: number,
  ceiling: number = DEFAULT_HOURLY_CEILING,
): number => Math.max(0, ceiling - actionsInWindow(actedAt, now));

export const canAct = (
  actedAt: readonly number[],
  now: number,
  ceiling: number = DEFAULT_HOURLY_CEILING,
): boolean => actionsInWindow(actedAt, now) < ceiling;

/**
 * How long until the window has room again. Zero when it already does.
 *
 * Reads from the OLDEST end: with a ceiling of 30 and 30 actions on the clock,
 * the slot frees the moment the earliest of them turns 60 minutes old. Written
 * to stay correct if the window holds more than the ceiling — which happens the
 * moment a user moves Growth (60/h) down to Careful (12/h) mid-hour.
 */
export const msUntilNextSlot = (
  actedAt: readonly number[],
  now: number,
  ceiling: number = DEFAULT_HOURLY_CEILING,
): number => {
  const w = pruneWindow(actedAt, now);
  if (w.length < ceiling) return 0;
  const mustExpire = w[w.length - ceiling];
  if (mustExpire === undefined) return 0;
  return Math.max(0, mustExpire + RATE_WINDOW_MS - now);
};

/* -- persistence ------------------------------------------------------------ */

const readWindow = async (now: number): Promise<number[]> => {
  try {
    const got = await chrome.storage.local.get(STORAGE_KEYS.rateWindow);
    const state = got[STORAGE_KEYS.rateWindow] as RateWindowState | undefined;
    return pruneWindow(state?.actedAt ?? [], now);
  } catch {
    return [];
  }
};

/**
 * The ceiling in force right now. Reads `safetyPreset` structurally rather than
 * through `ExtensionSettings`, because Phase 1.3 is what adds the field to that
 * type — until then an unset/unknown value simply means Balanced.
 */
export const hourlyCeiling = async (): Promise<number> => {
  try {
    const got = await chrome.storage.local.get(STORAGE_KEYS.settings);
    const preset = (got[STORAGE_KEYS.settings] as { safetyPreset?: string } | undefined)
      ?.safetyPreset;
    if (preset && preset in HOURLY_CEILINGS) {
      return HOURLY_CEILINGS[preset as SafetyPresetName];
    }
  } catch {
    /* fall through to the default */
  }
  return DEFAULT_HOURLY_CEILING;
};

export const canActNow = async (now: number = Date.now()): Promise<boolean> =>
  canAct(await readWindow(now), now, await hourlyCeiling());

export const slotsLeftNow = async (now: number = Date.now()): Promise<number> =>
  slotsLeft(await readWindow(now), now, await hourlyCeiling());

export const msUntilSlotNow = async (now: number = Date.now()): Promise<number> =>
  msUntilNextSlot(await readWindow(now), now, await hourlyCeiling());

/**
 * Record one completed, platform-visible action. Called from `incrementCounter`
 * — the single choke point every like/comment/follow already passes through, in
 * both the in-session path (RECORD_ACTION from the content script) and the
 * queued-task path (the scheduler's dispatch) — so no action can be paced by the
 * daily cap and skip the hourly one.
 */
export const recordActed = async (now: number = Date.now()): Promise<void> => {
  try {
    const actedAt = [...(await readWindow(now)), now];
    await chrome.storage.local.set({
      [STORAGE_KEYS.rateWindow]: { actedAt } satisfies RateWindowState,
    });
  } catch {
    /* storage unavailable — the daily caps still hold */
  }
};
