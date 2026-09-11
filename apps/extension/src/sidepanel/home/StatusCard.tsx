import { useState, type ReactNode } from 'react';
import type { PendingReply } from '@casper/shared';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Alert02Icon,
  Analytics01Icon,
  ArrowDownDoubleIcon,
  AtIcon,
  BookOpen01Icon,
  Bookmark02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Comment01Icon,
  FavouriteIcon,
  Globe02Icon,
  HourglassIcon,
  Moon02Icon,
  PauseIcon,
  PlayIcon,
  QuoteDownIcon,
  RepeatIcon,
  Search01Icon,
  Tick02Icon,
  UserAdd01Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import type { EngineStatus } from '../useEngineStatus.js';
import type { PanelTarget } from '../navigation.js';
import type { QueuedTask } from '../../scheduler/types.js';
import { runAction, useCondition } from '../pages/ConditionCard.js';
import type { Card as ConditionData } from '../conditions.js';
import { useActivity, type ActivityItem } from './useActivity';
import { useLiveActivity, type LiveActivity } from './useLiveActivity';
import { useReplyQueue } from './useReplyQueue';

/**
 * "What I'm doing" — Ghostly's live status.
 *
 *  · Current — one thing, big: what it is doing this second (scrolling,
 *    searching, reading…) with a motion that matches, or how long until its
 *    next move, counting down.
 *  · Done — everything it has done, newest first, at full length.
 *
 * It doubles as the alert banner and the reply queue: when something needs
 * the user, both views step aside for that one message and its big buttons.
 */
const CARD = 'rounded-4xl bg-card p-4 text-card-foreground shadow-sm ring-1 ring-[color:var(--card-ring)]';

const clock = (ms: number | string) => {
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

/** 42s → "0:42", 12m5s → "12:05", 3h12m → "3h 12m". */
export const span = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  return `${m}:${String(s % 60).padStart(2, '0')}`;
};

const ordinal = (n: number) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();

const DOT: Record<EngineStatus['state'], string> = {
  working: 'bg-casper-working animate-pulse',
  waiting: 'bg-muted-foreground',
  attention: 'bg-casper-attention animate-pulse',
  paused: 'bg-muted-foreground',
};

/* -- what a task looks like -------------------------------------------------- */

export interface Look {
  icon: IconSvgElement;
  verb: string;
  detail: string;
  /** Motion for the icon inside the orb. */
  motion: string;
  typing?: boolean;
}

const at = (h?: string) => (h ? `@${h.replace(/^@/, '')}` : null);

export const lookOf = (t: QueuedTask): Look => {
  const p = t.payload as { handle?: string; authorHandle?: string; targetHandle?: string; query?: string };
  const who = at(p.handle ?? p.authorHandle ?? p.targetHandle);
  const post = who ? `a post by ${who}` : 'a post';
  const SCROLL = 'animate-[ghost-scroll_1.4s_ease-in-out_infinite]';
  const BEAT = 'animate-[ghost-beat_1.2s_ease-in-out_infinite]';
  const ROAM = 'animate-[ghost-search_2.4s_ease-in-out_infinite]';
  const BREATHE = 'animate-[ghost-breathe_2.4s_ease-in-out_infinite]';
  switch (t.taskType) {
    case 'scan-home-feed':
      return { icon: ArrowDownDoubleIcon, verb: 'Scrolling', detail: 'your home feed', motion: SCROLL };
    case 'scan-search':
      return { icon: Search01Icon, verb: 'Searching', detail: p.query ? `“${p.query}”` : 'a topic', motion: ROAM };
    case 'scan-profile-likes':
      return { icon: Globe02Icon, verb: 'Browsing', detail: `${who ?? 'a creator'}’s profile`, motion: ROAM };
    case 'scan-profile-followers':
      return { icon: BookOpen01Icon, verb: 'Reading', detail: `${who ?? 'a creator'}’s followers`, motion: BREATHE };
    case 'scan-followback':
      return { icon: UserAdd01Icon, verb: 'Following back', detail: 'your new followers', motion: BEAT };
    case 'scan-growth':
      return { icon: Analytics01Icon, verb: 'Checking', detail: 'your follower count', motion: BREATHE };
    case 'scan-mentions':
      return { icon: AtIcon, verb: 'Reading', detail: 'your mentions', motion: BREATHE };
    case 'like':
      return { icon: FavouriteIcon, verb: 'Liking', detail: post, motion: BEAT };
    case 'comment':
      return { icon: Comment01Icon, verb: 'Replying', detail: `to ${post}`, motion: BREATHE, typing: true };
    case 'follow':
      return { icon: UserAdd01Icon, verb: 'Following', detail: who ?? 'someone new', motion: BEAT };
    case 'bookmark':
      return { icon: Bookmark02Icon, verb: 'Bookmarking', detail: post, motion: BEAT };
    case 'repost':
      return { icon: RepeatIcon, verb: 'Reposting', detail: post, motion: BEAT };
    case 'quote':
      return { icon: QuoteDownIcon, verb: 'Quoting', detail: post, motion: BREATHE, typing: true };
  }
};

/* -- Current: the live view -------------------------------------------------- */

/** Countdown ring around the orb: full when the wait starts, empty when it ends. */
const WaitRing = ({ live }: { live: LiveActivity }) => {
  if (!live.until) return null;
  const total = Math.max(1, live.until - live.since);
  const left = Math.min(1, Math.max(0, (live.until - live.now) / total));
  const r = 54;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden>
      <circle cx="60" cy="60" r={r} fill="none" strokeWidth="5" className="stroke-primary/12" />
      <circle
        cx="60"
        cy="60"
        r={r}
        fill="none"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${c * left} ${c}`}
        className="stroke-primary transition-[stroke-dasharray] duration-1000 ease-linear"
      />
    </svg>
  );
};

const Orb = ({ live, look }: { live: LiveActivity; look: Look | null }) => {
  const running = live.mode === 'running';
  const paused = live.mode === 'paused';
  const icon =
    look?.icon ??
    (paused
      ? PauseIcon
      : live.reason === 'outside-hours'
        ? Moon02Icon
        : live.reason === 'caps-spent'
          ? CheckmarkCircle02Icon
          : live.mode === 'waiting'
            ? HourglassIcon
            : ViewIcon);
  const motion =
    look?.motion ??
    (live.mode === 'waiting' && !live.reason
      ? 'animate-[ghost-flip_3s_ease-in-out_infinite]'
      : live.mode === 'idle'
        ? 'animate-[ghost-breathe_2.4s_ease-in-out_infinite]'
        : '');

  return (
    <div className="ghost-motion relative grid size-[120px] shrink-0 place-items-center">
      {running && (
        <>
          <span className="absolute inset-3 animate-ping rounded-full bg-primary/15 [animation-duration:2s]" />
          <span className="absolute inset-0 rounded-full bg-primary/8" />
        </>
      )}
      {live.mode === 'waiting' && <WaitRing live={live} />}
      <span
        className={cn(
          'relative grid size-[76px] place-items-center rounded-full shadow-sm transition-colors',
          paused ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground',
        )}
      >
        <HugeiconsIcon icon={icon} strokeWidth={2} className={cn('size-8', motion)} />
      </span>
    </div>
  );
};

const Typing = () => (
  <span className="ghost-motion ml-1 inline-flex gap-0.5 align-middle" aria-hidden>
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="size-1.5 animate-[ghost-dot_1.2s_ease-in-out_infinite] rounded-full bg-current"
        style={{ animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </span>
);

const LiveNow = ({ status }: { status: EngineStatus }) => {
  const live = useLiveActivity(status);
  const look = live.task ? lookOf(live.task) : null;
  const remaining = live.until ? live.until - live.now : 0;

  let eyebrow: string;
  let headline: ReactNode;
  let detail: ReactNode;

  switch (live.mode) {
    case 'running':
      eyebrow = 'Right now';
      headline = (
        <>
          {look!.verb}
          {look!.typing && <Typing />}
        </>
      );
      detail = (
        <>
          {look!.detail}
          <span className="text-muted-foreground/70"> · for {span(live.now - live.since)}</span>
        </>
      );
      break;
    case 'waiting':
      eyebrow =
        live.reason === 'outside-hours'
          ? 'Outside your hours'
          : live.reason === 'caps-spent'
            ? 'Today’s limit reached'
            : 'Next move in';
      headline = <span className="tabular-nums">{span(remaining)}</span>;
      detail =
        live.reason === 'outside-hours' || live.reason === 'caps-spent'
          ? `Back at ${clock(live.until!)}`
          : live.reason === 'nothing-matched'
            ? 'Nothing worth replying to yet'
            : 'Pausing between moves, like a person would';
      break;
    case 'paused':
      eyebrow = 'Paused';
      headline = 'Taking a break';
      detail = 'Nothing runs until you start me';
      break;
    default:
      eyebrow = 'Right now';
      headline = 'Watching';
      detail = live.reason === 'nothing-matched' ? 'Nothing worth replying to yet' : 'Looking for the next good post';
  }

  const upNext = live.next[0];

  return (
    <div className="flex flex-col items-center gap-4 pt-1 pb-1 text-center">
      <Orb live={live} look={look} />
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-primary uppercase">{eyebrow}</p>
        <h3 className="mt-1 font-display text-[28px] leading-none font-extrabold tracking-tight">{headline}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
      </div>

      {live.mode === 'paused' && (
        <button
          type="button"
          onClick={() => void status.togglePause()}
          className="flex h-11 cursor-pointer items-center gap-2 rounded-full bg-primary pr-5 pl-4 font-display text-[15px] font-bold text-primary-foreground transition hover:bg-primary/85 active:scale-[0.98]"
        >
          <HugeiconsIcon icon={PlayIcon} strokeWidth={2} className="size-4 fill-current" />
          Start
        </button>
      )}

      {upNext && live.mode !== 'paused' && (
        <div className="flex w-full items-center gap-3 rounded-3xl bg-muted/60 px-3 py-2.5 text-left">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-background text-foreground/70">
            <HugeiconsIcon icon={lookOf(upNext).icon} strokeWidth={2} className="size-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Up next</p>
            <p className="truncate text-sm font-medium">
              {lookOf(upNext).verb} {lookOf(upNext).detail}
            </p>
          </div>
          {live.next.length > 1 && (
            <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">
              +{live.next.length - 1}
            </span>
          )}
        </div>
      )}
    </div>
  );
};

/* -- Done: the full list ----------------------------------------------------- */

const DoneRow = ({ item, tail }: { item: ActivityItem; tail: ReactNode }) => {
  const body = (
    <>
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-full font-display text-sm font-bold',
          item.state === 'failed' ? 'bg-destructive/12 text-destructive' : 'bg-primary/12 text-primary',
        )}
      >
        {item.handle ? item.handle.replace(/^@/, '')[0]?.toUpperCase() : '·'}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-display text-[15px] leading-tight font-bold tracking-tight">{item.text}</span>
        <span className="mt-0.5 block text-xs text-muted-foreground tabular-nums">{clock(item.time)}</span>
      </span>
      <span className="shrink-0 text-xs text-muted-foreground">{tail}</span>
    </>
  );
  const cls = 'flex items-center gap-3 rounded-2xl px-2 py-2';
  return item.href ? (
    <a href={item.href} target="_blank" rel="noreferrer" className={cn(cls, 'transition-colors hover:bg-muted/60')}>
      {body}
    </a>
  ) : (
    <div className={cls}>{body}</div>
  );
};

const DoneList = () => {
  const { done, offline } = useActivity();
  if (done === null) return <p className="py-6 text-center text-sm text-muted-foreground">Catching up…</p>;
  if (done.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Nothing yet today — every action shows up here.</p>;
  }
  let n = done.filter((d) => d.state === 'done' && isToday(d.time)).length;
  return (
    // Scrolls inside the card; the fade at the bottom says there's more.
    <div className="no-scrollbar -mx-2 flex max-h-[320px] flex-col overflow-y-auto overscroll-contain pb-4 [mask-image:linear-gradient(to_bottom,black_calc(100%-28px),transparent)]">
      {done.map((item) => (
        <DoneRow
          key={item.id}
          item={item}
          tail={
            item.state === 'failed' ? (
              <span className="font-medium text-destructive">Failed</span>
            ) : isToday(item.time) ? (
              `Done · ${ordinal(n--)}`
            ) : (
              'Done'
            )
          }
        />
      ))}
      {offline && (
        <p className="pt-1 text-center text-[11px] text-muted-foreground">Server unreachable — showing this device only.</p>
      )}
    </div>
  );
};

/* -- alert modes ------------------------------------------------------------- */

const BigButton = ({
  children,
  onClick,
  tone,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  tone: 'primary' | 'plain';
  disabled?: boolean;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      'flex h-12 flex-1 cursor-pointer items-center justify-center gap-2 rounded-full font-display text-[15px] font-bold transition outline-none focus-visible:ring-3 focus-visible:ring-ring/40 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
      tone === 'primary' ? 'bg-primary text-primary-foreground hover:bg-primary/85' : 'bg-muted text-foreground hover:bg-muted/70',
    )}
  >
    {children}
  </button>
);

const ConditionAlert = ({
  card,
  onLater,
  onNavigate,
}: {
  card: ConditionData;
  onLater: () => void;
  onNavigate: (t: PanelTarget) => void;
}) => (
  <div className="flex flex-col gap-3">
    <div className="flex items-start gap-3 rounded-3xl bg-casper-attention/10 p-3">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-casper-attention/20 text-casper-attention">
        <HugeiconsIcon icon={Alert02Icon} strokeWidth={2.2} className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-[18px] leading-tight font-bold tracking-tight">{card.title}</p>
        {card.body && <p className="mt-1 text-sm leading-snug text-muted-foreground">{card.body}</p>}
      </div>
    </div>
    <div className="flex gap-2">
      {card.actions.map((a, i) => (
        <BigButton key={a.label} tone={i === 0 ? 'primary' : 'plain'} onClick={() => void runAction(a, onNavigate)}>
          {a.label}
        </BigButton>
      ))}
      <BigButton tone="plain" onClick={onLater}>
        Later
      </BigButton>
    </div>
  </div>
);

const ReplyAlert = ({
  reply,
  total,
  queue,
}: {
  reply: PendingReply;
  total: number;
  queue: ReturnType<typeof useReplyQueue>;
}) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(reply.draftText);
  const author = reply.authorHandle ? `@${reply.authorHandle.replace(/^@/, '')}` : 'Someone';

  return (
    <div className="flex flex-col gap-3">
      <a href={reply.postUrl} target="_blank" rel="noreferrer" className="block rounded-3xl bg-muted/60 p-3 transition hover:bg-muted">
        <p className="text-xs font-semibold text-muted-foreground">{author} posted</p>
        <p className="mt-0.5 line-clamp-3 text-sm leading-snug text-foreground/80">{reply.postText || '(post text unavailable)'}</p>
      </a>

      <div className="rounded-3xl bg-primary/8 p-3 ring-1 ring-primary/15">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-primary">My reply</p>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="cursor-pointer rounded-full px-2 py-0.5 text-xs font-medium text-muted-foreground hover:bg-muted"
          >
            {editing ? 'Done' : 'Edit'}
          </button>
        </div>
        {editing ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            autoFocus
            className="mt-1 w-full resize-none bg-transparent font-display text-[15px] leading-snug font-semibold outline-none"
          />
        ) : (
          <p className="mt-1 font-display text-[15px] leading-snug font-semibold">{text}</p>
        )}
      </div>

      <div className="flex gap-2">
        <BigButton tone="primary" disabled={queue.busy || text.trim().length < 2} onClick={() => void queue.approve(reply.id, text)}>
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.4} className="size-5" />
          Approve
        </BigButton>
        <BigButton tone="plain" disabled={queue.busy} onClick={() => void queue.reject(reply.id)}>
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.4} className="size-5" />
          Deny
        </BigButton>
      </div>

      {total > 1 && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>1 of {total} waiting</span>
          <button
            type="button"
            disabled={queue.busy}
            onClick={() => void queue.approveAll()}
            className="cursor-pointer rounded-full px-2 py-0.5 font-medium text-foreground/80 hover:bg-muted disabled:opacity-50"
          >
            Approve all {total}
          </button>
        </div>
      )}
    </div>
  );
};

/* -- the card ---------------------------------------------------------------- */

export const StatusCard = ({ status, onNavigate }: { status: EngineStatus; onNavigate: (t: PanelTarget) => void }) => {
  const [tab, setTab] = useState<'current' | 'done'>('current');
  const [snoozed, setSnoozed] = useState<string | null>(null);
  const condition = useCondition(status);
  const queue = useReplyQueue(status.settings?.isPaused ?? false);

  // A problem only the user can fix wins; then a reply waiting for approval.
  // "Drafts waiting" is the reply queue's own notice — the queue shows itself.
  const alert =
    condition && condition.tone === 'attention' && condition.code !== 'drafts-waiting' && condition.code !== snoozed
      ? condition
      : null;
  const reply = !alert ? queue.replies[0] : undefined;

  const title = alert ? 'I need you' : reply ? 'Can I post this?' : 'What I’m doing';

  return (
    <section className={cn(CARD, 'flex flex-col gap-4')}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[17px] font-bold tracking-tight">{title}</h2>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <span className={cn('size-2 shrink-0 rounded-full', DOT[status.state])} />
            {status.label}
          </p>
        </div>
        {!alert && !reply && (
          <div className="flex shrink-0 rounded-full bg-muted p-1" role="tablist">
            {(['current', 'done'] as const).map((t) => (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={tab === t}
                onClick={() => setTab(t)}
                className={cn(
                  'h-8 cursor-pointer rounded-full px-3.5 text-[13px] font-medium transition-colors',
                  tab === t ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {t === 'current' ? 'Current' : 'Done'}
              </button>
            ))}
          </div>
        )}
      </div>

      {alert ? (
        <ConditionAlert card={alert} onLater={() => setSnoozed(alert.code)} onNavigate={onNavigate} />
      ) : reply ? (
        <ReplyAlert key={reply.id} reply={reply} total={queue.replies.length} queue={queue} />
      ) : tab === 'current' ? (
        <LiveNow status={status} />
      ) : (
        <DoneList />
      )}

      {queue.note && !alert && <p className="text-center text-xs font-medium text-muted-foreground">{queue.note}</p>}
    </section>
  );
};
