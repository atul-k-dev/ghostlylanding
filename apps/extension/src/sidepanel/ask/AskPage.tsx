import { useEffect, useRef, useState } from 'react';
import type { User } from '@casper/shared';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Alert02Icon,
  Analytics01Icon,
  ArrowTurnBackwardIcon,
  ArrowUp02Icon,
  Brain02Icon,
  Calendar03Icon,
  Cancel01Icon,
  MessageAdd01Icon,
  PencilEdit02Icon,
  SparklesIcon,
  Target02Icon,
  TestTubeIcon,
  Tick02Icon,
  UserBlock01Icon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { firstName } from '../shell/user';
import { useAsk, type AskState, type ChatTurn } from './useAsk';

/**
 * Ask — Ghostly as a copilot you talk to.
 *
 *  · Empty: a greeting and six things people actually ask, one tap each.
 *  · Chat: your messages on the right, Ghostly's on the left. Anything that
 *    would CHANGE something arrives as a proposal card — nothing is applied
 *    until you tap "Do it", and settings changes can be undone.
 *  · Memory: the standing instructions you've given ("never reply to
 *    crypto posts"), visible and forgettable from the message bar.
 */

const SUGGESTIONS: { icon: IconSvgElement; text: string; send?: string; fill?: string }[] = [
  { icon: Analytics01Icon, text: 'Why did my followers change?', send: 'Why did my followers change recently?' },
  { icon: Calendar03Icon, text: 'Post more this week', send: 'Post more this week' },
  { icon: Target02Icon, text: 'Which creators work best?', send: 'Which target creators are working best for me?' },
  { icon: UserBlock01Icon, text: 'Stop following people', send: 'Stop following people for now' },
  { icon: PencilEdit02Icon, text: 'Write a post about…', fill: 'Write a post about ' },
  { icon: TestTubeIcon, text: 'Show me what you’d do', send: 'Run a dry run and show me what you would do next' },
];

const Avatar = () => (
  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm">
    <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-4" />
  </span>
);

const Typing = () => (
  <div className="flex items-end gap-2">
    <Avatar />
    <div className="ghost-motion flex gap-1 rounded-3xl rounded-bl-md bg-card px-4 py-3.5 ring-1 ring-[color:var(--card-ring)]" aria-label="Ghostly is thinking">
      {[0, 1, 2].map((i) => (
        <span key={i} className="size-2 animate-[ghost-dot_1.2s_ease-in-out_infinite] rounded-full bg-muted-foreground" style={{ animationDelay: `${i * 0.15}s` }} />
      ))}
    </div>
  </div>
);

/** A change Ghostly wants to make — shown, never applied, until you say so. */
const Proposal = ({ turn, onDo, onDismiss, onUndo }: { turn: ChatTurn; onDo: () => void; onDismiss: () => void; onUndo: () => void }) => {
  const isAction = !!turn.clientAction;
  return (
    <div className="flex flex-col gap-3 rounded-3xl rounded-bl-md bg-card p-3.5 ring-1 ring-primary/25">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-primary uppercase">
        <HugeiconsIcon icon={SparklesIcon} strokeWidth={2} className="size-3.5" />
        {isAction ? 'I can run this' : 'Proposed change'}
      </p>
      <p className="text-[15px] leading-snug font-medium">{turn.clientAction?.summary ?? turn.diff?.summary ?? turn.content}</p>

      {!turn.resolved && (
        <div className="flex gap-2">
          <Button className="h-10 flex-1" onClick={onDo}>
            <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.2} data-icon="inline-start" />
            {isAction ? 'Run it' : 'Do it'}
          </Button>
          {!isAction && (
            <Button className="h-10 flex-1" variant="secondary" onClick={onDismiss}>
              Not now
            </Button>
          )}
        </div>
      )}
      {turn.resolved === 'done' && (
        <div className="flex items-center justify-between rounded-2xl bg-casper-working/10 px-3 py-2 text-sm font-medium text-casper-working">
          <span className="flex items-center gap-1.5">
            <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.4} className="size-4" />
            {isAction ? 'Ran it — results show up on Home and Post' : 'Done'}
          </span>
          {turn.undo && (
            <button type="button" onClick={onUndo} className="inline-flex cursor-pointer items-center gap-1 text-xs font-semibold text-foreground/70 hover:text-foreground">
              <HugeiconsIcon icon={ArrowTurnBackwardIcon} strokeWidth={2} className="size-3.5" />
              Undo
            </button>
          )}
        </div>
      )}
      {turn.resolved === 'dismissed' && <p className="text-xs text-muted-foreground">Not applied — nothing changed.</p>}
    </div>
  );
};

const Chat = ({ ask }: { ask: AskState }) => (
  <div className="flex flex-col gap-3 py-2">
    {ask.turns.map((t, i) =>
      t.role === 'user' ? (
        <div key={i} className="flex justify-end">
          <p className="max-w-[85%] rounded-3xl rounded-br-md bg-primary px-3.5 py-2.5 text-[15px] leading-snug whitespace-pre-wrap text-primary-foreground">
            {t.content}
          </p>
        </div>
      ) : (
        <div key={i} className="flex items-end gap-2">
          <Avatar />
          <div className="max-w-[88%] min-w-0">
            {t.diff || t.clientAction ? (
              <Proposal turn={t} onDo={() => void ask.doIt(i)} onDismiss={() => ask.dismiss(i)} onUndo={() => void ask.undo(i)} />
            ) : (
              <p className="rounded-3xl rounded-bl-md bg-card px-3.5 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap ring-1 ring-[color:var(--card-ring)]">
                {t.content}
              </p>
            )}
          </div>
        </div>
      ),
    )}
    {ask.busy && <Typing />}
    {ask.error && (
      <div className="flex items-end gap-2">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-destructive/12 text-destructive">
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-4" />
        </span>
        <div className="flex max-w-[88%] flex-col gap-2 rounded-3xl rounded-bl-md bg-destructive/8 px-3.5 py-2.5 ring-1 ring-destructive/20">
          <p className="text-sm text-destructive">{ask.error}</p>
          <Button size="sm" variant="secondary" className="w-fit" onClick={() => void ask.retry()}>
            Try again
          </Button>
        </div>
      </div>
    )}
  </div>
);

const Welcome = ({ ask, name, onFill }: { ask: AskState; name: string; onFill: (text: string) => void }) => (
  // The greeting takes the free space in the middle; the suggestions sit at the
  // bottom, right above the message bar.
  <div className="flex min-h-full flex-col gap-4 pt-4 pb-1">
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-4 text-center">
      <span className="ghost-motion grid size-20 animate-[ghost-breathe_3s_ease-in-out_infinite] place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-8 ring-primary/15">
        <HugeiconsIcon icon={SparklesIcon} strokeWidth={1.8} className="size-9" />
      </span>
      <div>
        <h2 className="font-display text-[24px] leading-tight font-extrabold tracking-tight">Hi {name}, what can I do?</h2>
        <p className="mt-1 text-xs text-muted-foreground">Nothing changes until you tap “Do it”.</p>
      </div>
    </div>

    {ask.nudge && (
      <div className="flex flex-col gap-3 rounded-4xl bg-card p-4 shadow-sm ring-1 ring-casper-attention/40">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-casper-attention uppercase">
          <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="size-3.5" />I noticed something
        </p>
        <p className="text-[15px] leading-snug">{ask.nudge.message}</p>
        <div className="flex gap-2">
          <Button
            className="h-10 flex-1"
            onClick={() => {
              const msg = ask.nudge!.onYesMessage;
              ask.dismissNudge();
              void ask.send(msg);
            }}
          >
            Yes, go ahead
          </Button>
          <Button className="h-10 flex-1" variant="secondary" onClick={ask.dismissNudge}>
            Not now
          </Button>
        </div>
      </div>
    )}

    <div>
      <p className="mb-2 px-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Try asking</p>
      <div className="grid grid-cols-2 gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            type="button"
            onClick={() => (s.send ? void ask.send(s.send) : onFill(s.fill ?? ''))}
            className="flex cursor-pointer flex-col items-start gap-2.5 rounded-3xl bg-card p-3.5 text-left shadow-sm ring-1 ring-[color:var(--card-ring)] transition hover:ring-primary/40 active:scale-[0.98]"
          >
            <span className="grid size-9 place-items-center rounded-full bg-primary/15 text-primary">
              <HugeiconsIcon icon={s.icon} strokeWidth={2} className="size-[18px]" />
            </span>
            <span className="text-sm leading-snug font-semibold">{s.text}</span>
          </button>
        ))}
      </div>
    </div>
  </div>
);

/** "Things you've told me" — standing instructions, each forgettable. */
const Memory = ({ ask, onClose }: { ask: AskState; onClose: () => void }) => (
  <div className="mx-4 mt-2 flex flex-col gap-3 rounded-4xl bg-card p-4 shadow-sm ring-1 ring-[color:var(--card-ring)] animate-in fade-in slide-in-from-bottom-2">
    <div className="flex items-start justify-between gap-2">
      <div>
        <p className="font-display text-base font-bold">Things you’ve told me</p>
        <p className="text-xs text-muted-foreground">I follow these every time. Tap ✕ to make me forget one.</p>
      </div>
      <Button size="icon-sm" variant="ghost" onClick={onClose} aria-label="Close">
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
      </Button>
    </div>
    {ask.instructions.length === 0 ? (
      <p className="text-sm text-muted-foreground">Nothing yet. Try “always keep replies under 15 words”.</p>
    ) : (
      <ul className="flex flex-col gap-1.5">
        {ask.instructions.map((i) => (
          <li key={i} className="flex items-center gap-2 rounded-2xl bg-muted/60 py-1.5 pr-1.5 pl-3 text-sm">
            <span className="flex-1">{i}</span>
            <Button size="icon-xs" variant="ghost" aria-label={`Forget: ${i}`} onClick={() => void ask.removeInstruction(i)}>
              <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
            </Button>
          </li>
        ))}
      </ul>
    )}
  </div>
);

export const AskPage = ({ user }: { user: User }) => {
  const ask = useAsk();
  const [memory, setMemory] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);

  // Follow the conversation down as it grows.
  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [ask.turns.length, ask.busy, ask.error]);

  const fill = (text: string) => {
    ask.setInput(text);
    requestAnimationFrame(() => {
      field.current?.focus();
      field.current?.setSelectionRange(text.length, text.length);
    });
  };

  const chatting = ask.turns.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div ref={scroller} className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4">
        {chatting ? <Chat ask={ask} /> : <Welcome ask={ask} name={firstName(user.name, user.email)} onFill={fill} />}
      </div>

      {memory && <Memory ask={ask} onClose={() => setMemory(false)} />}

      <div className="px-4 pt-2">
        <div className="flex items-end gap-1 rounded-[1.75rem] bg-card p-1.5 shadow-md ring-1 ring-[color:var(--card-ring)] focus-within:ring-primary/40">
          <button
            type="button"
            onClick={() => setMemory((m) => !m)}
            aria-expanded={memory}
            title="Things you've told me"
            aria-label="Memory"
            className={cn(
              'relative grid size-10 shrink-0 cursor-pointer place-items-center rounded-full transition-colors',
              memory ? 'bg-primary/12 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
            )}
          >
            <HugeiconsIcon icon={Brain02Icon} strokeWidth={2} className="size-5" />
            {ask.instructions.length > 0 && (
              <span className="absolute top-1 right-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {ask.instructions.length}
              </span>
            )}
          </button>
          {chatting && (
            <button
              type="button"
              onClick={ask.reset}
              title="New chat"
              aria-label="New chat"
              className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <HugeiconsIcon icon={MessageAdd01Icon} strokeWidth={2} className="size-5" />
            </button>
          )}
          <textarea
            ref={field}
            value={ask.input}
            onChange={(e) => ask.setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void ask.send();
              }
            }}
            rows={1}
            placeholder="Ask anything…"
            disabled={ask.busy}
            className="field-sizing-content max-h-32 min-h-10 flex-1 resize-none bg-transparent px-1 py-2.5 text-[15px] leading-snug outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          <button
            type="button"
            onClick={() => void ask.send()}
            disabled={ask.busy || !ask.input.trim()}
            aria-label="Send"
            className="grid size-10 shrink-0 cursor-pointer place-items-center rounded-full bg-primary text-primary-foreground transition hover:bg-primary/85 active:scale-95 disabled:cursor-default disabled:bg-muted disabled:text-muted-foreground"
          >
            <HugeiconsIcon icon={ArrowUp02Icon} strokeWidth={2.4} className="size-5" />
          </button>
        </div>
        <p className="mt-1.5 text-center text-[11px] text-muted-foreground">Enter to send · Shift+Enter for a new line</p>
      </div>
    </div>
  );
};
