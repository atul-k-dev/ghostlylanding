export interface TabSpec<Id extends string = string> {
  id: Id;
  label: string;
  /** Shown beside the label when non-zero. A tab never shows a zero count. */
  badge?: number;
}

interface Props<Id extends string> {
  tabs: readonly TabSpec<Id>[];
  active: Id;
  onChange: (id: Id) => void;
}

/**
 * Five tabs at 400px, and the panel resizes down to ~320px, so labels shrink
 * rather than wrap or scroll sideways: 12px is the floor (§3) and the row
 * distributes whatever is left.
 */
export const TabBar = <Id extends string>({ tabs, active, onChange }: Props<Id>) => (
  <div
    role="tablist"
    className="flex shrink-0 items-stretch gap-0.5 border-b border-casper-border px-1.5"
  >
    {tabs.map((t) => {
      const on = t.id === active;
      return (
        <button
          key={t.id}
          role="tab"
          type="button"
          aria-selected={on}
          onClick={() => onChange(t.id)}
          className={[
            'relative min-w-0 flex-1 cursor-pointer px-1 pt-2 pb-1.5 text-xs whitespace-nowrap',
            'transition-colors duration-150',
            'focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-casper-coral',
            on ? 'text-casper-fg' : 'text-casper-muted hover:text-casper-fg',
          ].join(' ')}
        >
          <span className="truncate">{t.label}</span>
          {t.badge !== undefined && t.badge > 0 && (
            <span className="ml-1 rounded-full bg-casper-attention/20 px-1 text-[11px] font-semibold text-casper-attention tabular-nums">
              {t.badge}
            </span>
          )}
          <span
            aria-hidden
            className={[
              'absolute inset-x-1 -bottom-px h-0.5 rounded-full transition-opacity duration-150',
              on ? 'bg-casper-coral opacity-100' : 'opacity-0',
            ].join(' ')}
          />
        </button>
      );
    })}
  </div>
);
