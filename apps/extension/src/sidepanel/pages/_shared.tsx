import type { CommentLength, PostLength, Platform, ActionType } from '@casper/shared';
import type { ScheduledPost } from '../../lib/storage.js';

/**
 * The small pieces the ported pages share.
 *
 * These came across from `popup/views/Dashboard.tsx` when it was dismantled in
 * updateplan 1.6. They are here rather than in `src/ui/` because they are not
 * part of the two-mode component library — the floating panel has no use for a
 * scheduled-post status map — and putting them there would blur what `src/ui`
 * is for.
 */

/** One row of the action log, as the server returns it. */
export interface ActionLogEntry {
  id: string;
  platform: Platform;
  actionType: ActionType;
  targetUrl: string;
  targetHandle: string | null;
  success: boolean;
  errorMessage: string | null;
  timestamp: string;
}

export const Section = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl bg-casper-surface p-3 border border-casper-border">
    <p className="font-medium text-casper-ink">{title}</p>
    {subtitle && <p className="mb-2 text-xs text-casper-ink/50">{subtitle}</p>}
    {children}
  </div>
);


export const NumberField = ({
  label,
  value,
  onChange,
  min = 0,
  max = 23,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) => (
  <label className="flex flex-col gap-1 text-xs">
    <span className="text-casper-ink/60">{label}</span>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-sm focus:border-casper-violet focus:outline-none"
    />
  </label>
);


export const COMMENT_LENGTH_LABELS: Record<CommentLength, string> = {
  1: '1 line · 8–10 words',
  2: '2 lines · ~20 words',
  3: '3 lines · ~35 words',
};


export const formatRelative = (iso: string): string => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
};

export const formatWhen = (ms: number): string =>
  new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

export const POST_LENGTHS: { id: PostLength; label: string }[] = [
  { id: 'short', label: 'Short · 280' },
  { id: 'mid', label: 'Medium · 1k' },
  { id: 'long', label: 'Long · 4k' },
];

export const POST_STATUS: Record<ScheduledPost['status'], { label: string; cls: string }> = {
  // A draft is waiting on the user, not on the clock — amber, the colour this
  // product uses for "needs a human", never the calm scheduled violet.
  draft: { label: 'Waiting for you', cls: 'bg-casper-attention/15 text-casper-attention' },
  scheduled: { label: 'Scheduled', cls: 'bg-casper-violet/15 text-casper-violet' },
  publishing: { label: 'Posting…', cls: 'bg-amber-500/15 text-amber-300' },
  posted: { label: 'Posted', cls: 'bg-emerald-500/15 text-emerald-300' },
  failed: { label: 'Failed', cls: 'bg-rose-500/15 text-rose-300' },
};


export const fmtNum = (n: number): string => n.toLocaleString();

export const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const BookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5v-10Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h5.5a1.5 1.5 0 0 0 1.5-1.5v-10Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
);


export const SUPPORT_EMAIL = 'support@ghostly247.com';

export const MailSmallIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="m4 7 8 6 8-6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* -- Review ---------------------------------------------------------------
 * The approval queue. Each card shows the post being answered next to the
 * reply Ghostly wrote, editable in place — because the whole point is that
 * nothing goes out under the user's name until they've read it.
 * ---------------------------------------------------------------------- */

