import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { AiChat02Icon, Home09Icon, QuillWrite02Icon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

export type PageId = 'home' | 'post' | 'ask';

const ITEMS: readonly { id: PageId; label: string; icon: IconSvgElement }[] = [
  { id: 'home', label: 'Home', icon: Home09Icon },
  { id: 'post', label: 'Post', icon: QuillWrite02Icon },
  { id: 'ask', label: 'Ask', icon: AiChat02Icon },
];

/**
 * Floating dock at the bottom of the panel; the active page shows its label.
 * Inverted (foreground-coloured) so it never blends into the canvas or a card
 * in either theme; the active item takes the theme colour.
 */
export const BottomNav = ({ active, onChange }: { active: PageId; onChange: (id: PageId) => void }) => (
  <nav className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-4">
    <div className="pointer-events-auto flex items-center gap-1 rounded-full bg-foreground p-1.5 text-background shadow-2xl shadow-black/30 ring-1 ring-background/10">
      {ITEMS.map((item) => {
        const on = item.id === active;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            aria-label={item.label}
            aria-current={on ? 'page' : undefined}
            className={cn(
              'flex h-11 cursor-pointer items-center gap-2 rounded-full px-4 font-display text-sm font-bold transition-all outline-none focus-visible:ring-3 focus-visible:ring-background/40',
              on ? 'bg-background px-5 text-primary' : 'text-background/60 hover:bg-background/10 hover:text-background',
            )}
          >
            <HugeiconsIcon icon={item.icon} strokeWidth={2} className="size-5" />
            {on && <span>{item.label}</span>}
          </button>
        );
      })}
    </div>
  </nav>
);
