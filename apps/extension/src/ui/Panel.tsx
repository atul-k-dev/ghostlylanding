import type { ReactNode } from 'react';

/**
 * The frame both modes share: a fixed top bar and tab bar, a body that scrolls
 * on its own, and a status bar pinned to the bottom.
 *
 * The body is the ONLY scroll container. In the side panel the window is the
 * viewport; in Phase 2's floating brief the whole thing lives in a ~360×520 box
 * on someone else's page — and if the bars scrolled away there, the pause
 * button would scroll away with them.
 */
interface Props {
  top?: ReactNode;
  tabs?: ReactNode;
  status?: ReactNode;
  children: ReactNode;
  className?: string;
}

export const Panel = ({ top, tabs, status, children, className = '' }: Props) => (
  <div
    className={[
      'casper-app flex h-full min-h-0 w-full flex-col overflow-hidden',
      'bg-casper-bg text-casper-fg',
      className,
    ].join(' ')}
  >
    {top}
    {tabs}
    <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">{children}</main>
    {status}
  </div>
);
