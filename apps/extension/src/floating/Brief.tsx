import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { ArrowExpand01Icon, MinusSignIcon } from '@hugeicons/core-free-icons';
import type { EngineStatus } from '../sidepanel/useEngineStatus.js';
import type { TodayNumbers } from '../sidepanel/home/useTodayNumbers.js';
import { HeroCards } from '../sidepanel/home/HeroCards.js';
import { logoUrl } from './logo.js';

/**
 * The expanded floating card: Home's hero cards — today's wins, the autopilot
 * card with Start/Pause, the daily limit — the very same component, so the two
 * never drift. Anything deeper is one tap away in the side panel.
 */
const IconButton = ({ icon, label, onClick }: { icon: IconSvgElement; label: string; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    onPointerDown={(e) => e.stopPropagation()}
    title={label}
    aria-label={label}
    className="grid size-8 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/8 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:outline-none"
  >
    <HugeiconsIcon icon={icon} strokeWidth={2} className="size-4" />
  </button>
);

export const Brief = ({
  status,
  today,
  extra,
  onDragStart,
  onExpand,
  onMinimize,
}: {
  status: EngineStatus;
  today: TodayNumbers;
  /** Contextual cards above the hero (the "Reply for me" draft, the Alt+G note). */
  extra?: ReactNode;
  onDragStart: (e: ReactPointerEvent) => void;
  onExpand: () => void;
  onMinimize: () => void;
}) => (
  <div className="flex flex-col pb-4">
    {/* Header — also the drag handle. */}
    <div onPointerDown={onDragStart} className="flex cursor-grab touch-none items-center gap-2 px-4 pt-3.5 pb-3 select-none active:cursor-grabbing">
      <img src={logoUrl()} alt="" className="size-7 object-contain" draggable={false} />
      <span className="flex-1 font-display text-[15px] font-bold tracking-tight">Ghostly</span>
      <IconButton icon={ArrowExpand01Icon} label="Open the full panel" onClick={onExpand} />
      <IconButton icon={MinusSignIcon} label="Minimize" onClick={onMinimize} />
    </div>

    {extra && <div className="flex flex-col gap-3 px-4 pb-3 empty:hidden">{extra}</div>}

    <HeroCards status={status} today={today} />
  </div>
);
