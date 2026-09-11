import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight02Icon } from '@hugeicons/core-free-icons';
import { STEPS } from './useOnboarding';

/**
 * "Finish setting up" — shown on Home and at the top of Settings while setup
 * isn't done, so skipping onboarding never means losing it.
 */
export const SetupCard = ({ fraction, onOpen }: { fraction: number; onOpen: () => void }) => {
  const r = 22;
  const c = 2 * Math.PI * r;
  const step = Math.round(fraction * (STEPS.length - 1)) + 1;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full cursor-pointer items-center gap-4 rounded-4xl bg-primary p-4 text-left text-primary-foreground shadow-sm transition active:scale-[0.99]"
    >
      <span className="relative grid size-14 shrink-0 place-items-center">
        <svg viewBox="0 0 52 52" className="absolute inset-0 -rotate-90" aria-hidden>
          <circle cx="26" cy="26" r={r} fill="none" strokeWidth="5" className="stroke-primary-foreground/20" />
          <circle cx="26" cy="26" r={r} fill="none" strokeWidth="5" strokeLinecap="round" strokeDasharray={`${c * Math.max(0.04, fraction)} ${c}`} className="stroke-primary-foreground" />
        </svg>
        <span className="font-display text-sm font-extrabold tabular-nums">{Math.round(fraction * 100)}%</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-display text-[16px] leading-tight font-extrabold">Finish setting up Ghostly</span>
        <span className="mt-0.5 block text-sm opacity-80">
          {fraction === 0 ? 'About three minutes — so I can work at my best.' : `Pick up at step ${step} of ${STEPS.length}.`}
        </span>
      </span>
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary-foreground text-primary">
        <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2.2} className="size-5" />
      </span>
    </button>
  );
};
