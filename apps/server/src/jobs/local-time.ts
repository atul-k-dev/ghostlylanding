/**
 * Timezone-aware date math shared by the digest jobs (daily + weekly).
 *
 * Dependency-free (Intl only): every job that needs "what day/hour is it for
 * THIS user" reads the same handful of functions here rather than each
 * re-deriving UTC-offset arithmetic slightly differently. Factored out of
 * `daily-summary.ts` in updateplan 4.4 when the weekly job needed the exact
 * same bucketing — "reuse it, don't reinvent it" applies to the code, not just
 * the pattern.
 */

const partsOf = (date: Date, tz: string): Record<string, string> => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    weekday: 'short',
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  return map;
};

/** YYYY-MM-DD for `date` as seen in `tz`. */
export const localDateString = (date: Date, tz: string): string => {
  const p = partsOf(date, tz);
  return `${p.year}-${p.month}-${p.day}`;
};

/** 0–23 local hour for `date` in `tz`. */
export const localHour = (date: Date, tz: string): number => Number(partsOf(date, tz).hour);

/** 1 (Monday) – 7 (Sunday), ISO-style, for `date` in `tz`. */
export const localIsoWeekday = (date: Date, tz: string): number => {
  const short = partsOf(date, tz).weekday ?? 'Mon';
  const order = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const i = order.indexOf(short);
  return i === -1 ? 1 : i + 1;
};

/** "Tuesday, 8 July 2025" for a YYYY-MM-DD day string. */
export const friendlyDate = (day: string): string => {
  const d = new Date(`${day}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return day;
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(d);
};

/** "8–14 July 2025" — a week's range, from its Monday's YYYY-MM-DD. */
export const friendlyWeekRange = (mondayDay: string): string => {
  const monday = new Date(`${mondayDay}T12:00:00Z`);
  if (Number.isNaN(monday.getTime())) return mondayDay;
  const sunday = new Date(monday.getTime() + 6 * 86_400_000);
  const fmt = (d: Date, withMonth: boolean) =>
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      day: 'numeric',
      ...(withMonth ? { month: 'long' } : {}),
    }).format(d);
  const sameMonth = monday.getUTCMonth() === sunday.getUTCMonth();
  const year = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', year: 'numeric' }).format(sunday);
  return sameMonth
    ? `${fmt(monday, false)}–${fmt(sunday, true)} ${year}`
    : `${fmt(monday, true)} – ${fmt(sunday, true)} ${year}`;
};

export const safeTz = (tz: string | undefined): string => {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
};
