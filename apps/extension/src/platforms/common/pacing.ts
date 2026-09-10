/**
 * How the in-session loop moves through a feed: how far it scrolls, how long it
 * waits, and how long it spends on a post before judging it.
 *
 * Delays between ACTIONS are the executor's business (`ACTION_DELAY_MS`). This
 * module covers the part in between, which was fully deterministic: every pass
 * scrolled exactly 700px and paused exactly 650ms, forever. A perfectly regular
 * scroll rhythm is a fingerprint on its own — no eye-tracking needed to spot it
 * — and it was paired with reading nothing: a 400-word thread and a three-word
 * post were considered in the same zero milliseconds.
 *
 * Pure and DOM-free so the smoke suite can drive it.
 */

/** Random integer in [min, max] inclusive. */
export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** How far one pass of the feed scrolls. Roughly one to three posts. */
export const SCROLL_DISTANCE_PX = { min: 400, max: 1_100 } as const;

/** The beat after a scroll, before the next pass reads the DOM. */
export const SCROLL_PAUSE_MS = { min: 400, max: 1_400 } as const;

/** Silent reading speed. Deliberately unhurried — this is a phone, not an exam. */
export const READ_WORDS_PER_SECOND = 4;

/**
 * Even an empty post costs a beat (the floor), and nobody reads a 900-word
 * thread end to end before deciding to like it (the ceiling).
 */
export const DWELL_MS = { min: 1_500, max: 12_000 } as const;

export const nextScrollDistancePx = (): number =>
  randomInt(SCROLL_DISTANCE_PX.min, SCROLL_DISTANCE_PX.max);

export const nextScrollPauseMs = (): number =>
  randomInt(SCROLL_PAUSE_MS.min, SCROLL_PAUSE_MS.max);

/**
 * How long to sit with a post before moving on, proportional to how much there
 * is to read. `jitter` is a multiplier on the raw reading time (±15% by
 * default) so two posts of identical length don't produce identical dwells; the
 * smoke suite passes 1 to pin the maths down.
 */
export const readDwellMs = (text: string, jitter: number = 0.85 + Math.random() * 0.3): number => {
  const trimmed = text.trim();
  const words = trimmed ? trimmed.split(/\s+/).length : 0;
  const raw = (words / READ_WORDS_PER_SECOND) * 1_000 * jitter;
  return Math.round(Math.min(DWELL_MS.max, Math.max(DWELL_MS.min, raw)));
};
