import type { ReactNode } from 'react';

interface Props {
  /** Short and specific. Say the thing, don't label the box. */
  title?: ReactNode;
  /** The one button this card is asking for. §3: never a blocked state without it. */
  action?: ReactNode;
  /**
   * `attention` is the "needs you" card. There is only ever ONE of those on
   * screen at a time — see the condition table in 1.7.
   */
  tone?: 'default' | 'attention' | 'working';
  className?: string;
  children?: ReactNode;
}

const TONES: Record<NonNullable<Props['tone']>, string> = {
  default: 'border-casper-border',
  attention: 'border-casper-attention/45 bg-casper-attention/[0.06]',
  working: 'border-casper-working/40 bg-casper-working/[0.05]',
};

export const Card = ({ title, action, tone = 'default', className = '', children }: Props) => (
  <section
    className={[
      'rounded-2xl border bg-casper-surface px-3.5 py-3',
      TONES[tone],
      className,
    ].join(' ')}
  >
    {(title || action) && (
      <header className="mb-2 flex items-start justify-between gap-3">
        {title && <h2 className="text-[13px] leading-snug font-medium text-casper-fg">{title}</h2>}
        {action && <div className="shrink-0">{action}</div>}
      </header>
    )}
    {children}
  </section>
);
