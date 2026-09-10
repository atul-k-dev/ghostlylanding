import type { ActiveHours, ExtensionSettings } from '@casper/shared';

/** Random integer in [min, max] inclusive. */
export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/**
 * The one source of truth for how long the engine waits between two consecutive
 * actions — `CONTEXT.md` §10 mandates 8–45s. Used in two places, and they must
 * not drift apart: the scheduler's own tick spacing (`nextActionDelayMs`) and
 * the in-session pacing handed to the content script by `executor.ts`.
 */
export const ACTION_DELAY_MS = { min: 8_000, max: 45_000 } as const;

/** Random delay between consecutive actions — §10 mandates 8–45s. */
export const nextActionDelayMs = (): number =>
  randomInt(ACTION_DELAY_MS.min, ACTION_DELAY_MS.max);

/**
 * Returns YYYY-MM-DD for `now` in the given IANA timezone.
 * Defensive against bad tz strings: falls back to UTC.
 */
export const localDate = (now: Date, timezone: string): string => {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return fmt.format(now);
  } catch {
    return now.toISOString().slice(0, 10);
  }
};

/** 0–23 in the given timezone. */
export const localHour = (now: Date, timezone: string): number => {
  try {
    const fmt = new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      hour: '2-digit',
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const hourPart = parts.find((p) => p.type === 'hour')?.value ?? '0';
    return Number(hourPart) % 24;
  } catch {
    return now.getUTCHours();
  }
};

export const isWithinActiveHours = (
  now: Date,
  timezone: string,
  hours: ActiveHours,
): boolean => {
  const h = localHour(now, timezone);
  // Same-day window (e.g. 9–22)
  if (hours.startHour <= hours.endHour) {
    return h >= hours.startHour && h < hours.endHour;
  }
  // Overnight window (e.g. 22–6)
  return h >= hours.startHour || h < hours.endHour;
};

export const isActiveNow = (settings: ExtensionSettings, now: Date = new Date()): boolean => {
  if (settings.isPaused) return false;
  return isWithinActiveHours(now, settings.timezone, settings.activeHours);
};
