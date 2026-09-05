/**
 * Time helpers for scheduling posts.
 *
 * Scheduling used to be day-granular: a post was stamped at local midnight and
 * went out whenever the browser next happened to be open. These turn a date and
 * a time into the exact instant the user meant, in their own timezone.
 */

/** YYYY-MM-DD for a Date, in local time (what <input type="date"> expects). */
export const toDateInputValue = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

/** HH:MM for a Date, in local time (what <input type="time"> expects). */
export const toTimeInputValue = (d: Date): string => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
};

/**
 * Combine a YYYY-MM-DD date and an HH:MM time into a ms epoch, interpreted in
 * the user's LOCAL timezone — the timestamp string is deliberately written
 * without a `Z`, so the runtime resolves it locally. Falls back to 09:00 for a
 * blank time rather than midnight, since an empty box shouldn't mean "post at
 * 3am". Returns NaN for input that isn't a real date.
 */
export const localDateTime = (dateStr: string, timeStr: string): number => {
  const time = /^\d{2}:\d{2}$/.test(timeStr) ? timeStr : '09:00';
  return new Date(`${dateStr}T${time}:00`).getTime();
};

/** Local midnight for a YYYY-MM-DD string — the old day-granular behaviour,
 *  kept for reading back posts scheduled before times existed. */
export const startOfLocalDay = (dateStr: string): number => localDateTime(dateStr, '00:00');
