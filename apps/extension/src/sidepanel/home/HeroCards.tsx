import { useState } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Comment01Icon,
  DashboardSpeed02Icon,
  PauseIcon,
  PlayIcon,
  RefreshIcon,
  UserAdd01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import type { EngineStatus } from '../useEngineStatus.js';
import type { TodayNumbers } from './useTodayNumbers';
import { pickHeadline } from './headline';

/**
 * The three hero cards at the top of Home: today's wins (orange), the
 * autopilot switch (blue) and today's safe limit (white).
 *
 * The first card and the limit accents take the theme colour; the blue and
 * white cards are fixed. Corners follow Appearance → corner radius.
 */
const THEMED = 'bg-primary text-primary-foreground';
const BLUE = 'bg-[#9DB5F5] text-black';
const WHITE = 'bg-white text-black';
const CARD = 'rounded-4xl p-4 shadow-sm';

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};
const longDate = (d = new Date()) =>
  `${ordinal(d.getDate())} ${d.toLocaleString('en', { month: 'short' })}, ${d.getFullYear()}`;

/** A dashed pill, like a checklist item: the circle fills white once the number is above zero. */
const StatPill = ({ icon, value, label }: { icon: IconSvgElement; value: string; label: string }) => {
  const done = value !== '0' && value !== '—';
  return (
    <div className="flex items-center gap-2.5 rounded-full border-[1.5px] border-dashed border-primary-foreground/45 bg-primary-foreground/12 py-1.5 pr-3 pl-1.5">
      <span
        className={cn(
          'grid size-8 shrink-0 place-items-center rounded-full',
          done ? 'bg-primary-foreground text-primary' : 'bg-primary-foreground/20 text-primary-foreground',
        )}
      >
        <HugeiconsIcon icon={icon} strokeWidth={2.2} className="size-4" />
      </span>
      <span className="flex min-w-0 items-baseline gap-1.5">
        <span className="font-display text-[22px] leading-none font-extrabold tabular-nums">{value}</span>
        <span className="truncate text-[13px] font-medium opacity-85">{label}</span>
      </span>
    </div>
  );
};

const TodayCard = ({ today }: { today: TodayNumbers }) => {
  const gained = today.followersGained;
  const followers = gained === null ? '—' : gained > 0 ? `+${gained}` : String(gained);

  return (
    <section className={cn(CARD, THEMED, 'flex flex-col gap-3')}>
      <div className="flex items-start justify-between gap-2">
        <h2 className="font-display text-[22px] leading-[1.1] font-medium tracking-tight">
          Today’s
          <br />
          Wins
        </h2>
        <button
          type="button"
          onClick={() => void today.reloadGrowth()}
          aria-label="Refresh today’s numbers"
          className="grid size-12 shrink-0 cursor-pointer place-items-center rounded-full bg-primary-foreground/15 transition outline-none hover:bg-primary-foreground/25 focus-visible:ring-3 focus-visible:ring-primary-foreground/40"
        >
          <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className={cn('size-5', today.growthLoading && 'animate-spin')} />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        <StatPill icon={UserGroupIcon} value={followers} label="followers" />
        <StatPill icon={Comment01Icon} value={String(today.replies)} label="replies" />
        <StatPill icon={UserAdd01Icon} value={String(today.follows)} label="follows" />
      </div>
    </section>
  );
};

const AutopilotCard = ({ status, today }: { status: EngineStatus; today: TodayNumbers }) => {
  const paused = status.settings?.isPaused ?? false;
  const [shuffle, setShuffle] = useState(0);
  const [lead, bold] = pickHeadline(
    status.state,
    { spent: today.used, pace: today.fraction, gained: today.followersGained ?? 0 },
    shuffle,
  );
  return (
    <section className={cn(CARD, BLUE, 'flex flex-col')}>
      <p className="font-display text-xs font-semibold">{longDate()}</p>
      <button
        type="button"
        onClick={() => setShuffle((n) => n + 1)}
        title="Tap for another"
        className="mt-2 cursor-pointer text-left font-display text-[25px] leading-[1.08] tracking-[-0.02em] outline-none focus-visible:ring-3 focus-visible:ring-black/20"
      >
        <span className="font-normal">{lead}</span>
        <br />
        <span className="font-extrabold">{bold}</span>
      </button>
      {!paused && status.state === 'attention' && <p className="mt-2 text-xs text-black/60">{status.label}</p>}
      <button
        type="button"
        onClick={() => void status.togglePause()}
        aria-label={paused ? 'Start autopilot' : 'Pause autopilot'}
        className="mt-auto flex h-14 w-full cursor-pointer items-center justify-between rounded-full bg-white pr-1.5 pl-5 font-display text-[17px] font-semibold shadow-sm transition outline-none hover:shadow-md focus-visible:ring-3 focus-visible:ring-black/30 active:scale-[0.98]"
      >
        {paused ? 'Start' : 'Pause'}
        <span className="grid size-11 place-items-center rounded-full bg-black text-white">
          <HugeiconsIcon icon={paused ? PlayIcon : PauseIcon} strokeWidth={2} className="size-5 fill-current" />
        </span>
      </button>
    </section>
  );
};

/** Ring progress: grey track, theme-coloured arc, percentage in the middle. */
const Ring = ({ fraction }: { fraction: number }) => {
  const r = 26;
  const c = 2 * Math.PI * r;
  const f = Math.min(1, Math.max(0, fraction));
  return (
    <div className="relative grid size-[72px] shrink-0 place-items-center">
      <svg viewBox="0 0 64 64" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="32" cy="32" r={r} fill="none" stroke="#D9D9D9" strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={`${c * f} ${c}`}
          className="stroke-primary transition-[stroke-dasharray] duration-700"
        />
      </svg>
      <span className="text-[17px] font-medium tabular-nums">{Math.round(f * 100)}%</span>
    </div>
  );
};

const LimitCard = ({ today }: { today: TodayNumbers }) => {
  const { used, allowance } = today;
  const left = Math.max(0, allowance - used);
  return (
    <section className={cn(CARD, WHITE, 'flex items-center gap-4')}>
      <span className="grid size-16 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
        <HugeiconsIcon icon={DashboardSpeed02Icon} strokeWidth={2} className="size-8" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-display text-[22px] leading-tight font-semibold tracking-tight">Daily Limit</h2>
        <p className="mt-0.5 truncate text-sm text-black/50 tabular-nums">
          {allowance > 0 ? `${used} of ${allowance} used · ${left} left` : 'Starts with the first action'}
        </p>
      </div>
      <Ring fraction={today.fraction} />
    </section>
  );
};

export const HeroCards = ({ status, today }: { status: EngineStatus; today: TodayNumbers }) => {
  return (
    <div className="flex flex-col gap-3 px-4">
      <div className="grid grid-cols-2 gap-3">
        <TodayCard today={today} />
        <AutopilotCard status={status} today={today} />
      </div>
      <LimitCard today={today} />
    </div>
  );
};
