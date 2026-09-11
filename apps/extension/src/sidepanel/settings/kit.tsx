import type { ReactNode } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { ArrowLeft01Icon, ArrowRight01Icon, FlashIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

/**
 * The grouped-list kit Settings is built from: a large title, uppercase group
 * labels, rounded cards of rows with inset hairlines. Built on shadcn parts and
 * theme tokens only, so it follows Appearance (mode, base and theme colour).
 */
export const Screen = ({
  title,
  backLabel,
  onBack,
  children,
}: {
  title: string;
  backLabel: string;
  onBack: () => void;
  children: ReactNode;
}) => (
  <div className="flex h-full min-h-0 flex-col bg-canvas text-foreground">
    <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-10">
      <div className="flex items-center gap-1 pt-5 pb-6">
        <Button
          variant="ghost"
          size="icon-lg"
          onClick={onBack}
          aria-label={`Back to ${backLabel}`}
          className="-ml-2 shrink-0 rounded-full"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2.2} className="size-7" />
        </Button>
        <h1 className="min-w-0 truncate font-heading text-[32px] leading-tight font-bold tracking-tight">{title}</h1>
      </div>
      <div className="flex flex-col gap-7">{children}</div>
    </main>
  </div>
);

/** Hairline between rows, inset the same distance from both edges. */
const DIVIDER =
  'relative after:pointer-events-none after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-(--divider) last:after:hidden';

/** The card outline follows Appearance → borders (via --card-ring). */
const CARD = 'gap-0 rounded-2xl py-0 shadow-sm ring-[color:var(--card-ring)] dark:ring-[color:var(--card-ring)]';

export const Group = ({
  label,
  footer,
  children,
  className,
}: {
  label?: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className="flex flex-col gap-2">
    {label && (
      <h2 className="px-4 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">{label}</h2>
    )}
    <Card className={cn(CARD, className)}>{children}</Card>
    {footer && <div className="px-4 text-xs leading-relaxed text-muted-foreground">{footer}</div>}
  </section>
);

/** Free-form content inside a Group (inputs, lists) with the row's padding. */
export const Pad = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cn(DIVIDER, 'px-4 py-3.5', className)}>{children}</div>
);

interface RowProps {
  icon?: IconSvgElement;
  label: ReactNode;
  /** Muted text on the right — the current value. */
  value?: ReactNode;
  /** A second, smaller line under the label. */
  hint?: ReactNode;
  /** Makes the row a button with a chevron. */
  onClick?: () => void;
  /** Puts a switch on the right instead of a chevron. */
  toggle?: { checked: boolean; onChange: (next: boolean) => void };
  /** A checkmark on the right — for pick-one lists. */
  selected?: boolean;
  /** Anything else on the right (small buttons). */
  trailing?: ReactNode;
  danger?: boolean;
}

export const Row = ({ icon, label, value, hint, onClick, toggle, selected, trailing, danger }: RowProps) => {
  const body = (
    <>
      {icon && (
        <HugeiconsIcon
          icon={icon}
          strokeWidth={1.6}
          className={cn('size-[22px] shrink-0', danger ? 'text-destructive' : 'text-foreground/80')}
        />
      )}
      <div className="flex min-h-[52px] min-w-0 flex-1 items-center gap-3 py-3">
        <div className="min-w-0 flex-1">
          <div className={cn('text-[15px] leading-snug', danger ? 'text-destructive' : 'text-foreground')}>{label}</div>
          {hint && <div className="mt-0.5 text-xs leading-snug text-muted-foreground">{hint}</div>}
        </div>
        {value !== undefined && (
          <span className="max-w-[55%] truncate text-[15px] text-muted-foreground">{value}</span>
        )}
        {trailing}
        {toggle && (
          <Switch
            checked={toggle.checked}
            onCheckedChange={(next) => toggle.onChange(next)}
            aria-label={typeof label === 'string' ? label : undefined}
          />
        )}
        {selected !== undefined && (
          <HugeiconsIcon
            icon={Tick02Icon}
            strokeWidth={2.4}
            className={cn('size-5 shrink-0 text-primary', !selected && 'invisible')}
          />
        )}
        {onClick && !toggle && selected === undefined && (
          <HugeiconsIcon icon={ArrowRight01Icon} strokeWidth={2} className="size-5 shrink-0 text-muted-foreground/70" />
        )}
      </div>
    </>
  );
  const base = cn(DIVIDER, 'flex w-full items-center gap-3 px-4 text-left');
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className={cn(base, 'cursor-pointer outline-none transition-colors hover:bg-muted/50 focus-visible:bg-muted active:bg-muted')}
    >
      {body}
    </button>
  ) : (
    <div className={base}>{body}</div>
  );
};

export const ProBadge = () => <Badge className="font-extrabold tracking-wider">PRO</Badge>;

/** The full-width primary action under a group. */
export const AccentButton = ({
  children,
  onClick,
  disabled,
  icon = FlashIcon,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  icon?: IconSvgElement | null;
}) => (
  <Button size="lg" className="h-12 w-full rounded-xl text-base font-semibold" onClick={onClick} disabled={disabled}>
    {icon && <HugeiconsIcon icon={icon} strokeWidth={2.2} data-icon="inline-start" className="size-5" />}
    {children}
  </Button>
);

export const UpgradeCard = ({ onUpgrade }: { onUpgrade: () => void }) => (
  <Card className={cn(CARD, 'relative p-4')}>
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_55%_at_0%_0%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent),radial-gradient(45%_65%_at_100%_0%,color-mix(in_oklch,var(--chart-2)_14%,transparent),transparent),radial-gradient(55%_45%_at_50%_100%,color-mix(in_oklch,var(--chart-4)_10%,transparent),transparent)]"
    />
    <div className="relative">
      <h3 className="flex items-center gap-2 text-[21px] font-bold tracking-tight">
        Upgrade to <ProBadge />
      </h3>
      <p className="mt-2 text-[15px] leading-snug text-muted-foreground">
        Every feature works on Free. Pro lifts the monthly limit on how many actions I take for you.
      </p>
      <div className="mt-4">
        <AccentButton onClick={onUpgrade}>Upgrade</AccentButton>
      </div>
    </div>
  </Card>
);
