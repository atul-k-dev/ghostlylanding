import type { ScheduledPost } from '../../lib/storage.js';

/**
 * The next seven days, with what is scheduled on each.
 *
 * Replaces the flat chronological list (updateplan 1.6). A list answers "what
 * is queued"; the thing a creator actually needs to see is which days are EMPTY
 * — that is the question that makes them write something.
 */
const DAY_MS = 86_400_000;

const dayKey = (ms: number): string => new Date(ms).toDateString();

export const WeekStrip = ({
  posts,
  selected,
  onSelect,
}: {
  posts: ScheduledPost[];
  /** Day-start ms of the selected day, or null for "everything". */
  selected: number | null;
  onSelect: (dayStartMs: number | null) => void;
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = today.getTime();

  const counts = new Map<string, number>();
  for (const p of posts) {
    const k = dayKey(p.scheduledAt);
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }

  return (
    <div className="flex gap-1">
      {Array.from({ length: 7 }, (_, i) => {
        const ms = start + i * DAY_MS;
        const d = new Date(ms);
        const n = counts.get(dayKey(ms)) ?? 0;
        const on = selected === ms;
        return (
          <button
            key={ms}
            type="button"
            onClick={() => onSelect(on ? null : ms)}
            aria-pressed={on}
            className={[
              'flex min-w-0 flex-1 cursor-pointer flex-col items-center rounded-lg border px-1 py-1.5 transition-colors',
              on
                ? 'border-casper-coral bg-casper-coral/10'
                : 'border-casper-border hover:border-casper-muted/50',
            ].join(' ')}
          >
            <span className="text-xs text-casper-muted">
              {d.toLocaleDateString(undefined, { weekday: 'narrow' })}
            </span>
            <span className="mt-0.5 text-xs text-casper-fg tabular-nums">{d.getDate()}</span>
            <span
              aria-hidden
              className={[
                'mt-1 h-1 w-1 rounded-full',
                n > 0 ? 'bg-casper-working' : 'bg-casper-border',
              ].join(' ')}
            />
            <span className="sr-only">
              {n === 0 ? 'nothing scheduled' : `${n} scheduled`}
            </span>
          </button>
        );
      })}
    </div>
  );
};
