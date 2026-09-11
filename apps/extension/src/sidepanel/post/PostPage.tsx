import { useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Alert02Icon,
  AiMagicIcon,
  Calendar03Icon,
  CheckmarkCircle02Icon,
  PencilEdit02Icon,
  RefreshIcon,
  Delete02Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { presetOf } from '../../lib/presets.js';
import { MIN_DAYS } from '../../lib/best-times.js';
import { hasOpenOffer, isTrusted } from '../../lib/trust.js';
import { appendGrowthMilestone, retryScheduledPost } from '../../lib/storage.js';
import { NOTICE_COPY, fill } from '../conditions.js';
import { formatWhen } from '../pages/_shared.js';
import { TrustOfferCard } from '../pages/AutoPosting.js';
import { Muted, WIDGET } from '../home/Widget';
import { Composer } from './Composer';
import { PostItem, STATUS } from './PostItem';
import { WeekDays } from './WeekDays';
import { call, dayStart, usePosts, type PostsState } from './usePosts';

/**
 * Post — plan the week, write, schedule, publish.
 *
 * Top to bottom, in the order a creator thinks:
 *   1. the week   — which days are empty (that's what makes you write)
 *   2. that day   — what's on it, on a timeline; an empty day offers to fill itself
 *   3. create     — write or draft with AI, then one tap on a good time
 *   4. autopilot  — let Ghostly write on its own, at your best times
 *   5. history    — what went out, and what failed (with a retry)
 */

/* -- a toast for everything the page says back --------------------------------------- */

const Toast = ({ state }: { state: PostsState }) =>
  state.note ? (
    <div className="pointer-events-none sticky top-2 z-30 flex justify-center">
      <button
        type="button"
        onClick={state.clearNote}
        role="status"
        className={cn(
          'pointer-events-auto flex max-w-full cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg',
          'animate-in fade-in slide-in-from-top-2',
          state.note.tone === 'error' ? 'bg-destructive text-white' : 'bg-foreground text-background',
        )}
      >
        <HugeiconsIcon icon={state.note.tone === 'error' ? Alert02Icon : CheckmarkCircle02Icon} strokeWidth={2} className="size-4 shrink-0" />
        <span className="truncate">{state.note.text}</span>
      </button>
    </div>
  ) : null;

/* -- the selected day ------------------------------------------------------------------ */

const DayAgenda = ({
  state,
  day,
  onWrite,
  onAsk,
  asking,
}: {
  state: PostsState;
  day: number;
  onWrite: () => void;
  onAsk: () => void;
  asking: boolean;
}) => {
  const posts = state.pending.filter((p) => dayStart(p.scheduledAt) === day);
  const label = new Date(day).toLocaleDateString([], { weekday: 'long' });

  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-4xl border-2 border-dashed border-foreground/10 px-4 py-6 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <HugeiconsIcon icon={Calendar03Icon} strokeWidth={2} className="size-6" />
        </span>
        <div>
          <p className="font-display text-base font-bold">{label} is empty</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            That’s the gap worth filling.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onWrite}>
            <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} data-icon="inline-start" />
            Write one
          </Button>
          <Button onClick={onAsk} disabled={asking}>
            <HugeiconsIcon icon={AiMagicIcon} strokeWidth={2} data-icon="inline-start" />
            {asking ? 'Writing…' : 'Draft one for me'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ul className="flex flex-col">
      {posts.map((p) => (
        <PostItem key={p.id} post={p} state={state} />
      ))}
    </ul>
  );
};

/* -- Ghostly writes on its own ---------------------------------------------------------- */

const AutoWriter = ({ state }: { state: PostsState }) => {
  const settings = state.settings!;
  const [busy, setBusy] = useState(false);
  const auto = settings.autoPost;
  const perDay = presetOf(settings).postsPerDay;
  const trusted = isTrusted(settings.trust);
  const bt = state.bestTimes;

  const toggle = async (on: boolean) => {
    state.update({ ...settings, autoPost: { ...auto, enabled: on } });
    // Only turning it ON is a growth lever worth marking on the chart.
    if (on) await appendGrowthMilestone({ at: new Date().toISOString(), kind: 'auto-posting-started', detail: 'Auto-posting turned on' });
  };

  const writeNow = async () => {
    setBusy(true);
    try {
      const d = await call<{ drafted: number; skip: string | null; autoPublish: boolean }>('AUTO_DRAFT_NOW', {});
      if (d.drafted > 0) state.say(d.autoPublish ? `Wrote ${d.drafted} and put them on the schedule.` : `Wrote ${d.drafted} — they're waiting for you in the week.`);
      else if (d.skip === 'no-topics') state.fail('Add a few topics first — in Create a post → ✨ AI.');
      else if (d.skip === 'queue-full' || d.skip === 'enough-queued') state.fail('You already have enough waiting. Clear some first.');
      else if (d.skip === 'posted-recently') state.say('You posted recently — nothing to fill in.');
      else state.fail('Nothing came back. Try again in a minute.');
      await state.refresh();
    } catch (err) {
      state.fail(err instanceof Error ? err.message : 'That did not work');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={cn(WIDGET, 'flex flex-col gap-4')}>
      <div className="flex items-center gap-3">
        <span className={cn('grid size-11 shrink-0 place-items-center rounded-full', auto.enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
          <HugeiconsIcon icon={AiMagicIcon} strokeWidth={2} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-[17px] font-bold tracking-tight">Ghostly writes for you</h2>
          <p className="text-xs text-muted-foreground">
            {auto.enabled ? `About ${perDay} a day, in your voice` : 'Off — nothing is written unless you turn this on'}
          </p>
        </div>
        <Switch checked={auto.enabled} onCheckedChange={(v) => void toggle(v)} aria-label="Ghostly writes for you" />
      </div>

      {auto.enabled && (
        <div className="flex flex-col gap-2 rounded-3xl bg-muted/50 p-3 text-sm leading-snug">
          <p>
            {trusted
              ? 'They go out on their own — each one sits in your week first, and you can delete any of them.'
              : 'Each one waits in your week for your yes. Nothing publishes until you approve it.'}
          </p>
          {bt && bt.labels.length > 0 && (
            <p className="text-muted-foreground">
              {bt.personalised
                ? `Timed for ${bt.labels.join(', ')} — from ${bt.posts} of your posts over ${bt.days} days.`
                : `Timed for ${bt.labels.join(' and ')} for now. I need about ${MIN_DAYS} days of your posts to learn your audience.`}
            </p>
          )}
        </div>
      )}

      <Button variant="secondary" className="h-11" disabled={busy} onClick={() => void writeNow()}>
        <HugeiconsIcon icon={AiMagicIcon} strokeWidth={2} data-icon="inline-start" />
        {busy ? 'Writing…' : 'Write some for me now'}
      </Button>
    </section>
  );
};

/* -- what went out ---------------------------------------------------------------------- */

const History = ({ state }: { state: PostsState }) => {
  const [all, setAll] = useState(false);
  if (state.history.length === 0) return null;
  const shown = all ? state.history : state.history.slice(0, 4);

  const retry = async (id: string) => {
    await retryScheduledPost(id, { dropImage: false });
    state.say('Back on the schedule — I’ll try again shortly.');
    await state.refresh();
  };
  const remove = async (id: string) => {
    await call('DELETE_SCHEDULED_POST', { id });
    await state.refresh();
  };

  return (
    <section className={cn(WIDGET, 'flex flex-col gap-3')}>
      <h2 className="font-display text-[17px] font-bold tracking-tight">Recently posted</h2>
      <ul className="flex flex-col gap-1">
        {shown.map((p) => {
          const s = STATUS[p.status];
          return (
            <li key={p.id} className="flex items-start gap-3 rounded-2xl px-1 py-2">
              {p.imageDataUrl ? (
                <img src={p.imageDataUrl} alt="" className="size-11 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className={cn('mt-1.5 size-2.5 shrink-0 rounded-full', s.dot)} />
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-sm leading-snug">{p.text}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', s.cls)}>{s.label}</span>
                  {formatWhen(p.postedAt ?? p.scheduledAt)}
                </p>
                {p.status === 'failed' && p.error && <p className="mt-1 line-clamp-2 text-xs text-destructive">{p.error}</p>}
              </div>
              {p.status === 'failed' ? (
                <Button size="sm" variant="secondary" onClick={() => void retry(p.id)}>
                  <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} data-icon="inline-start" />
                  Retry
                </Button>
              ) : (
                <Button size="icon-sm" variant="ghost" aria-label="Remove from history" onClick={() => void remove(p.id)} className="text-muted-foreground">
                  <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
                </Button>
              )}
            </li>
          );
        })}
      </ul>
      {state.history.length > 4 && (
        <button type="button" onClick={() => setAll((v) => !v)} className="cursor-pointer self-center rounded-full px-3 py-1 text-xs font-medium text-muted-foreground hover:bg-muted">
          {all ? 'Show less' : `Show all ${state.history.length}`}
        </button>
      )}
    </section>
  );
};

/* -- the page ----------------------------------------------------------------------------- */

export const PostPage = () => {
  const state = usePosts();
  const [day, setDay] = useState(() => dayStart(Date.now()));
  const [composeFor, setComposeFor] = useState<{ day: number; n: number } | null>(null);
  const [asking, setAsking] = useState(false);
  const [writingTwo, setWritingTwo] = useState(false);

  if (!state.settings) return <Muted>Catching up…</Muted>;
  const settings = state.settings;

  /** "Draft one for me" on an empty day: one post, in your voice, on THAT day, as a draft. */
  const askForDay = async () => {
    setAsking(true);
    try {
      const { ideas } = await call<{ ideas: string[] }>('GENERATE_IDEAS', { count: 1 });
      const idea = ideas[0];
      if (!idea) throw new Error('Nothing came back. Try again in a minute.');
      const at = new Date(day);
      at.setHours(settings.activeHours.startHour, 0, 0, 0);
      await call('SCHEDULE_POST', {
        text: idea,
        link: '',
        imageDataUrl: null,
        scheduledAt: Math.max(at.getTime(), Date.now() + 5 * 60_000),
        status: 'draft',
      });
      state.say('Drafted and put on that day — read it before it goes out.');
      await state.refresh();
    } catch (err) {
      state.fail(err instanceof Error ? err.message : 'That did not work');
    } finally {
      setAsking(false);
    }
  };

  const writeTwo = async () => {
    setWritingTwo(true);
    try {
      const d = await call<{ drafted: number }>('AUTO_DRAFT_NOW', {});
      state.say(d.drafted > 0 ? `Wrote ${d.drafted} — they're in your week.` : 'Nothing to fill in right now.');
      await state.refresh();
    } catch (err) {
      state.fail(err instanceof Error ? err.message : 'That did not work');
    } finally {
      setWritingTwo(false);
    }
  };

  const quietRow = NOTICE_COPY['profile-quiet'];

  return (
    <div className="flex flex-col gap-4 px-4 pt-1">
      <Toast state={state} />

      {/* One question at a time: the trust offer beats the quiet nudge. */}
      <TrustOfferCard settings={settings} onSettings={() => void state.refresh()} />
      {state.quiet && !hasOpenOffer(settings.trust) && (
        <section className={cn(WIDGET, 'flex flex-col gap-3 bg-casper-attention/8')}>
          <div>
            <p className="font-display text-base font-bold">{quietRow.title}</p>
            {quietRow.body && fill(quietRow.body, {}) && <p className="mt-0.5 text-sm text-muted-foreground">{fill(quietRow.body, {})}</p>}
          </div>
          <Button className="h-11" disabled={writingTwo} onClick={() => void writeTwo()}>
            <HugeiconsIcon icon={AiMagicIcon} strokeWidth={2} data-icon="inline-start" />
            {writingTwo ? 'Writing…' : (quietRow.buttons[0] ?? 'Write two for me')}
          </Button>
        </section>
      )}

      {/* The week */}
      <section className="flex flex-col gap-3">
        <WeekDays posts={state.pending} selected={day} onSelect={setDay} />
        <DayAgenda
          state={state}
          day={day}
          onWrite={() => setComposeFor((c) => ({ day, n: (c?.n ?? 0) + 1 }))}
          onAsk={() => void askForDay()}
          asking={asking}
        />
      </section>

      <Composer state={state} target={composeFor} />
      <AutoWriter state={state} />
      <History state={state} />
    </div>
  );
};
