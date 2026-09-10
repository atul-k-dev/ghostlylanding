import type { ReactNode } from 'react';

export interface TopBarAction {
  id: string;
  /** A single glyph. Paired with `label`, which is what screen readers get. */
  icon: ReactNode;
  label: string;
  onClick: () => void;
  /** Renders lit (coral) — a toggle that is currently on. */
  active?: boolean;
  /** Small count on the corner, e.g. replies waiting. Hidden when 0. */
  badge?: number;
}

interface Props {
  title: ReactNode;
  actions: TopBarAction[];
}

/**
 * The bar both modes wear: the side panel's `👤 ⚙ ⏸ →|` and, from Phase 2, the
 * floating brief's `👁 ⏸ ⤢ ✕`. Which glyphs appear is the caller's business —
 * this owns the layout, the hit areas and the badge.
 */
export const TopBar = ({ title, actions }: Props) => (
  <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-casper-border px-3">
    <div className="flex min-w-0 items-center gap-2">
      <span aria-hidden className="text-base leading-none">
        👻
      </span>
      <span className="truncate text-[13px] font-medium text-casper-fg">{title}</span>
    </div>
    <nav className="flex shrink-0 items-center gap-0.5">
      {actions.map((a) => (
        <button
          key={a.id}
          type="button"
          onClick={a.onClick}
          title={a.label}
          aria-label={a.label}
          aria-pressed={a.active}
          className={[
            'relative grid h-7 w-7 cursor-pointer place-items-center rounded-lg text-sm',
            'transition-colors duration-150',
            'focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-casper-coral',
            a.active
              ? 'bg-casper-coral/15 text-casper-coral'
              : 'text-casper-muted hover:bg-casper-surface hover:text-casper-fg',
          ].join(' ')}
        >
          <span aria-hidden>{a.icon}</span>
          {a.badge !== undefined && a.badge > 0 && (
            <span className="absolute -top-0.5 -right-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-casper-attention px-1 text-[10px] leading-none font-semibold text-[#0e0e0e] tabular-nums">
              {a.badge > 9 ? '9+' : a.badge}
            </span>
          )}
        </button>
      ))}
    </nav>
  </header>
);
