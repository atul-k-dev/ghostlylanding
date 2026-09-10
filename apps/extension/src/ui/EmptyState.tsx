import type { ReactNode } from 'react';

/**
 * Nothing here — and why, plus the button that changes it.
 *
 * §3: never show a blocked state without the thing that unblocks it. When there
 * genuinely is no action (a feature that has not shipped yet), say when it
 * arrives rather than inventing a button that does nothing.
 */
interface Props {
  icon?: ReactNode;
  title: string;
  body?: ReactNode;
  action?: ReactNode;
}

export const EmptyState = ({ icon = '👻', title, body, action }: Props) => (
  <div className="flex flex-col items-center px-6 py-10 text-center">
    <span aria-hidden className="text-2xl opacity-70">
      {icon}
    </span>
    <p className="mt-3 text-[13px] font-medium text-casper-fg">{title}</p>
    {body && <p className="mt-1.5 max-w-[34ch] text-xs leading-relaxed text-casper-muted">{body}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);
