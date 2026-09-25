/**
 * A fixed clock, so re-running the shots produces the same images.
 *
 * Half the panel is time-relative — the greeting, "4m ago", which day a queued
 * post lands on, whether a slot is still ahead of you. Left on the real clock,
 * every capture would differ from the last and a re-run would look like a
 * change. Frozen at a Tuesday afternoon: a weekday, mid-session, with the
 * evening posting slot still to come.
 *
 * Imported first, before anything reads the time.
 */
export const FIXED = new Date('2026-09-15T14:20:00').getTime();

const Real = Date;

class Frozen extends Real {
  constructor(...args: ConstructorParameters<typeof Date> | []) {
    if (args.length === 0) super(FIXED);
    else super(...(args as ConstructorParameters<typeof Date>));
  }
  static override now(): number {
    return FIXED;
  }
}

(globalThis as { Date: DateConstructor }).Date = Frozen as unknown as DateConstructor;

// performance.now() drives animation timing, not dates, so it is left alone.
