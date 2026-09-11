import type { ButtonHTMLAttributes, ReactNode } from 'react';

/**
 * Variants map to §3's colour rules, not to a generic design system:
 *
 *   primary     coral text on a 12% coral tint, coral hairline — the one action
 *               a card is asking for.
 *   destructive coral as a SOLID fill with dark text. Weight, not hue: coral
 *               already occupies red, so a second red would read as a bug.
 *   secondary   surface fill, hairline border — everything reversible.
 *   ghost       no chrome at all — toolbar icons, inline "not now".
 */
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-casper-coral/12 text-casper-coral border border-casper-coral/40 ' +
    'hover:bg-casper-coral/20 hover:border-casper-coral/60',
  secondary:
    'bg-casper-surface text-casper-fg border border-casper-border ' +
    'hover:border-casper-muted/50 hover:bg-casper-surface-2',
  ghost:
    'bg-transparent text-casper-muted border border-transparent ' +
    'hover:text-casper-fg hover:bg-casper-surface',
  destructive:
    'bg-casper-coral text-casper-on-coral border border-casper-coral font-medium ' +
    'hover:bg-casper-coral-bright hover:border-casper-coral-bright',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** `sm` is 12px — the floor from §3. Nothing in this UI goes below it. */
  size?: 'sm' | 'md';
  full?: boolean;
  children: ReactNode;
}

export const Button = ({
  variant = 'secondary',
  size = 'md',
  full = false,
  className = '',
  children,
  ...rest
}: Props) => (
  <button
    type="button"
    className={[
      'inline-flex items-center justify-center gap-1.5 rounded-lg whitespace-nowrap',
      'transition-colors duration-150 cursor-pointer',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-casper-coral',
      'disabled:cursor-not-allowed disabled:opacity-45',
      size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]',
      full ? 'w-full' : '',
      VARIANTS[variant],
      className,
    ].join(' ')}
    {...rest}
  >
    {children}
  </button>
);
