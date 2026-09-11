import { useState, type FC } from 'react';
import type { User } from '@casper/shared';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  AiMagicIcon,
  ArrowLeft01Icon,
  ArrowRight02Icon,
  DashboardSpeed02Icon,
  Flag01Icon,
  Mic01Icon,
  NewTwitterIcon,
  PaintBoardIcon,
  PlayIcon,
  QuillWrite02Icon,
  SparklesIcon,
  Tag01Icon,
  TestTubeIcon,
  UserSearch01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { firstName } from '../shell/user';
import { useSettingsStore } from '../settings/useSettingsStore';
import {
  AccountStep,
  ActionsStep,
  GoalStep,
  LookStep,
  PaceStep,
  PeopleStep,
  PostingStep,
  PreviewStep,
  ReadySummary,
  TopicsStep,
  VoiceStep,
  WelcomeStep,
  type StepCtx,
} from './steps';
import { STEPS, useOnboarding, type StepId } from './useOnboarding';

/**
 * Onboarding — from "just installed" to "Ghostly is working, the way I want"
 * in one pass. Twelve short steps; the optional ones can be skipped one by one,
 * and the whole thing can be left for later (Settings offers to finish it).
 * Every choice is written to settings the moment it's made.
 */
interface StepDef {
  icon: IconSvgElement;
  title: (name: string) => string;
  subtitle: string;
  optional?: boolean;
  Body: FC<StepCtx>;
}

const DEFS: Record<StepId, StepDef> = {
  welcome: {
    icon: SparklesIcon,
    title: (n) => `Hi ${n}, meet Ghostly`,
    subtitle: 'Your growth copilot for X. Let’s set it up in about three minutes.',
    Body: WelcomeStep,
  },
  goal: { icon: Flag01Icon, title: () => 'What do you want from X?', subtitle: 'Pick all that fit — I’ll tune everything around them.', Body: GoalStep },
  account: {
    icon: NewTwitterIcon,
    title: () => 'Let me read your account',
    subtitle: 'So I can suggest topics and people — instead of making you type them.',
    Body: AccountStep,
  },
  topics: {
    icon: Tag01Icon,
    title: () => 'What should I engage with?',
    subtitle: 'The topics your audience cares about, where to find them — and what to stay away from.',
    Body: TopicsStep,
  },
  people: {
    icon: UserSearch01Icon,
    title: () => 'Who should I watch?',
    subtitle: 'Creators whose audience you want. I’ll reply early on their posts.',
    optional: true,
    Body: PeopleStep,
  },
  actions: { icon: AiMagicIcon, title: () => 'What should I do?', subtitle: 'Pick how I engage on your behalf.', Body: ActionsStep },
  voice: { icon: Mic01Icon, title: () => 'How should replies sound?', subtitle: 'Your voice, your tone, your length.', Body: VoiceStep },
  posting: {
    icon: QuillWrite02Icon,
    title: () => 'Should I write posts too?',
    subtitle: 'Staying active on your own profile is half of growing.',
    optional: true,
    Body: PostingStep,
  },
  pace: {
    icon: DashboardSpeed02Icon,
    title: () => 'How fast, and when?',
    subtitle: 'Safe limits and working hours keep your account healthy.',
    Body: PaceStep,
  },
  look: { icon: PaintBoardIcon, title: () => 'Make it yours', subtitle: 'Light or dark, and a colour you like.', optional: true, Body: LookStep },
  preview: {
    icon: TestTubeIcon,
    title: () => 'See it before it acts',
    subtitle: 'A dry run on your real feed — nothing is liked, followed or posted.',
    optional: true,
    Body: PreviewStep,
  },
  ready: { icon: PlayIcon, title: () => 'You’re all set', subtitle: 'Here’s how I’ll work for you.', Body: ReadySummary },
};

export const Onboarding = ({ user, onFinish, onLater }: { user: User; onFinish: () => void; onLater: () => void }) => {
  const { settings, update } = useSettingsStore();
  const onboarding = useOnboarding();
  const [busy, setBusy] = useState(false);
  const [starting, setStarting] = useState<'start' | 'paused' | null>(null);

  if (!settings || !onboarding.progress) return <div className="h-full bg-canvas" />;

  const step = onboarding.progress.step;
  const index = STEPS.indexOf(step);
  const def = DEFS[step];
  const name = firstName(user.name, user.email);
  const go = (to: StepId) => onboarding.save({ step: to });
  const next = () => index < STEPS.length - 1 && go(STEPS[index + 1]!);
  const back = () => index > 0 && go(STEPS[index - 1]!);

  const later = () => {
    onboarding.save({ skippedAt: Date.now() });
    onLater();
  };

  /** The end: mark setup complete and, unless they'd rather wait, switch on. */
  const finish = async (start: boolean) => {
    setStarting(start ? 'start' : 'paused');
    update({ ...settings, setupCompletedAt: new Date().toISOString(), isPaused: !start });
    await onboarding.save({ step: 'welcome', skippedAt: null });
    onFinish();
  };

  const ctx: StepCtx = {
    s: settings,
    update,
    user,
    goals: onboarding.progress.goals,
    setGoals: (goals) => onboarding.save({ goals }),
    setBusy,
  };

  const canContinue = !busy && !(step === 'goal' && onboarding.progress.goals.length === 0);

  return (
    <div className="flex h-full min-h-0 flex-col bg-canvas text-foreground">
      {/* Progress + navigation */}
      <div className="shrink-0 px-4 pt-4">
        <div className="flex h-9 items-center gap-2">
          {index > 0 ? (
            <button type="button" onClick={back} disabled={busy} aria-label="Back" className="-ml-2 grid size-9 cursor-pointer place-items-center rounded-full transition hover:bg-foreground/5 disabled:opacity-40">
              <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2.2} className="size-5" />
            </button>
          ) : (
            <span className="size-9" />
          )}
          <div className="flex flex-1 gap-1" aria-label={`Step ${index + 1} of ${STEPS.length}`}>
            {STEPS.map((id, i) => (
              <span key={id} className={cn('h-1.5 flex-1 rounded-full transition-colors duration-500', i <= index ? 'bg-primary' : 'bg-foreground/10')} />
            ))}
          </div>
          {step !== 'ready' && (
            <button
              type="button"
              onClick={def.optional ? next : later}
              disabled={busy}
              className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground disabled:opacity-40"
            >
              {def.optional ? 'Skip' : 'Later'}
            </button>
          )}
        </div>
      </div>

      {/* The step */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
        <div key={step} className="animate-in fade-in slide-in-from-right-4 duration-300">
          <div className="mt-5 mb-6 flex flex-col items-start">
            <span className="relative mb-4 grid size-14 place-items-center rounded-[1.25rem] bg-primary text-primary-foreground shadow-md ring-8 ring-primary/15">
              <HugeiconsIcon icon={def.icon} strokeWidth={2} className="size-7" />
            </span>
            <p className="text-xs font-semibold tracking-wide text-primary uppercase">
              Step {index + 1} of {STEPS.length}
              {def.optional && ' · optional'}
            </p>
            <h1 className="mt-1 font-display text-[26px] leading-tight font-extrabold tracking-tight">{def.title(name)}</h1>
            <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{def.subtitle}</p>
          </div>
          <def.Body {...ctx} />
        </div>
      </div>

      {/* Continue */}
      <div className="shrink-0 border-t border-foreground/5 bg-canvas/90 px-5 pt-3 pb-4 backdrop-blur">
        {step === 'ready' ? (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => void finish(true)}
              disabled={starting !== null}
              className="flex h-13 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-display text-base font-bold text-primary-foreground shadow-md transition hover:bg-primary/90 active:scale-[0.99] disabled:opacity-60"
            >
              <HugeiconsIcon icon={PlayIcon} strokeWidth={2} className="size-5 fill-current" />
              {starting === 'start' ? 'Starting…' : 'Start Ghostly'}
            </button>
            <button
              type="button"
              onClick={() => void finish(false)}
              disabled={starting !== null}
              className="h-10 cursor-pointer rounded-2xl text-sm font-semibold text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
            >
              Finish without starting
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={next}
              disabled={!canContinue}
              className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary font-display text-[15px] font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.99] disabled:cursor-default disabled:opacity-50"
            >
              {step === 'welcome' ? 'Let’s go' : step === 'goal' && onboarding.progress.goals.length === 0 ? 'Pick at least one' : 'Continue'}
              <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2.2} className="size-5" />
            </button>
            {step === 'welcome' && (
              <button type="button" onClick={later} className="h-9 cursor-pointer rounded-2xl text-sm font-semibold text-muted-foreground transition hover:text-foreground">
                I’ll set it up later
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
