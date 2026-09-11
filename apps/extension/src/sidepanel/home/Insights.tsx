import { useState } from 'react';
import type { ActionType, PostOutcome } from '@casper/shared';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Bookmark02Icon,
  Clock01Icon,
  Comment01Icon,
  FavouriteIcon,
  QuoteDownIcon,
  RepeatIcon,
  UserAdd01Icon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { setPanelIntent } from '../../lib/storage.js';
import type { PanelTarget } from '../navigation.js';
import { fmtNum } from '../pages/_shared.js';
import type { Growth } from './useGrowth';
import type { TodayNumbers } from './useTodayNumbers';
import { Muted, Segmented, Widget, WIDGET } from './Widget';

/**
 * Home's insight widgets, below the followers chart. Each answers one question
 * a creator actually asks:
 *   Where did today's budget go?        → TodayBudget
 *   When should I post?                 → BestTime
 *   Which creators / topics work?       → WhatsWorking
 *   Posts or replies — what gets seen?  → Attention
 *   What did best?                      → TopPosts
 */

const ACTION: Record<ActionType, { label: string; icon: IconSvgElement }> = {
  like: { label: 'Likes', icon: FavouriteIcon },
  comment: { label: 'Replies', icon: Comment01Icon },
  follow: { label: 'Follows', icon: UserAdd01Icon },
  bookmark: { label: 'Bookmarks', icon: Bookmark02Icon },
  repost: { label: 'Reposts', icon: RepeatIcon },
  quote: { label: 'Quotes', icon: QuoteDownIcon },
};

const Bar = ({ fraction, className }: { fraction: number; className?: string }) => (
  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
    <div
      className={cn('h-full rounded-full bg-primary transition-[width] duration-700', className)}
      style={{ width: `${Math.max(fraction > 0 ? 4 : 0, Math.min(1, fraction) * 100)}%` }}
    />
  </div>
);

/* -- where today's budget went ----------------------------------------------- */

export const TodayBudget = ({ today }: { today: TodayNumbers }) => (
  <Widget
    title="Today’s activity"
    subtitle="Each action has its own safe daily limit"
    action={
      <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums">
        {today.used}/{today.allowance}
      </span>
    }
  >
    <div className="flex flex-col gap-3">
      {today.byType.map((b) => {
        const full = b.cap > 0 && b.done >= b.cap;
        return (
          <div key={b.type} className="flex items-center gap-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/12 text-primary">
              <HugeiconsIcon icon={ACTION[b.type].icon} strokeWidth={2} className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="mb-1.5 flex items-baseline justify-between text-sm">
                <span className="font-medium">{ACTION[b.type].label}</span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {full ? 'Done for today' : `${b.done} of ${b.cap}`}
                </span>
              </div>
              <Bar fraction={b.cap > 0 ? b.done / b.cap : 0} className={full ? 'bg-casper-working' : undefined} />
            </div>
          </div>
        );
      })}
    </div>
  </Widget>
);

/* -- when to post -------------------------------------------------------------- */

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const BestTime = ({ growth, onNavigate }: { growth: Growth; onNavigate: (t: PanelTarget) => void }) => {
  const bt = growth.bestTimes;
  if (!bt) return null;
  const max = Math.max(0.0001, ...bt.heatmap.map((c) => c.score));
  const [best, ...more] = bt.labels;
  const nowDay = new Date().getDay();
  const nowHour = new Date().getHours();

  return (
    <Widget
      title="Best time to post"
      subtitle={bt.personalised ? 'From how your own posts performed' : 'A good default until I learn your audience'}
    >
      <div className="flex items-center gap-3 rounded-3xl bg-primary/8 p-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
          <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl leading-tight font-extrabold tracking-tight">{best ?? '—'}</p>
          {more.length > 0 && <p className="truncate text-xs text-muted-foreground">Also good: {more.slice(0, 2).join(', ')}</p>}
        </div>
        <button
          type="button"
          onClick={() => onNavigate('posts')}
          className="h-9 shrink-0 cursor-pointer rounded-full bg-primary px-3.5 text-xs font-bold text-primary-foreground transition hover:bg-primary/85"
        >
          Plan a post
        </button>
      </div>

      <div>
        <div className="grid grid-cols-[14px_repeat(24,minmax(0,1fr))] gap-[2px]">
          {DAYS.map((d, wd) => (
            <div key={wd} className="contents">
              <span className={cn('flex items-center text-[9px]', wd === nowDay ? 'font-bold text-primary' : 'text-muted-foreground')}>
                {d}
              </span>
              {Array.from({ length: 24 }, (_, h) => {
                const cell = bt.heatmap.find((c) => c.weekday === wd && c.hour === h);
                const k = cell && cell.score > 0 ? cell.score / max : 0;
                const now = wd === nowDay && h === nowHour;
                return (
                  <span
                    key={h}
                    title={`${d} ${h}:00`}
                    className={cn('aspect-square rounded-[3px]', k === 0 && 'bg-muted', now && 'ring-1 ring-foreground')}
                    style={k > 0 ? { background: `color-mix(in oklch, var(--primary) ${Math.round(12 + k * 88)}%, transparent)` } : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-1.5 grid grid-cols-[14px_repeat(4,minmax(0,1fr))] text-[10px] text-muted-foreground">
          <span />
          {['12a', '6a', '12p', '6p'].map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </Widget>
  );
};

/* -- which creators / topics are working ---------------------------------------- */

export const WhatsWorking = ({ growth }: { growth: Growth }) => {
  const [tab, setTab] = useState<'creators' | 'topics'>('creators');
  const summary = growth.summary;
  if (!summary) return null;
  const creators = [...summary.targets].sort((a, b) => b.engagement.likes - a.engagement.likes).slice(0, 6);
  const topics = [...summary.topics].sort((a, b) => b.repliesSent - a.repliesSent).slice(0, 6);
  const topLikes = Math.max(1, ...creators.map((c) => c.engagement.likes));
  const topReplies = Math.max(1, ...topics.map((t) => t.repliesSent));

  return (
    <Widget
      title="What’s working"
      subtitle="Likes my replies earned, by source"
      action={
        <Segmented
          value={tab}
          options={[
            { id: 'creators', label: 'Creators' },
            { id: 'topics', label: 'Topics' },
          ]}
          onChange={setTab}
        />
      }
    >
      {tab === 'creators' ? (
        creators.length === 0 ? (
          <Muted>No replies to a target creator yet.</Muted>
        ) : (
          <div className="flex flex-col gap-3">
            {creators.map((c, i) => (
              <div key={c.handle} className="flex items-center gap-3">
                <span className="w-4 shrink-0 text-center font-display text-sm font-bold text-muted-foreground">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="truncate font-medium">@{c.handle}</span>
                      {c.stale && (
                        <span className="shrink-0 rounded-full bg-casper-attention/15 px-1.5 py-0.5 text-[10px] font-semibold text-casper-attention">
                          quiet
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      ♥ {fmtNum(c.engagement.likes)} · {c.repliesSent} replies
                    </span>
                  </div>
                  <Bar fraction={c.engagement.likes / topLikes} className={c.stale ? 'bg-muted-foreground/40' : undefined} />
                </div>
                {c.stale && (
                  <button
                    type="button"
                    onClick={() => void growth.dropTarget(c.handle)}
                    className="shrink-0 cursor-pointer rounded-full px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
                  >
                    Drop
                  </button>
                )}
              </div>
            ))}
          </div>
        )
      ) : topics.length === 0 ? (
        <Muted>No keyword-matched replies yet.</Muted>
      ) : (
        <div className="flex flex-col gap-3">
          {topics.map((t, i) => (
            <div key={t.keyword} className="flex items-center gap-3">
              <span className="w-4 shrink-0 text-center font-display text-sm font-bold text-muted-foreground">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
                  <span className="truncate font-medium">“{t.keyword}”</span>
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{t.repliesSent} replies</span>
                </div>
                <Bar fraction={t.repliesSent / topReplies} className={t.stale ? 'bg-muted-foreground/40' : undefined} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
};

/* -- posts vs replies ------------------------------------------------------------ */

export const Attention = ({ growth }: { growth: Growth }) => {
  const s = growth.summary;
  if (!s) return null;
  const { postsLikes, repliesLikes } = s.sources;
  const total = postsLikes + repliesLikes;
  if (total === 0) return null;
  const r = 38;
  const c = 2 * Math.PI * r;
  const posts = postsLikes / total;

  return (
    <Widget title="Where attention comes from" subtitle="Likes on your posts vs. on my replies">
      <div className="flex items-center gap-5">
        <div className="relative grid size-[104px] shrink-0 place-items-center">
          <svg viewBox="0 0 100 100" className="absolute inset-0 -rotate-90" aria-hidden>
            <circle cx="50" cy="50" r={r} fill="none" strokeWidth="14" className="stroke-primary/20" />
            <circle
              cx="50"
              cy="50"
              r={r}
              fill="none"
              strokeWidth="14"
              strokeDasharray={`${c * posts} ${c}`}
              className="stroke-primary transition-[stroke-dasharray] duration-700"
            />
          </svg>
          <div className="text-center">
            <p className="font-display text-lg leading-none font-extrabold tabular-nums">{fmtNum(total)}</p>
            <p className="text-[10px] text-muted-foreground">likes</p>
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <Legend swatch="bg-primary" label="Your posts" value={postsLikes} pct={posts} />
          <Legend swatch="bg-primary/25" label="My replies" value={repliesLikes} pct={1 - posts} />
        </div>
      </div>
    </Widget>
  );
};

const Legend = ({ swatch, label, value, pct }: { swatch: string; label: string; value: number; pct: number }) => (
  <div className="flex items-center gap-2.5">
    <span className={cn('size-3 shrink-0 rounded-full', swatch)} />
    <div className="min-w-0 flex-1">
      <p className="text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {fmtNum(value)} likes · {Math.round(pct * 100)}%
      </p>
    </div>
  </div>
);

/* -- what did best ----------------------------------------------------------------- */

const PostCard = ({ post, onWriteLike }: { post: PostOutcome; onWriteLike: (text: string) => void }) => (
  <div className={cn(WIDGET, 'flex w-[240px] shrink-0 snap-start flex-col gap-3 p-3.5')}>
    <a href={post.url} target="_blank" rel="noreferrer" className="flex flex-1 flex-col gap-2">
      <span className="w-fit rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
        {post.isReply ? 'Reply' : 'Post'}
      </span>
      <p className="line-clamp-4 text-sm leading-snug">{post.text || (post.isReply ? '(reply)' : '(post)')}</p>
    </a>
    <div className="flex items-center gap-3 text-xs text-muted-foreground tabular-nums">
      <span className="inline-flex items-center gap-1 font-semibold text-primary">
        <HugeiconsIcon icon={FavouriteIcon} strokeWidth={2} className="size-3.5" />
        {fmtNum(post.likes)}
      </span>
      <span className="inline-flex items-center gap-1">
        <HugeiconsIcon icon={Comment01Icon} strokeWidth={2} className="size-3.5" />
        {fmtNum(post.replies)}
      </span>
      {post.views !== null && (
        <span className="ml-auto inline-flex items-center gap-1">
          <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-3.5" />
          {fmtNum(post.views)}
        </span>
      )}
    </div>
    {!post.isReply && post.text && (
      <button
        type="button"
        onClick={() => onWriteLike(post.text)}
        className="h-8 cursor-pointer rounded-full bg-primary/10 text-xs font-semibold text-primary transition hover:bg-primary/15"
      >
        Write another like this
      </button>
    )}
  </div>
);

export const TopPosts = ({ growth, onNavigate }: { growth: Growth; onNavigate: (t: PanelTarget) => void }) => {
  const r = growth.summary?.replies;
  if (!r || r.top.length === 0) return null;
  const writeLike = async (text: string) => {
    await setPanelIntent({ type: 'write-like', seedText: text });
    onNavigate('posts');
  };
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between px-1">
        <h2 className="font-display text-[17px] font-bold tracking-tight">Your best posts</h2>
        <p className="text-xs text-muted-foreground tabular-nums">avg ♥ {r.avgLikes} · {r.tracked} measured</p>
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-px-4 px-4 pb-1">
        {r.top.map((p) => (
          <PostCard key={p.tweetId} post={p} onWriteLike={(t) => void writeLike(t)} />
        ))}
      </div>
    </section>
  );
};

/* -- auto-tune drops (only when there are some) ------------------------------------ */

export const AutoTuneDrops = ({ growth }: { growth: Growth }) => {
  if (growth.drops.length === 0) return null;
  return (
    <section className={cn(WIDGET, 'flex flex-col gap-3 bg-casper-attention/8')}>
      <div>
        <h2 className="font-display text-[17px] font-bold tracking-tight">
          I dropped {growth.drops.length} quiet creator{growth.drops.length === 1 ? '' : 's'}
        </h2>
        <p className="mt-0.5 text-xs text-muted-foreground">No replies in 3+ weeks. Undo any of them.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {growth.drops.map((d) => (
          <button
            key={d.handle}
            type="button"
            onClick={() => void growth.undoDrop(d)}
            className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-background px-3 text-xs font-medium ring-1 ring-foreground/10 hover:bg-muted"
          >
            @{d.handle}
            <span className="text-primary">Undo</span>
          </button>
        ))}
      </div>
    </section>
  );
};
