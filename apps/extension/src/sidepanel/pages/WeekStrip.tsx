import type { ScheduledPost } from '../../lib/storage.js';

/**
 * The next seven days, with what is scheduled on each.
 *
 * Replaces the flat chronological list (updateplan 1.6). A list answers "what
 * is queued"; the thing a creator actually needs to see is which days are EMPTY
 * — that is the question that makes them write something.
 *
 * Filled in by 3.4: a day with a draft on it says so, and an empty day is not
 * just a dim dot any more — it offers to fill itself. The gap and the button
 * that closes it are the same control, because a gap you can't act on is just
 * a reproach.
 */
const DAY_MS = 86_400_000;

const dayKey = (ms: number): string => new Date(ms).toDateString();

export const WeekStrip = ({
  posts,
  selected,
  onSelect,
  onAskFor,
  busyDay = null,
}: {
  posts: ScheduledPost[];
  /** Day-start ms of the selected day, or null for "everything". */
  selected: number | null;
  onSelect: (dayStartMs: number | null) => void;
  /** Fill an empty day. Omit to render the strip read-only. */
  onAskFor?: (dayStartMs: number) => void;
  /** Day currently being written for, so its cell can say so. */
  busyDay?: number | null;
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = today.getTime();

  const counts = new Map<string, { total: number; drafts: number }>();
  for (const p of posts) {
    const k = dayKey(p.scheduledAt);
    const cur = counts.get(k) ?? { total: 0, drafts: 0 };
    counts.set(k, {
      total: cur.total + 1,
      drafts: cur.drafts + (p.status === 'draft' ? 1 : 0),
    });
  }

  return (
    <div className="flex gap-1">
      {Array.from({ length: 7 }, (_, i) => {
        const ms = start + i * DAY_MS;
        const d = new Date(ms);
        const { total: n, drafts } = counts.get(dayKey(ms)) ?? { total: 0, drafts: 0 };
        const on = selected === ms;
        const busy = busyDay === ms;
        return (
          <div key={ms} className="flex min-w-0 flex-1 flex-col gap-1">
            <button
              type="button"
              onClick={() => onSelect(on ? null : ms)}
              aria-pressed={on}
              className={[
                'flex min-w-0 cursor-pointer flex-col items-center rounded-lg border px-1 py-1.5 transition-colors',
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
                  drafts > 0
                    ? 'bg-casper-attention'
                    : n > 0
                      ? 'bg-casper-working'
                      : 'bg-casper-border',
                ].join(' ')}
              />
              <span className="sr-only">
                {n === 0
                  ? 'nothing scheduled'
                  : drafts > 0
                    ? `${n} scheduled, ${drafts} waiting for you`
                    : `${n} scheduled`}
              </span>
            </button>
            {/*
              An empty day offers to fill itself. The plan's "+ Ask Ghostly for
              one" lives here rather than as a separate row, so the gap and the
              fix are the same thing you are already looking at.
            */}
            {onAskFor && n === 0 && (
              <button
                type="button"
                onClick={() => onAskFor(ms)}
                disabled={busy}
                title={`Ask Ghostly for a post on ${d.toLocaleDateString(undefined, {
                  weekday: 'long',
                })}`}
                className="rounded-md border border-dashed border-casper-border py-0.5 text-xs text-casper-muted transition hover:border-casper-coral hover:text-casper-coral disabled:opacity-40"
              >
                {busy ? '…' : '+'}
                <span className="sr-only">
                  Ask Ghostly for a post on{' '}
                  {d.toLocaleDateString(undefined, { weekday: 'long' })}
                </span>
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
};
