import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** The shell every Home widget sits in — the same card as the status card. */
export const WIDGET = 'rounded-4xl bg-card p-4 text-card-foreground shadow-sm ring-1 ring-[color:var(--card-ring)]';

export const Widget = ({
  title,
  subtitle,
  action,
  className,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
}) => (
  <section className={cn(WIDGET, 'flex flex-col gap-4', className)}>
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <h2 className="font-display text-[17px] font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

/** Two-or-three-way pill switch used in widget headers. */
export const Segmented = <T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (v: T) => void;
}) => (
  <div className="flex shrink-0 rounded-full bg-muted p-1" role="tablist">
    {options.map((o) => (
      <button
        key={o.id}
        type="button"
        role="tab"
        aria-selected={value === o.id}
        onClick={() => onChange(o.id)}
        className={cn(
          'h-7 cursor-pointer rounded-full px-3 text-xs font-medium transition-colors',
          value === o.id ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
        )}
      >
        {o.label}
      </button>
    ))}
  </div>
);

export const Muted = ({ children }: { children: ReactNode }) => (
  <p className="py-4 text-center text-sm text-muted-foreground">{children}</p>
);
