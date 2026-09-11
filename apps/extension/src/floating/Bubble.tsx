import type { PointerEvent as ReactPointerEvent } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { Alert02Icon, CheckmarkCircle02Icon, GhostIcon, HourglassIcon, Moon02Icon, PauseIcon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import type { EngineStatus } from '../sidepanel/useEngineStatus.js';
import type { LiveActivity } from '../sidepanel/home/useLiveActivity.js';
import { lookOf, span } from '../sidepanel/home/StatusCard.js';

/**
 * The bubble on x.com — Ghostly's state at a glance, without opening anything.
 *
 *  · ring   — spins while it works; drains as a countdown while it waits
 *             between moves; otherwise shows how much of today's limit is used.
 *             Amber and pulsing when something needs you.
 *  · centre — the activity itself (scrolling bobs, searching roams, liking
 *             beats…), a pause glyph, or the ghost breathing while it watches.
 *  · badge  — replies waiting for your approval.
 *  · hover  — a chip with the live status line.
 */
export const BUBBLE_PX = 60;
const R = 27;
const C = 2 * Math.PI * R;

export const statusLine = (status: EngineStatus, live: LiveActivity): string => {
  if (status.state === 'attention') return status.label;
  if (live.mode === 'running' && live.task) {
    const l = lookOf(live.task);
    return `${l.verb} ${l.detail}`;
  }
  if (live.mode === 'paused') return 'Paused — tap to start';
  if (live.mode === 'waiting' && live.until) {
    if (live.reason === 'outside-hours' || live.reason === 'caps-spent') {
      return `Back at ${new Date(live.until).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    }
    return `Next move in ${span(live.until - live.now)}`;
  }
  return 'Watching for the next good post';
};

export const Bubble = ({
  status,
  live,
  fraction,
  waiting,
  chipSide,
  onPointerDown,
  onClick,
}: {
  status: EngineStatus;
  live: LiveActivity;
  /** 0–1 of today's limit, shown when nothing else is going on. */
  fraction: number;
  waiting: number;
  chipSide: 'left' | 'right';
  onPointerDown: (e: ReactPointerEvent) => void;
  onClick: () => void;
}) => {
  const attention = status.state === 'attention';
  const running = live.mode === 'running';
  const paused = live.mode === 'paused';
  const waitingFor = live.mode === 'waiting' && live.until ? Math.min(1, Math.max(0, (live.until - live.now) / Math.max(1, live.until - live.since))) : null;

  const look = live.task ? lookOf(live.task) : null;
  const icon = attention
    ? Alert02Icon
    : look?.icon ??
      (paused ? PauseIcon : live.reason === 'outside-hours' ? Moon02Icon : live.reason === 'caps-spent' ? CheckmarkCircle02Icon : live.mode === 'waiting' ? HourglassIcon : GhostIcon);
  const motion = attention
    ? ''
    : look?.motion ??
      (live.mode === 'waiting' && !live.reason
        ? 'animate-[ghost-flip_3s_ease-in-out_infinite]'
        : live.mode === 'idle'
          ? 'animate-[ghost-breathe_2.6s_ease-in-out_infinite]'
          : '');

  // What the ring shows, in order of what matters most right now.
  const arc = attention ? 1 : running ? 0.28 : waitingFor ?? (paused ? 0 : fraction);
  const line = statusLine(status, live);

  return (
    <div className="group relative" style={{ width: BUBBLE_PX, height: BUBBLE_PX }}>
      <button
        type="button"
        title={`Ghostly — ${line}`}
        aria-label={`Ghostly — ${line}. Open the panel.`}
        onPointerDown={onPointerDown}
        onClick={onClick}
        className="ghost-motion relative grid size-full cursor-pointer touch-none place-items-center rounded-full bg-card shadow-xl ring-1 ring-[color:var(--card-ring)] transition-transform duration-200 outline-none hover:scale-105 focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95"
      >
        <svg viewBox="0 0 60 60" className={cn('absolute inset-0 -rotate-90', running && 'animate-spin [animation-duration:1.4s]')} aria-hidden>
          <circle cx="30" cy="30" r={R} fill="none" strokeWidth="3.5" className="stroke-foreground/10" />
          <circle
            cx="30"
            cy="30"
            r={R}
            fill="none"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${C * arc} ${C}`}
            className={cn(
              'transition-[stroke-dasharray] duration-1000 ease-linear',
              attention ? 'animate-pulse stroke-casper-attention' : 'stroke-primary',
            )}
          />
        </svg>
        <span
          className={cn(
            'relative grid size-[42px] place-items-center rounded-full transition-colors',
            paused ? 'bg-muted text-muted-foreground' : attention ? 'bg-casper-attention text-white' : 'bg-primary text-primary-foreground',
          )}
        >
          <HugeiconsIcon icon={icon} strokeWidth={2} className={cn('size-5', motion)} />
        </span>
      </button>

      {waiting > 0 && (
        <span className="pointer-events-none absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground tabular-nums shadow ring-2 ring-card">
          {waiting > 9 ? '9+' : waiting}
        </span>
      )}

      {/* The live status, on hover — on whichever side has room. */}
      <span
        role="status"
        className={cn(
          'pointer-events-none absolute top-1/2 flex max-w-[240px] -translate-y-1/2 items-center gap-2 rounded-full bg-foreground py-2 pr-3.5 pl-3 text-xs font-medium whitespace-nowrap text-background opacity-0 shadow-lg transition-all duration-200 group-hover:opacity-100',
          chipSide === 'left' ? 'right-full mr-3 translate-x-1 group-hover:translate-x-0' : 'left-full ml-3 -translate-x-1 group-hover:translate-x-0',
        )}
      >
        <span className={cn('size-2 shrink-0 rounded-full', attention ? 'bg-casper-attention' : running ? 'animate-pulse bg-casper-working' : 'bg-background/40')} />
        <span className="truncate">{line}</span>
      </span>
    </div>
  );
};
