import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { PendingReply } from '@casper/shared';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Alert02Icon,
  Cancel01Icon,
  Comment01Icon,
  Delete02Icon,
  Notification03Icon,
  PencilEdit02Icon,
  RefreshIcon,
  SentIcon,
  Settings01Icon,
  Tick02Icon,
  UserBlock01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sendToBackground } from '../../lib/messages.js';
import { clearAutoTuneDrop, getSettings, retryScheduledPost, setSettings, type AutoTuneDrop, type ScheduledPost } from '../../lib/storage.js';
import type { EngineStatus } from '../useEngineStatus.js';
import type { PanelTarget } from '../navigation.js';
import { runAction } from '../pages/ConditionCard.js';
import type { Card as ConditionData } from '../conditions.js';
import { Screen } from '../settings/kit';
import { Segmented, WIDGET } from '../home/Widget';
import { useReplyQueue } from '../home/useReplyQueue';
import type { FeedItem, FeedKind, NotificationsState } from './useNotifications';

/**
 * Notifications — what needs you first, then what happened.
 * Everything actionable can be acted on right here: approve a reply, retry a
 * failed post, fix a problem, undo a clean-up.
 */

const ago = (ms: number) => {
  const s = Math.max(0, (Date.now() - ms) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h`;
  if (s < 2 * 86_400) return 'Yesterday';
  if (s < 7 * 86_400) return new Date(ms).toLocaleDateString([], { weekday: 'short' });
  return new Date(ms).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Icon = ({ icon, tone }: { icon: IconSvgElement; tone: 'primary' | 'attention' | 'working' | 'destructive' | 'muted' }) => (
  <span
    className={cn(
      'grid size-10 shrink-0 place-items-center rounded-full',
      tone === 'primary' && 'bg-primary/12 text-primary',
      tone === 'attention' && 'bg-casper-attention/15 text-casper-attention',
      tone === 'working' && 'bg-casper-working/15 text-casper-working',
      tone === 'destructive' && 'bg-destructive/12 text-destructive',
      tone === 'muted' && 'bg-muted text-muted-foreground',
    )}
  >
    <HugeiconsIcon icon={icon} strokeWidth={2} className="size-5" />
  </span>
);

/** One "needs you" card: icon, title, body, then its buttons. */
const ActionCard = ({
  icon,
  tone,
  title,
  meta,
  children,
  actions,
}: {
  icon: IconSvgElement;
  tone: 'primary' | 'attention' | 'destructive';
  title: string;
  meta?: string;
  children?: ReactNode;
  actions: ReactNode;
}) => (
  <section className={cn(WIDGET, 'flex flex-col gap-3 p-3.5', tone === 'attention' && 'ring-casper-attention/35', tone === 'destructive' && 'ring-destructive/25')}>
    <div className="flex items-start gap-3">
      <Icon icon={icon} tone={tone} />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-[15px] leading-snug font-bold">{title}</p>
          {meta && <span className="shrink-0 text-[11px] text-muted-foreground">{meta}</span>}
        </div>
        {children && <div className="mt-1 text-sm leading-snug text-muted-foreground">{children}</div>}
      </div>
    </div>
    <div className="flex gap-2">{actions}</div>
  </section>
);

const AlertCard = ({ card, onNavigate }: { card: ConditionData; onNavigate: (t: PanelTarget) => void }) => (
  <ActionCard
    icon={Alert02Icon}
    tone="attention"
    title={card.title}
    actions={card.actions.map((a, i) => (
      <Button key={a.label} className="h-10 flex-1" variant={i === 0 ? 'default' : 'secondary'} onClick={() => void runAction(a, onNavigate)}>
        {a.label}
      </Button>
    ))}
  >
    {card.body}
  </ActionCard>
);

const ReplyCard = ({ reply, queue }: { reply: PendingReply; queue: ReturnType<typeof useReplyQueue> }) => (
  <ActionCard
    icon={Comment01Icon}
    tone="primary"
    title="Can I post this reply?"
    meta={ago(reply.createdAt)}
    actions={
      <>
        <Button className="h-10 flex-1" disabled={queue.busy} onClick={() => void queue.approve(reply.id, reply.draftText)}>
          <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.2} data-icon="inline-start" />
          Approve
        </Button>
        <Button className="h-10 flex-1" variant="secondary" disabled={queue.busy} onClick={() => void queue.reject(reply.id)}>
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2.2} data-icon="inline-start" />
          Deny
        </Button>
      </>
    }
  >
    <a href={reply.postUrl} target="_blank" rel="noreferrer" className="block hover:text-foreground">
      <span className="font-medium text-foreground/80">{reply.authorHandle ? `@${reply.authorHandle.replace(/^@/, '')}` : 'Someone'}:</span>{' '}
      <span className="line-clamp-2 inline">{reply.postText || '(post text unavailable)'}</span>
    </a>
    <p className="mt-2 rounded-2xl rounded-tl-md bg-primary/8 px-3 py-2 text-[14px] leading-snug text-foreground ring-1 ring-primary/15">{reply.draftText}</p>
  </ActionCard>
);

const FailedCard = ({ post }: { post: ScheduledPost }) => (
  <ActionCard
    icon={Alert02Icon}
    tone="destructive"
    title="A post didn’t go out"
    meta={ago(post.scheduledAt)}
    actions={
      <>
        <Button className="h-10 flex-1" onClick={() => void retryScheduledPost(post.id, { dropImage: false })}>
          <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} data-icon="inline-start" />
          Retry
        </Button>
        {post.imageDataUrl && (
          <Button className="h-10 flex-1" variant="secondary" onClick={() => void retryScheduledPost(post.id, { dropImage: true })}>
            Retry without image
          </Button>
        )}
        <Button
          size="icon-lg"
          variant="ghost"
          className="size-10 text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label="Delete post"
          onClick={() => void sendToBackground({ type: 'DELETE_SCHEDULED_POST', payload: { id: post.id } })}
        >
          <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
        </Button>
      </>
    }
  >
    <span className="line-clamp-2">{post.text}</span>
    {post.error && <span className="mt-1 block text-xs text-destructive">{post.error}</span>}
  </ActionCard>
);

/* -- activity feed ------------------------------------------------------------------ */

const FEED_LOOK: Record<FeedKind, { icon: IconSvgElement; tone: 'working' | 'primary' | 'attention' | 'muted' }> = {
  posted: { icon: SentIcon, tone: 'working' },
  followers: { icon: UserGroupIcon, tone: 'primary' },
  drop: { icon: UserBlock01Icon, tone: 'attention' },
  change: { icon: Settings01Icon, tone: 'muted' },
};

const undoDrop = async (drop: AutoTuneDrop) => {
  const s = await getSettings();
  if (!s.targetCreators.some((t) => t.handle.toLowerCase() === drop.handle.toLowerCase())) {
    await setSettings({ ...s, targetCreators: [...s.targetCreators, { platform: 'twitter', handle: drop.handle, addedAt: new Date().toISOString() }] });
  }
  await clearAutoTuneDrop(drop.handle);
};

const FeedRow = ({ item, unread, onClear, onOpen }: { item: FeedItem; unread: boolean; onClear: () => void; onOpen?: () => void }) => {
  const look = FEED_LOOK[item.kind];
  return (
    <li className="group/row relative flex items-start gap-3 px-3.5 py-3 after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-(--divider) last:after:hidden">
      <span className={cn('absolute top-[26px] left-1.5 size-1.5 rounded-full bg-primary transition-opacity', !unread && 'opacity-0')} aria-hidden />
      <Icon icon={look.icon} tone={look.tone} />
      <button type="button" onClick={onOpen} disabled={!onOpen} className="min-w-0 flex-1 cursor-pointer text-left disabled:cursor-default">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn('text-[15px] leading-snug', unread ? 'font-bold' : 'font-semibold')}>{item.title}</p>
          <span className="shrink-0 text-[11px] text-muted-foreground">{ago(item.time)}</span>
        </div>
        {item.body && <p className="mt-0.5 line-clamp-2 text-sm leading-snug text-muted-foreground">{item.body}</p>}
        {item.drop && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation();
              void undoDrop(item.drop!).then(onClear);
            }}
            className="mt-2 inline-flex h-8 items-center rounded-full bg-primary/10 px-3 text-xs font-semibold text-primary hover:bg-primary/15"
          >
            Undo — keep watching @{item.drop.handle}
          </span>
        )}
      </button>
      <Button
        size="icon-xs"
        variant="ghost"
        aria-label="Clear"
        onClick={onClear}
        className="shrink-0 text-muted-foreground opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100"
      >
        <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
      </Button>
    </li>
  );
};

const FeedGroup = ({ label, items, n, onNavigate }: { label: string; items: FeedItem[]; n: NotificationsState; onNavigate: (t: PanelTarget) => void }) =>
  items.length === 0 ? null : (
    <section className="flex flex-col gap-2">
      <h2 className="px-4 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">{label}</h2>
      <ul className={cn(WIDGET, 'overflow-hidden p-0')}>
        {items.map((item) => (
          <FeedRow
            key={item.id}
            item={item}
            unread={item.time > n.seenAt}
            onClear={() => n.clear(item.id)}
            onOpen={item.kind === 'posted' ? () => onNavigate('posts') : item.kind === 'followers' ? () => onNavigate('growth') : undefined}
          />
        ))}
      </ul>
    </section>
  );

/* -- the page ---------------------------------------------------------------------- */

export const NotificationsPage = ({
  n,
  status,
  onBack,
  onNavigate,
}: {
  n: NotificationsState;
  status: EngineStatus;
  onBack: () => void;
  onNavigate: (t: PanelTarget) => void;
}) => {
  const [tab, setTab] = useState<'all' | 'you'>(n.needsYou > 0 ? 'you' : 'all');
  const [allReplies, setAllReplies] = useState(false);
  const queue = useReplyQueue(status.settings?.isPaused ?? false);

  // Leaving the page is reading it — the bell goes quiet for what you've seen.
  const markRead = useRef(n.markAllRead);
  markRead.current = n.markAllRead;
  useEffect(() => () => markRead.current(), []);

  const startOfToday = new Date().setHours(0, 0, 0, 0);
  const today = n.feed.filter((f) => f.time >= startOfToday);
  const week = n.feed.filter((f) => f.time < startOfToday && f.time >= startOfToday - 6 * 86_400_000);
  const earlier = n.feed.filter((f) => f.time < startOfToday - 6 * 86_400_000);
  const replies = allReplies ? queue.replies : queue.replies.slice(0, 3);
  const nothing = n.needsYou === 0 && (tab === 'you' || n.feed.length === 0);

  return (
    <Screen title="Notifications" backLabel="Home" onBack={onBack}>
      <div className="-mt-3 flex items-center justify-between gap-2">
        <Segmented
          value={tab}
          options={[
            { id: 'all', label: 'All' },
            { id: 'you', label: n.needsYou > 0 ? `Needs you · ${n.needsYou}` : 'Needs you' },
          ]}
          onChange={setTab}
        />
        {n.unread > 0 && (
          <button type="button" onClick={n.markAllRead} className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10">
            Mark all read
          </button>
        )}
      </div>

      {nothing ? (
        <div className="flex flex-col items-center gap-3 py-10 text-center">
          <span className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
            <HugeiconsIcon icon={Notification03Icon} strokeWidth={1.8} className="size-8" />
          </span>
          <div>
            <p className="font-display text-lg font-bold">You’re all caught up</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {tab === 'you' ? 'Nothing is waiting on you right now.' : 'When something happens — a post goes out, a reply needs you — it shows up here.'}
            </p>
          </div>
        </div>
      ) : (
        <>
          {n.needsYou > 0 && (
            <section className="flex flex-col gap-2.5">
              {tab === 'all' && <h2 className="px-4 text-[13px] font-medium tracking-wide text-muted-foreground uppercase">Needs you</h2>}
              {n.alert && <AlertCard card={n.alert} onNavigate={onNavigate} />}
              {replies.map((r) => (
                <ReplyCard key={r.id} reply={r} queue={queue} />
              ))}
              {queue.replies.length > 3 && (
                <button type="button" onClick={() => setAllReplies((v) => !v)} className="cursor-pointer self-center rounded-full px-3 py-1 text-xs font-semibold text-muted-foreground hover:bg-muted">
                  {allReplies ? 'Show fewer' : `Show all ${queue.replies.length} replies`}
                </button>
              )}
              {queue.note && <p className="text-center text-xs font-medium text-muted-foreground">{queue.note}</p>}
              {n.draftPosts.length > 0 && (
                <ActionCard
                  icon={PencilEdit02Icon}
                  tone="attention"
                  title={n.draftPosts.length === 1 ? 'A post is waiting for your yes' : `${n.draftPosts.length} posts are waiting for your yes`}
                  actions={
                    <Button className="h-10 flex-1" onClick={() => onNavigate('posts')}>
                      Review in Post
                    </Button>
                  }
                >
                  <span className="line-clamp-2">“{n.draftPosts[0]!.text}”</span>
                </ActionCard>
              )}
              {n.failedPosts.map((p) => (
                <FailedCard key={p.id} post={p} />
              ))}
            </section>
          )}

          {tab === 'all' && (
            <>
              <FeedGroup label="Today" items={today} n={n} onNavigate={onNavigate} />
              <FeedGroup label="This week" items={week} n={n} onNavigate={onNavigate} />
              <FeedGroup label="Earlier" items={earlier} n={n} onNavigate={onNavigate} />
            </>
          )}
        </>
      )}
    </Screen>
  );
};
