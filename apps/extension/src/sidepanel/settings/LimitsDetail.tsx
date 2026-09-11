import type { ReactNode } from 'react';
import type { ExtensionSettings, User } from '@casper/shared';
import { FREE_TIER, PLAN_PRICING, isPro, monthlyActionsUsed } from '@casper/shared';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Bookmark02Icon,
  Clock01Icon,
  Comment01Icon,
  FavouriteIcon,
  QuillWrite02Icon,
  QuoteDownIcon,
  RepeatIcon,
  Tick02Icon,
  UserAdd01Icon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { SAFETY_PRESETS, presetOf } from '../../lib/presets.js';
import { MAX_SCHEDULED_POSTS } from '../../lib/storage.js';
import { MAX_SEARCH_QUERIES, REPLY_QUEUE_MAX } from '@casper/shared';
import { localDate } from '../../scheduler/timegate.js';
import { platformCapsForToday } from '../../scheduler/quotas.js';
import { AccentButton, Group, ProBadge, Row } from './kit';

/**
 * Limits — what your plan allows, and the daily safety limits that apply on
 * every plan. The only thing Pro changes is the monthly action cap; every
 * feature and every safety limit is the same on Free, and this page says so
 * rather than implying otherwise.
 */
const nextReset = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const Check = () => <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.6} className="mx-auto size-4 text-casper-working" />;

export const LimitsDetail = ({ settings, user, onUpgrade }: { settings: ExtensionSettings; user: User; onUpgrade: () => void }) => {
  const pro = isPro(user.subscriptionStatus ?? 'free');
  const used = monthlyActionsUsed(user);
  const cap = FREE_TIER.monthlyActions;
  const left = Math.max(0, cap - used);
  const fraction = Math.min(1, used / cap);

  const preset = presetOf(settings);
  const full = preset.caps;
  const today = platformCapsForToday(settings, 'twitter', localDate(new Date(), settings.timezone));
  const presetName = SAFETY_PRESETS[settings.safetyPreset]?.label ?? 'Custom';

  const daily = [
    { icon: FavouriteIcon, label: 'Likes', today: today.likesPerDay, full: full.likesPerDay },
    { icon: Comment01Icon, label: 'Replies', today: today.commentsPerDay, full: full.commentsPerDay },
    { icon: UserAdd01Icon, label: 'Follows', today: today.followsPerDay, full: full.followsPerDay },
    { icon: Bookmark02Icon, label: 'Bookmarks', today: today.bookmarksPerDay, full: full.bookmarksPerDay },
    { icon: RepeatIcon, label: 'Reposts', today: today.repostsPerDay, full: full.repostsPerDay },
    { icon: QuoteDownIcon, label: 'Quotes', today: today.quotesPerDay, full: full.quotesPerDay },
  ];

  const compare: { label: string; free: ReactNode; pro: ReactNode }[] = [
    { label: 'Price', free: 'Free', pro: `from ${PLAN_PRICING.weekly.amount}/wk` },
    { label: 'Actions a month', free: String(cap), pro: 'Unlimited' },
    { label: 'Every feature', free: <Check />, pro: <Check /> },
    { label: 'Daily safety limits', free: 'By pace', pro: 'By pace' },
    { label: 'Scheduled posts', free: String(MAX_SCHEDULED_POSTS), pro: String(MAX_SCHEDULED_POSTS) },
    { label: 'Topic feeds', free: String(MAX_SEARCH_QUERIES), pro: String(MAX_SEARCH_QUERIES) },
    { label: 'Replies waiting', free: String(REPLY_QUEUE_MAX), pro: String(REPLY_QUEUE_MAX) },
  ];

  return (
    <>
      {/* This month */}
      <section className="flex flex-col gap-3 rounded-2xl bg-card p-4 shadow-sm ring-1 ring-[color:var(--card-ring)]">
        <div className="flex items-center justify-between gap-2">
          <p className="font-display text-[15px] font-bold">{pro ? 'Ghostly Pro' : 'Free plan'}</p>
          {pro ? <ProBadge /> : <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">FREE</span>}
        </div>
        {pro ? (
          <>
            <p className="font-display text-[28px] leading-none font-extrabold tracking-tight">Unlimited</p>
            <p className="text-sm text-muted-foreground">No monthly cap on actions. The daily safety limits below still apply — they protect your account, not your plan.</p>
          </>
        ) : (
          <>
            <div className="flex items-end justify-between gap-2">
              <p className="font-display text-[28px] leading-none font-extrabold tracking-tight tabular-nums">
                {used}
                <span className="text-base font-bold text-muted-foreground"> / {cap}</span>
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {left} left · resets {nextReset()}
              </p>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-muted">
              <div
                className={cn('h-full rounded-full transition-[width] duration-700', fraction >= 1 ? 'bg-destructive' : fraction >= 0.8 ? 'bg-casper-attention' : 'bg-primary')}
                style={{ width: `${Math.max(fraction > 0 ? 3 : 0, fraction * 100)}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {fraction >= 1
                ? 'You’ve used this month’s actions — I’ll pause until it resets, or upgrade to keep going.'
                : 'Every like, reply and follow counts as one action. Every feature works on Free.'}
            </p>
            <AccentButton onClick={onUpgrade}>Upgrade for unlimited</AccentButton>
          </>
        )}
      </section>

      {/* Free vs Pro */}
      <Group label="Free vs Pro">
        <div className="grid grid-cols-[1fr_auto_auto] text-sm">
          <span className="px-4 py-2.5 text-xs font-semibold text-muted-foreground" />
          {(['Free', 'Pro'] as const).map((p) => (
            <span
              key={p}
              className={cn(
                'w-24 px-2 py-2.5 text-center text-xs font-bold tracking-wide uppercase',
                (p === 'Pro') === pro ? 'bg-primary/10 text-primary' : 'text-muted-foreground',
              )}
            >
              {p}
              {(p === 'Pro') === pro && <span className="block text-[10px] font-semibold normal-case">your plan</span>}
            </span>
          ))}
          {compare.map((r) => (
            <div key={r.label} className="contents">
              <span className="border-t border-(--divider) px-4 py-3">{r.label}</span>
              <span className={cn('w-24 border-t border-(--divider) px-2 py-3 text-center font-semibold tabular-nums', !pro && 'bg-primary/10')}>{r.free}</span>
              <span className={cn('w-24 border-t border-(--divider) px-2 py-3 text-center font-semibold tabular-nums', pro && 'bg-primary/10')}>{r.pro}</span>
            </div>
          ))}
        </div>
      </Group>

      {/* Daily safety limits — the same on every plan */}
      <Group
        label={`Daily safety limits · ${presetName}`}
        footer="The same on Free and Pro. They keep your account looking human, and change with Work pace. New accounts start lower and warm up over the first days. Topic feeds have their own smaller budget on top."
      >
        {daily.map((d) => (
          <Row
            key={d.label}
            icon={d.icon}
            label={d.label}
            hint={d.today < d.full ? `Warming up — full limit ${d.full}` : undefined}
            value={<span className="font-semibold text-foreground tabular-nums">{d.today} / day</span>}
          />
        ))}
        <Row icon={Clock01Icon} label="Actions per hour" value={<span className="font-semibold text-foreground tabular-nums">{preset.hourlyCeiling}</span>} />
        <Row icon={QuillWrite02Icon} label="Posts I write a day" value={<span className="font-semibold text-foreground tabular-nums">{preset.postsPerDay}</span>} />
      </Group>
    </>
  );
};
