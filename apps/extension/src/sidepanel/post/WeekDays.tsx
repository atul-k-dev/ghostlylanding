import { useEffect, useRef } from 'react';
import type { ScheduledPost } from '../../lib/storage.js';
import { cn } from '@/lib/utils';
import { DAY_MS, dayStart } from './usePosts';

/**
 * Two weeks of days as tall pills — weekday on top, the date in a circle —
 * scrolling sideways. The selected day fills with the theme colour. A dot per
 * post under the date: amber for a draft waiting on you, theme colour for
 * scheduled.
 */
const DAYS = 14;

export const WeekDays = ({
  posts,
  selected,
  onSelect,
}: {
  posts: ScheduledPost[];
  selected: number;
  onSelect: (dayStartMs: number) => void;
}) => {
  const start = dayStart(Date.now());
  const strip = useRef<HTMLDivElement>(null);

  // Keep the selected day in view when it's picked from elsewhere (the composer).
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>(`[data-day="${selected}"]`)?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [selected]);

  return (
    <div ref={strip} className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto scroll-px-4 px-4 pb-1">
      {Array.from({ length: DAYS }, (_, i) => {
        const ms = start + i * DAY_MS;
        const d = new Date(ms);
        const on = ms === selected;
        const dayPosts = posts.filter((p) => dayStart(p.scheduledAt) === ms);
        return (
          <button
            key={ms}
            type="button"
            data-day={ms}
            onClick={() => onSelect(ms)}
            aria-pressed={on}
            aria-label={`${d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' })}, ${dayPosts.length} posts`}
            className={cn(
              'flex w-[54px] shrink-0 cursor-pointer snap-start flex-col items-center gap-2 rounded-full pt-3 pb-1.5 transition-all duration-300 outline-none focus-visible:ring-3 focus-visible:ring-ring/40',
              on ? 'bg-primary text-primary-foreground shadow-md' : 'bg-card text-muted-foreground ring-1 ring-[color:var(--card-ring)] hover:text-foreground',
            )}
          >
            <span className="text-[13px] font-medium">{i === 0 ? 'Today' : d.toLocaleDateString([], { weekday: 'short' })}</span>
            {/* Post dots sit inside the date circle, so an empty day has no gap under it. */}
            <span
              className={cn(
                'relative grid size-[42px] place-items-center rounded-full font-display text-base font-bold tabular-nums',
                on ? 'bg-primary-foreground text-primary' : 'bg-muted text-foreground',
              )}
            >
              {String(d.getDate()).padStart(2, '0')}
              {dayPosts.length > 0 && (
                <span className="absolute bottom-[5px] left-1/2 flex -translate-x-1/2 gap-0.5">
                  {dayPosts.slice(0, 3).map((p) => (
                    <span key={p.id} className={cn('size-1 rounded-full', p.status === 'draft' ? 'bg-casper-attention' : 'bg-primary')} />
                  ))}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
};
