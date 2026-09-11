import { useEffect, useState, type ReactNode } from 'react';
import type { ExtensionSettings, SafetyPresetName, SearchQuery, User, VoiceProfile } from '@casper/shared';
import { COMMENT_LENGTHS, TONE_PRESETS } from '@casper/shared';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import {
  Add01Icon,
  Award01Icon,
  Bookmark02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  Comment01Icon,
  ComputerIcon,
  FavouriteIcon,
  Home09Icon,
  Loading03Icon,
  MessageMultiple01Icon,
  Mic01Icon,
  Moon02Icon,
  QuoteDownIcon,
  RepeatIcon,
  Rocket01Icon,
  Search01Icon,
  Sun03Icon,
  Tag01Icon,
  Tick02Icon,
  UserAdd01Icon,
  UserGroupIcon,
} from '@hugeicons/core-free-icons';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { sendToBackground } from '../../lib/messages.js';
import { getAuth as getStoredAuth, getSettings, STORAGE_KEYS } from '../../lib/storage.js';
import { SAFETY_PRESETS, applyPreset, presetOf } from '../../lib/presets.js';
import type { SetupProgress, SetupRead } from '../../background/setup-read.js';
import type { DryRunCandidate } from '../../platforms/common/content-messages.js';
import { COMMENT_LENGTH_LABELS } from '../pages/_shared.js';
import { ACCENT_COLORS, label as nameOf, useAppearance, type AccentColor, type ThemeMode } from '../appearance';
import { Group, Row } from '../settings/kit';
import type { Goal } from './useOnboarding';

/**
 * The onboarding steps. Each one writes straight to settings as the user
 * chooses — so leaving halfway still leaves a partly-configured Ghostly, not
 * nothing — and each is also reachable later from Settings.
 */
export interface StepCtx {
  s: ExtensionSettings;
  update: (next: ExtensionSettings) => void;
  user: User;
  goals: Goal[];
  setGoals: (g: Goal[]) => void;
  setBusy: (b: boolean) => void;
}

const compact = (n: number) =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M` : n >= 1_000 ? `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K` : String(n);

/* -- small shared pieces ------------------------------------------------------ */

export const ChoiceCard = ({
  icon,
  title,
  body,
  on,
  badge,
  onClick,
}: {
  icon?: IconSvgElement;
  title: string;
  body?: ReactNode;
  on: boolean;
  badge?: string;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={cn(
      'flex w-full cursor-pointer items-start gap-3 rounded-3xl bg-card p-4 text-left shadow-sm ring-1 transition active:scale-[0.99]',
      on ? 'ring-2 ring-primary' : 'ring-[color:var(--card-ring)] hover:ring-primary/40',
    )}
  >
    {icon && (
      <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl transition-colors', on ? 'bg-primary text-primary-foreground' : 'bg-primary/12 text-primary')}>
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-5" />
      </span>
    )}
    <span className="min-w-0 flex-1">
      <span className="flex items-center gap-2">
        <span className="font-display text-[15px] font-bold">{title}</span>
        {badge && <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold tracking-wide text-primary uppercase">{badge}</span>}
      </span>
      {body && <span className="mt-0.5 block text-sm leading-snug text-muted-foreground">{body}</span>}
    </span>
    <span className={cn('mt-1 grid size-5 shrink-0 place-items-center rounded-full ring-2 transition', on ? 'bg-primary text-primary-foreground ring-primary' : 'ring-foreground/15')}>
      {on && <HugeiconsIcon icon={Tick02Icon} strokeWidth={3} className="size-3" />}
    </span>
  </button>
);

const Chip = ({ on, onClick, children, danger }: { on: boolean; onClick: () => void; children: ReactNode; danger?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={on}
    className={cn(
      'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition active:scale-95',
      on
        ? danger
          ? 'bg-destructive text-white shadow-sm'
          : 'bg-primary text-primary-foreground shadow-sm'
        : 'bg-background text-foreground/80 ring-1 ring-foreground/10 hover:ring-foreground/25',
    )}
  >
    {on ? (
      <HugeiconsIcon icon={danger ? Cancel01Icon : Tick02Icon} strokeWidth={2.6} className="size-3.5" />
    ) : (
      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-3.5 opacity-60" />
    )}
    {children}
  </button>
);

/** One section of a step, as its own card: an icon, a title, a line of why. */
const StepCard = ({
  icon,
  title,
  body,
  tone = 'primary',
  children,
}: {
  icon: IconSvgElement;
  title: string;
  body: string;
  tone?: 'primary' | 'danger' | 'plain';
  children: ReactNode;
}) => (
  <section
    className={cn(
      'flex flex-col gap-3.5 rounded-4xl p-4 shadow-sm ring-1',
      tone === 'danger'
        ? 'bg-destructive/[0.06] ring-destructive/20'
        : tone === 'primary'
          ? 'bg-primary/[0.07] ring-primary/20'
          : 'bg-card ring-[color:var(--card-ring)]',
    )}
  >
    <div className="flex items-start gap-3">
      <span
        className={cn(
          'grid size-10 shrink-0 place-items-center rounded-2xl',
          tone === 'danger' ? 'bg-destructive/15 text-destructive' : 'bg-primary text-primary-foreground',
        )}
      >
        <HugeiconsIcon icon={icon} strokeWidth={2} className="size-5" />
      </span>
      <div className="min-w-0">
        <p className="font-display text-[15px] leading-tight font-bold">{title}</p>
        <p className="mt-0.5 text-[13px] leading-snug text-muted-foreground">{body}</p>
      </div>
    </div>
    {children}
  </section>
);

const AddInput = ({ placeholder, onAdd }: { placeholder: string; onAdd: (v: string) => void }) => {
  const [v, setV] = useState('');
  const add = () => {
    if (v.trim()) onAdd(v.trim());
    setV('');
  };
  return (
    <div className="flex gap-2">
      <Input value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} placeholder={placeholder} className="h-10" />
      <Button variant="secondary" className="h-10" onClick={add} disabled={!v.trim()}>
        Add
      </Button>
    </div>
  );
};

const SectionLabel = ({ children }: { children: ReactNode }) => (
  <p className="px-1 text-[12px] font-semibold tracking-wide text-muted-foreground uppercase">{children}</p>
);

/* -- 0 · welcome ----------------------------------------------------------------- */

export const WelcomeStep = () => (
  <div className="flex flex-col gap-2.5">
    {[
      { icon: FavouriteIcon, title: 'Engages for you', body: 'Likes, replies and follows on posts that matter to your audience.' },
      { icon: Mic01Icon, title: 'Sounds like you', body: 'Learns your voice. Nothing goes out under your name without your OK.' },
      { icon: Award01Icon, title: 'Grows safely', body: 'Human pace, daily limits and only during your hours.' },
    ].map((f) => (
      <div key={f.title} className="flex items-start gap-3 rounded-3xl bg-card p-4 shadow-sm ring-1 ring-[color:var(--card-ring)]">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/12 text-primary">
          <HugeiconsIcon icon={f.icon} strokeWidth={2} className="size-5" />
        </span>
        <span>
          <span className="block font-display text-[15px] font-bold">{f.title}</span>
          <span className="block text-sm leading-snug text-muted-foreground">{f.body}</span>
        </span>
      </div>
    ))}
  </div>
);

/* -- 1 · goal -------------------------------------------------------------------------- */

type Flags = Pick<ExtensionSettings['homeFeed'], 'like' | 'comment' | 'follow' | 'bookmark' | 'repost' | 'quote'>;

export const GOALS: Record<Goal, { icon: IconSvgElement; title: string; body: string; flags: Flags; followBack: boolean; autoPost: boolean; preset: SafetyPresetName }> = {
  followers: {
    icon: UserGroupIcon,
    title: 'Grow my followers',
    body: 'Reach new people in my niche and get them to follow back.',
    flags: { like: true, comment: true, follow: true, bookmark: false, repost: false, quote: false },
    followBack: true,
    autoPost: false,
    preset: 'balanced',
  },
  engagement: {
    icon: FavouriteIcon,
    title: 'Get more engagement',
    body: 'More likes, replies and conversations around my posts.',
    flags: { like: true, comment: true, follow: false, bookmark: false, repost: false, quote: false },
    followBack: false,
    autoPost: false,
    preset: 'balanced',
  },
  authority: {
    icon: Award01Icon,
    title: 'Become known for my topic',
    body: 'Show up with thoughtful replies wherever my topic is discussed.',
    flags: { like: true, comment: true, follow: false, bookmark: true, repost: false, quote: true },
    followBack: false,
    autoPost: true,
    preset: 'careful',
  },
  promote: {
    icon: Rocket01Icon,
    title: 'Promote what I’m building',
    body: 'Build an audience that cares about my product — and post regularly.',
    flags: { like: true, comment: true, follow: true, bookmark: false, repost: false, quote: false },
    followBack: true,
    autoPost: true,
    preset: 'balanced',
  },
};

/** What the chosen goals add up to: every action any of them wants, the gentlest pace only if all of them ask for it. */
export const combineGoals = (goals: Goal[]) => {
  const flags: Flags = { like: false, comment: false, follow: false, bookmark: false, repost: false, quote: false };
  for (const g of goals) for (const k of Object.keys(flags) as (keyof Flags)[]) flags[k] ||= GOALS[g].flags[k];
  return {
    flags,
    followBack: goals.some((g) => GOALS[g].followBack),
    autoPost: goals.some((g) => GOALS[g].autoPost),
    preset: (goals.length > 0 && goals.every((g) => GOALS[g].preset === 'careful') ? 'careful' : 'balanced') as SafetyPresetName,
  };
};

export const GoalStep = ({ s, update, goals, setGoals }: StepCtx) => {
  const toggle = (g: Goal) => {
    const next = goals.includes(g) ? goals.filter((x) => x !== g) : [...goals, g];
    setGoals(next);
    if (next.length === 0) return;
    // The goals pre-set what Ghostly does; every one can be changed on the actions step.
    const cfg = combineGoals(next);
    update({
      ...s,
      homeFeed: { ...s.homeFeed, ...cfg.flags, enabled: true },
      searchFeed: { ...s.searchFeed, ...cfg.flags },
      followBack: cfg.followBack,
      autoPost: { ...s.autoPost, enabled: cfg.autoPost },
    });
  };
  return (
    <div className="flex flex-col gap-2.5">
      {(Object.keys(GOALS) as Goal[]).map((g) => (
        <ChoiceCard key={g} icon={GOALS[g].icon} title={GOALS[g].title} body={GOALS[g].body} on={goals.includes(g)} onClick={() => toggle(g)} />
      ))}
      <p className="px-1 text-xs text-muted-foreground">Pick as many as you like — they just set good starting choices you can change later.</p>
    </div>
  );
};

/* -- 2 · account ----------------------------------------------------------------------- */

export const useSetupRead = () => {
  const [read, setRead] = useState<SetupRead | null>(null);
  useEffect(() => {
    void sendToBackground<{ ok: boolean; data: SetupRead | null }>({ type: 'GET_SETUP_READ', payload: {} }).then((r) => r.data && setRead(r.data));
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: chrome.storage.AreaName) => {
      if (area === 'local' && STORAGE_KEYS.setupRead in changes) setRead((changes[STORAGE_KEYS.setupRead]!.newValue as SetupRead) ?? null);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);
  return read;
};

export const AccountStep = ({ s, update, setBusy }: StepCtx) => {
  const read = useSetupRead();
  const [reading, setReading] = useState(false);
  const [progress, setProgress] = useState<SetupProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const young = (s.accountAgeMonths.twitter ?? 0) < 6;

  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: chrome.storage.AreaName) => {
      if (area === 'local' && STORAGE_KEYS.setupProgress in changes) setProgress(changes[STORAGE_KEYS.setupProgress]!.newValue as SetupProgress);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const run = async () => {
    setReading(true);
    setBusy(true);
    setError(null);
    try {
      const r = await sendToBackground<{ ok: boolean; data?: SetupRead; error?: { message: string } }>({ type: 'SETUP_READ_ACCOUNT', payload: {} });
      if (!r.ok || !r.data) {
        setError(r.error?.message ?? 'I couldn’t read your account.');
        return;
      }
      // Everything it found starts IN — removing is easier than picking. Only
      // when those lists are still empty, so a re-read never undoes choices.
      const found = r.data;
      const fresh = await getSettings();
      let next = fresh.homeFeed.keywords.length === 0 && found.topics.length > 0 ? withTopics(fresh, found.topics, true) : fresh;
      if (next.targetCreators.length === 0 && found.targets.length > 0) {
        const now = new Date().toISOString();
        next = { ...next, targetCreators: found.targets.map((t) => ({ platform: 'twitter' as const, handle: t.handle, addedAt: now })) };
      }
      if (next !== fresh) update(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'I couldn’t read your account.');
    } finally {
      setReading(false);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {reading ? (
        <div className="flex flex-col items-center gap-4 rounded-4xl bg-card p-6 text-center shadow-sm ring-1 ring-[color:var(--card-ring)]">
          <span className="ghost-motion relative grid size-20 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20 [animation-duration:2s]" />
            <span className="relative grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
              <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-7 animate-spin" />
            </span>
          </span>
          <div>
            <p className="font-display text-lg font-bold">{progress?.label ?? 'Reading your account…'}</p>
            <p className="mt-1 text-sm text-muted-foreground">About a minute. Tabs open and close on their own — that’s me looking things up. Nothing is posted.</p>
          </div>
          {progress && progress.total > 0 && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
            </div>
          )}
        </div>
      ) : read ? (
        <div className="flex items-center gap-3 rounded-4xl bg-card p-4 shadow-sm ring-1 ring-[color:var(--card-ring)]">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">
            {read.handle[0]?.toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 font-display text-base font-bold">
              @{read.handle}
              <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-4 text-casper-working" />
            </p>
            <p className="text-sm text-muted-foreground">
              {read.followers !== null && `${compact(read.followers)} followers · `}
              {read.postsRead} posts read · {read.topics.length} topics · {read.targets.length} people found
            </p>
          </div>
          <Button size="sm" variant="ghost" onClick={() => void run()}>
            Read again
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-4xl bg-card p-5 shadow-sm ring-1 ring-[color:var(--card-ring)]">
          <p className="text-sm leading-relaxed text-muted-foreground">
            I’ll look at your bio, your recent posts and who you follow, then suggest topics and people to watch — so you don’t have to describe yourself. Make sure you’re signed in to x.com.
          </p>
          <Button className="h-12 text-[15px]" onClick={() => void run()}>
            Read my X account
          </Button>
        </div>
      )}
      {error && (
        <div className="flex flex-col gap-2 rounded-3xl bg-destructive/10 p-4 text-sm text-destructive">
          <p>{error}</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void run()}>
              Try again
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void chrome.tabs.create({ url: 'https://x.com/home' })}>
              Open x.com
            </Button>
          </div>
        </div>
      )}

      <Group label="About your account">
        <Row
          label="X Premium"
          hint="Long posts up to 4,000 characters"
          toggle={{ checked: s.xAccountPlan === 'pro', onChange: (v) => update({ ...s, xAccountPlan: v ? 'pro' : 'free', postLength: v ? 'long' : 'short' }) }}
        />
        <Row
          label="Account is under 6 months old"
          hint="I’ll start slower — new accounts get flagged faster"
          toggle={{ checked: young, onChange: (v) => update({ ...s, accountAgeMonths: { ...s.accountAgeMonths, twitter: v ? 3 : 24 } }) }}
        />
      </Group>
    </div>
  );
};

/* -- 3 · topics ------------------------------------------------------------------------- */

const TOPIC_IDEAS = ['AI', 'startups', 'SaaS', 'indie hackers', 'building in public', 'design', 'marketing', 'productivity', 'programming', 'no-code', 'growth', 'crypto'];
const AVOID_IDEAS = ['politics', 'nsfw', 'giveaway', 'religion', 'betting', 'drama'];

/** One place that keeps topics, home-feed keywords and topic feeds in step. */
const withTopics = (s: ExtensionSettings, topics: string[], searchToo: boolean): ExtensionSettings => {
  const now = new Date().toISOString();
  const lower = new Set(topics.map((t) => t.toLowerCase()));
  const oldTopics = new Set(s.contentTopics.map((t) => t.toLowerCase()));
  const kept = s.searchQueries.filter((q) => !oldTopics.has(q.query.toLowerCase()) || lower.has(q.query.toLowerCase()));
  const have = new Set(kept.map((q) => q.query.toLowerCase()));
  const added: SearchQuery[] = searchToo ? topics.filter((t) => !have.has(t.toLowerCase())).map((query) => ({ query, addedAt: now })) : [];
  return {
    ...s,
    contentTopics: topics.slice(0, 10),
    homeFeed: { ...s.homeFeed, keywords: topics },
    searchQueries: searchToo ? [...kept, ...added] : kept.filter((q) => !lower.has(q.query.toLowerCase())),
  };
};

export const TopicsStep = ({ s, update }: StepCtx) => {
  const read = useSetupRead();
  const topics = s.homeFeed.keywords;
  const searchToo = topics.length === 0 || topics.some((t) => s.searchQueries.some((q) => q.query.toLowerCase() === t.toLowerCase()));
  const has = (t: string) => topics.some((x) => x.toLowerCase() === t.toLowerCase());
  const toggle = (t: string) => update(withTopics(s, has(t) ? topics.filter((x) => x.toLowerCase() !== t.toLowerCase()) : [...topics, t], searchToo));
  const ideas = [...(read?.topics ?? []), ...TOPIC_IDEAS].filter((t, i, a) => a.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i);
  const custom = topics.filter((t) => !ideas.some((x) => x.toLowerCase() === t.toLowerCase()));
  const avoid = s.homeFeed.excludeKeywords;
  const avoidAll = [...AVOID_IDEAS, ...avoid.filter((a) => !AVOID_IDEAS.includes(a))];
  const setAvoid = (list: string[]) => update({ ...s, homeFeed: { ...s.homeFeed, excludeKeywords: list } });

  return (
    <div className="flex flex-col gap-4">
      <StepCard
        icon={Tag01Icon}
        title="Engage with posts about"
        body={`I like, reply to and follow people on posts that mention these. ${read?.topics.length ? 'Some come from your own posts. ' : ''}Short words (“AI”, “SaaS”) match more posts than long phrases.`}
      >
        <div className="flex flex-wrap gap-2">
          {[...ideas, ...custom].map((t) => (
            <Chip key={t} on={has(t)} onClick={() => toggle(t)}>
              {t}
            </Chip>
          ))}
        </div>
        <AddInput placeholder="Add your own topic" onAdd={(t) => !has(t) && update(withTopics(s, [...topics, t], searchToo))} />
        <p className="text-xs font-medium text-primary">{topics.length === 0 ? 'Pick at least one' : `${topics.length} selected`}</p>
      </StepCard>

      <StepCard
        icon={Search01Icon}
        title="Where I look for them"
        body="Both are on by default — the home feed keeps you close to who you follow, topic feeds find new people."
        tone="plain"
      >
        <div className="overflow-hidden rounded-3xl bg-background ring-1 ring-foreground/5">
          <Row
            icon={Home09Icon}
            label="Home feed"
            hint="Your own timeline — people you already follow"
            toggle={{ checked: s.homeFeed.enabled, onChange: (v) => update({ ...s, homeFeed: { ...s.homeFeed, enabled: v } }) }}
          />
          <Row
            icon={UserGroupIcon}
            label="Topic feeds"
            hint="Search X for these topics — reach people you don’t follow yet"
            toggle={{ checked: searchToo, onChange: (v) => update(withTopics(s, topics, v)) }}
          />
        </div>
      </StepCard>

      <StepCard
        icon={Cancel01Icon}
        title="Stay away from"
        body="I skip any post that mentions these — even when it matches a topic above. Tap to block."
        tone="danger"
      >
        <div className="flex flex-wrap gap-2">
          {avoidAll.map((t) => {
            const on = avoid.includes(t);
            return (
              <Chip key={t} danger on={on} onClick={() => setAvoid(on ? avoid.filter((x) => x !== t) : [...avoid, t])}>
                {t}
              </Chip>
            );
          })}
        </div>
        <AddInput
          placeholder="Add a word to avoid"
          onAdd={(t) => !avoid.some((a) => a.toLowerCase() === t.toLowerCase()) && setAvoid([...avoid, t])}
        />
      </StepCard>
    </div>
  );
};

/* -- 4 · people ------------------------------------------------------------------------- */

export const PeopleStep = ({ s, update }: StepCtx) => {
  const read = useSetupRead();
  const targets = s.targetCreators;
  const has = (h: string) => targets.some((t) => t.handle.toLowerCase() === h.toLowerCase());
  const add = (h: string) => {
    const clean = h.replace(/^@/, '').trim();
    if (!clean || has(clean)) return;
    update({ ...s, targetCreators: [...targets, { platform: 'twitter', handle: clean, addedAt: new Date().toISOString() }] });
  };
  const remove = (h: string) => update({ ...s, targetCreators: targets.filter((t) => t.handle.toLowerCase() !== h.toLowerCase()) });
  const proposed = read?.targets ?? [];
  const extra = targets.filter((t) => !proposed.some((p) => p.handle.toLowerCase() === t.handle.toLowerCase()));

  return (
    <div className="flex flex-col gap-4">
      {proposed.length > 0 && (
        <Group label="Suggested from who you follow">
          {proposed.map((p) => (
            <Row
              key={p.handle}
              label={
                <span className="flex items-center gap-2">
                  <span className="truncate">@{p.handle}</span>
                  {p.followers !== null && <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{compact(p.followers)}</span>}
                </span>
              }
              hint={p.reason}
              toggle={{ checked: has(p.handle), onChange: (v) => (v ? add(p.handle) : remove(p.handle)) }}
            />
          ))}
        </Group>
      )}
      <div className="flex flex-col gap-2.5">
        <SectionLabel>Add creators your audience follows</SectionLabel>
        <AddInput placeholder="@handle" onAdd={add} />
        {extra.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {extra.map((t) => (
              <span key={t.handle} className="inline-flex h-9 items-center gap-1 rounded-full bg-primary/12 pr-1 pl-3.5 text-sm font-medium">
                @{t.handle}
                <button type="button" onClick={() => remove(t.handle)} aria-label={`Remove @${t.handle}`} className="grid size-7 cursor-pointer place-items-center rounded-full hover:bg-foreground/10">
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
      <p className="px-1 text-xs text-muted-foreground">
        {targets.length === 0 ? 'Optional — 5 to 10 is a good start.' : `${targets.length} ${targets.length === 1 ? 'creator' : 'creators'} — I’ll show up early in their replies.`}
      </p>
    </div>
  );
};

/* -- 5 · actions ------------------------------------------------------------------------ */

export const ActionsStep = ({ s, update, goals }: StepCtx) => {
  const rec = goals.length > 0 ? combineGoals(goals).flags : null;
  const set = (patch: Partial<Flags>) => update({ ...s, homeFeed: { ...s.homeFeed, ...patch }, searchFeed: { ...s.searchFeed, ...patch } });
  const rows: { key: keyof Flags; label: string; hint: string; icon: IconSvgElement }[] = [
    { key: 'like', label: 'Like', hint: 'The lightest touch — gets you noticed', icon: FavouriteIcon },
    { key: 'comment', label: 'Reply', hint: 'Short, relevant replies in your voice', icon: Comment01Icon },
    { key: 'follow', label: 'Follow', hint: 'People likely to follow you back', icon: UserAdd01Icon },
    { key: 'bookmark', label: 'Bookmark', hint: 'Save good posts for later', icon: Bookmark02Icon },
    { key: 'repost', label: 'Repost', hint: 'Share great posts with your followers', icon: RepeatIcon },
    { key: 'quote', label: 'Quote', hint: 'Repost with your own take on top', icon: QuoteDownIcon },
  ];
  return (
    <div className="flex flex-col gap-4">
      <Group label="On posts about your topics">
        {rows.map((r) => (
          <Row
            key={r.key}
            icon={r.icon}
            label={
              <span className="flex items-center gap-2">
                {r.label}
                {rec?.[r.key] && <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary uppercase">For your goal</span>}
              </span>
            }
            hint={r.hint}
            toggle={{ checked: s.homeFeed[r.key], onChange: (v) => set({ [r.key]: v }) }}
          />
        ))}
      </Group>
      <Group label="Around your own account">
        <Row icon={UserGroupIcon} label="Follow back new followers" hint="Within your daily follow limit" toggle={{ checked: s.followBack, onChange: (v) => update({ ...s, followBack: v }) }} />
        <Row
          icon={MessageMultiple01Icon}
          label="Draft replies to mentions"
          hint="When people reply to or mention you"
          toggle={{ checked: s.mentions.enabled, onChange: (v) => update({ ...s, mentions: { ...s.mentions, enabled: v } }) }}
        />
      </Group>
    </div>
  );
};

/* -- 6 · voice -------------------------------------------------------------------------- */

export const VoiceStep = ({ s, update, setBusy }: StepCtx) => {
  const [voice, setVoice] = useState<VoiceProfile | null>(null);
  const [training, setTraining] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void getStoredAuth().then((a) => setVoice(a?.user.voiceProfile ?? null));
  }, []);

  const train = async () => {
    setTraining(true);
    setBusy(true);
    setMsg(null);
    try {
      const r = await sendToBackground<{ ok: true; data: User } | { ok: false; error: { message: string } | string }>({ type: 'TRAIN_VOICE', payload: {} });
      if (r.ok) setVoice(r.data.voiceProfile ?? null);
      else setMsg(typeof r.error === 'string' ? r.error : r.error.message);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Training failed');
    } finally {
      setTraining(false);
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-4xl bg-card p-4 shadow-sm ring-1 ring-[color:var(--card-ring)]">
        <div className="flex items-center gap-3">
          <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', voice ? 'bg-casper-working/15 text-casper-working' : 'bg-primary/12 text-primary')}>
            <HugeiconsIcon icon={voice ? CheckmarkCircle02Icon : Mic01Icon} strokeWidth={2} className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-[15px] font-bold">{voice ? 'I’ve learned your voice' : 'Learn my voice'}</p>
            <p className="text-sm leading-snug text-muted-foreground">
              {voice ? `From ${voice.sampleCount} of your posts.` : 'I read your recent posts once so replies sound like you, not a template.'}
            </p>
          </div>
        </div>
        {voice && <p className="rounded-2xl bg-muted/60 p-3 text-sm leading-relaxed">{voice.summary}</p>}
        <Button className="h-11" variant={voice ? 'secondary' : 'default'} disabled={training} onClick={() => void train()}>
          {training ? (
            <>
              <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-4 animate-spin" data-icon="inline-start" />
              Reading your posts…
            </>
          ) : voice ? (
            'Learn again'
          ) : (
            'Learn my voice'
          )}
        </Button>
        {msg && <p className="text-sm text-destructive">{msg}</p>}
      </div>

      <div className="flex flex-col gap-2.5">
        <SectionLabel>Tone {voice && '(used when your voice doesn’t fit)'}</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {TONE_PRESETS.map((t) => (
            <Chip key={t} on={s.tone === t} onClick={() => update({ ...s, tone: t })}>
              {nameOf(t)}
            </Chip>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <SectionLabel>Reply length</SectionLabel>
        <div className="grid grid-cols-3 gap-2">
          {COMMENT_LENGTHS.map((n) => {
            const [a, b] = COMMENT_LENGTH_LABELS[n].split(' · ');
            return (
              <button
                key={n}
                type="button"
                onClick={() => update({ ...s, commentLength: n })}
                className={cn(
                  'cursor-pointer rounded-2xl p-3 text-center ring-1 transition',
                  s.commentLength === n ? 'bg-primary text-primary-foreground ring-primary' : 'bg-card ring-[color:var(--card-ring)] hover:ring-primary/40',
                )}
              >
                <span className="block font-display text-sm font-bold">{a}</span>
                <span className={cn('block text-[11px]', s.commentLength === n ? 'opacity-80' : 'text-muted-foreground')}>{b}</span>
              </button>
            );
          })}
        </div>
      </div>

      <Group footer="Recommended while you get to know each other. You can turn it off any time.">
        <Row
          label="Ask me before a reply goes out"
          hint="Replies wait for your Approve"
          toggle={{ checked: s.replyApproval !== false, onChange: (v) => update({ ...s, replyApproval: v }) }}
        />
      </Group>
    </div>
  );
};

/* -- 7 · posting ------------------------------------------------------------------------ */

export const PostingStep = ({ s, update }: StepCtx) => (
  <div className="flex flex-col gap-4">
    <ChoiceCard
      icon={Rocket01Icon}
      title="Write posts for me"
      body={`About ${presetOf(s).postsPerDay} a day about your topics, timed for when your audience is online. Each one waits for your yes.`}
      on={s.autoPost.enabled}
      onClick={() => update({ ...s, autoPost: { ...s.autoPost, enabled: !s.autoPost.enabled } })}
    />
    <ChoiceCard
      title="I’ll write my own"
      body="Schedule posts yourself from the Post tab — with AI drafts and best-time suggestions when you want them."
      on={!s.autoPost.enabled}
      onClick={() => update({ ...s, autoPost: { ...s.autoPost, enabled: false } })}
    />
  </div>
);

/* -- 8 · pace & hours ------------------------------------------------------------------- */

const hh = (h: number) => new Date(2000, 0, 1, h).toLocaleTimeString([], { hour: 'numeric' });

export const PaceStep = ({ s, update, goals }: StepCtx) => {
  const young = (s.accountAgeMonths.twitter ?? 0) < 6;
  const rec: SafetyPresetName = young ? 'careful' : combineGoals(goals).preset;
  const hours = s.activeHours;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2.5">
        {(['careful', 'balanced', 'growth'] as SafetyPresetName[]).map((name) => {
          const p = SAFETY_PRESETS[name];
          return (
            <ChoiceCard
              key={name}
              title={p.label}
              badge={name === rec ? 'Recommended' : undefined}
              body={
                <>
                  {p.blurb}
                  <span className="mt-1 block text-xs tabular-nums">
                    Up to {p.caps.likesPerDay} likes · {p.caps.commentsPerDay} replies a day
                  </span>
                </>
              }
              on={s.safetyPreset === name}
              onClick={() => update(applyPreset(s, name))}
            />
          );
        })}
      </div>
      <div className="flex flex-col gap-2.5">
        <SectionLabel>Only work between</SectionLabel>
        <div className="flex items-center gap-2 rounded-3xl bg-card p-2 shadow-sm ring-1 ring-[color:var(--card-ring)]">
          {(['startHour', 'endHour'] as const).map((k, i) => (
            <div key={k} className="flex flex-1 items-center gap-2">
              {i === 1 && <span className="text-sm text-muted-foreground">and</span>}
              <select
                value={hours[k]}
                onChange={(e) => update({ ...s, activeHours: { ...hours, [k]: Number(e.target.value) } })}
                className="h-11 w-full cursor-pointer rounded-2xl bg-muted/60 px-3 font-display text-[15px] font-bold outline-none"
                aria-label={i === 0 ? 'Start' : 'End'}
              >
                {Array.from({ length: 24 }, (_, h) => (
                  <option key={h} value={h}>
                    {hh(h)}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
        <p className="px-1 text-xs text-muted-foreground">In your timezone ({s.timezone}). A person sleeps — so should your account.</p>
      </div>
    </div>
  );
};

/* -- 9 · look --------------------------------------------------------------------------- */

const ACCENT_DOT: Record<(typeof ACCENT_COLORS)[number], string> = {
  twitter: '#1d9bf0',
  amber: 'oklch(0.89 0.07 48.998)',
  blue: 'oklch(0.84 0.07 264.376)',
  cyan: 'oklch(0.84 0.07 223.128)',
  emerald: 'oklch(0.84 0.07 165.612)',
  fuchsia: 'oklch(0.84 0.07 323.949)',
  green: 'oklch(0.84 0.07 150.069)',
  indigo: 'oklch(0.84 0.07 277.023)',
  lime: 'oklch(0.89 0.07 128.85)',
  orange: 'oklch(0.89 0.07 38.402)',
  pink: 'oklch(0.84 0.07 3.958)',
  purple: 'oklch(0.84 0.07 301.924)',
  red: 'oklch(0.84 0.07 27.518)',
  rose: 'oklch(0.84 0.07 16.935)',
  sky: 'oklch(0.84 0.07 242.749)',
  teal: 'oklch(0.84 0.07 186.391)',
  violet: 'oklch(0.84 0.07 292.581)',
  yellow: 'oklch(0.89 0.07 91.936)',
};

export const LookStep = () => {
  const [a, set] = useAppearance();
  const modes: { id: ThemeMode; label: string; icon: IconSvgElement }[] = [
    { id: 'light', label: 'Light', icon: Sun03Icon },
    { id: 'dark', label: 'Dark', icon: Moon02Icon },
    { id: 'system', label: 'System', icon: ComputerIcon },
  ];
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-3 gap-2">
        {modes.map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => set({ mode: m.id })}
            className={cn(
              'flex cursor-pointer flex-col items-center gap-2 rounded-3xl p-4 ring-1 transition',
              a.mode === m.id ? 'bg-primary text-primary-foreground ring-primary' : 'bg-card ring-[color:var(--card-ring)] hover:ring-primary/40',
            )}
          >
            <HugeiconsIcon icon={m.icon} strokeWidth={2} className="size-6" />
            <span className="text-sm font-semibold">{m.label}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        <SectionLabel>Theme colour</SectionLabel>
        <div className="grid grid-cols-6 gap-2.5">
          {ACCENT_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set({ accent: c as AccentColor })}
              title={nameOf(c)}
              aria-label={nameOf(c)}
              aria-pressed={a.accent === c}
              className={cn('grid aspect-square cursor-pointer place-items-center rounded-full ring-offset-2 ring-offset-canvas transition active:scale-90', a.accent === c ? 'ring-2 ring-foreground' : 'hover:scale-105')}
              style={{ background: ACCENT_DOT[c] }}
            >
              {a.accent === c && <HugeiconsIcon icon={Tick02Icon} strokeWidth={3} className="size-4 text-foreground mix-blend-luminosity" />}
            </button>
          ))}
        </div>
        <p className="px-1 text-xs text-muted-foreground">More — base colours, borders, corners — in Settings → Appearance.</p>
      </div>
    </div>
  );
};

/* -- 10 · preview ----------------------------------------------------------------------- */

export const PreviewStep = ({ setBusy }: StepCtx) => {
  const [candidates, setCandidates] = useState<DryRunCandidate[] | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verdicts, setVerdicts] = useState<Record<string, 'good' | 'no'>>({});

  const run = async () => {
    setRunning(true);
    setBusy(true);
    setError(null);
    try {
      const r = await sendToBackground<{ ok: boolean; data?: { candidates: DryRunCandidate[]; scanned: number }; error?: { message: string } }>({
        type: 'DRY_RUN',
        payload: {},
      });
      if (r.ok && r.data) setCandidates(r.data.candidates);
      else setError(r.error?.message ?? 'I couldn’t read your feed just now.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'I couldn’t read your feed just now.');
    } finally {
      setRunning(false);
      setBusy(false);
    }
  };

  const judge = (c: DryRunCandidate, v: 'good' | 'no') => {
    setVerdicts((x) => ({ ...x, [c.postId]: v }));
    // "Not this one" teaches the filter, exactly as in Review.
    if (v === 'no') void sendToBackground({ type: 'DRY_RUN_REJECT', payload: { text: c.text, draft: c.draft ?? null } });
  };

  if (!candidates && !running) {
    return (
      <div className="flex flex-col gap-3 rounded-4xl bg-card p-5 shadow-sm ring-1 ring-[color:var(--card-ring)]">
        <p className="text-sm leading-relaxed text-muted-foreground">
          I’ll read your feed exactly as I would for real, pick the posts I’d engage with and write my replies — without liking, following or posting anything. A tab opens for a minute or two.
        </p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button className="h-12 text-[15px]" onClick={() => void run()}>
          Show me what you’d do
        </Button>
      </div>
    );
  }
  if (running) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-4xl bg-card p-6 text-center shadow-sm ring-1 ring-[color:var(--card-ring)]">
        <HugeiconsIcon icon={Loading03Icon} strokeWidth={2} className="size-8 animate-spin text-primary" />
        <p className="font-display text-base font-bold">Reading your feed the way I would…</p>
        <p className="text-sm text-muted-foreground">Picking posts and writing replies. Nothing is posted.</p>
      </div>
    );
  }
  if (candidates && candidates.length === 0) {
    return (
      <div className="rounded-4xl bg-card p-5 text-center shadow-sm ring-1 ring-[color:var(--card-ring)]">
        <p className="font-display text-base font-bold">Nothing matched just now</p>
        <p className="mt-1 text-sm text-muted-foreground">That’s a real answer — your topics are strict. I’ll keep watching once I start.</p>
        <Button className="mt-3" variant="secondary" onClick={() => void run()}>
          Look again
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2.5">
      {candidates!.slice(0, 5).map((c) => {
        const v = verdicts[c.postId];
        return (
          <div key={c.postId} className={cn('flex flex-col gap-2 rounded-3xl bg-card p-3.5 shadow-sm ring-1 ring-[color:var(--card-ring)] transition', v === 'no' && 'opacity-45')}>
            <p className="text-xs font-semibold text-muted-foreground">{c.authorHandle ? `@${c.authorHandle}` : 'A post in your feed'}</p>
            <p className="line-clamp-3 text-sm leading-snug">{c.text}</p>
            {c.draft && <p className="rounded-2xl rounded-tl-md bg-primary/10 px-3 py-2 text-sm leading-snug">{c.draft}</p>}
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{c.wouldDo.length > 0 ? `Would ${c.wouldDo.join(', ')}` : 'Would read it'}</span>
              {v ? (
                <span className={cn('text-xs font-semibold', v === 'good' ? 'text-casper-working' : 'text-muted-foreground')}>{v === 'good' ? 'Good' : 'Skipped'}</span>
              ) : (
                <span className="flex gap-1.5">
                  <Button size="xs" variant="ghost" onClick={() => judge(c, 'no')}>
                    Not this
                  </Button>
                  <Button size="xs" onClick={() => judge(c, 'good')}>
                    Good
                  </Button>
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* -- 11 · ready ------------------------------------------------------------------------- */

export const ReadySummary = ({ s, user }: StepCtx) => {
  const actions = (['like', 'comment', 'follow', 'bookmark', 'repost', 'quote'] as const).filter((k) => s.homeFeed[k]);
  const words: Record<string, string> = { like: 'like', comment: 'reply', follow: 'follow', bookmark: 'bookmark', repost: 'repost', quote: 'quote' };
  const items: { ok: boolean; label: string; detail: string }[] = [
    { ok: s.homeFeed.keywords.length > 0, label: 'Topics', detail: s.homeFeed.keywords.length > 0 ? s.homeFeed.keywords.slice(0, 4).join(', ') : 'None — I’ll skip your home feed' },
    { ok: s.targetCreators.length > 0, label: 'Creators', detail: s.targetCreators.length > 0 ? `${s.targetCreators.length} to watch` : 'None yet (optional)' },
    { ok: actions.length > 0, label: 'What I do', detail: actions.length > 0 ? actions.map((a) => words[a]).join(', ') : 'Nothing switched on' },
    { ok: true, label: 'Voice', detail: `${nameOf(s.tone)} · ${s.replyApproval !== false ? 'you approve replies' : 'replies go out on their own'}` },
    { ok: true, label: 'Posting', detail: s.autoPost.enabled ? `About ${presetOf(s).postsPerDay} a day, with your OK` : 'You write your own' },
    { ok: true, label: 'Pace', detail: `${SAFETY_PRESETS[s.safetyPreset]?.label ?? 'Custom'} · ${hh(s.activeHours.startHour)}–${hh(s.activeHours.endHour)}` },
  ];
  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-hidden rounded-4xl bg-card shadow-sm ring-1 ring-[color:var(--card-ring)]">
        {items.map((i) => (
          <div key={i.label} className="relative flex items-center gap-3 px-4 py-3 after:absolute after:inset-x-4 after:bottom-0 after:h-px after:bg-(--divider) last:after:hidden">
            <span className={cn('grid size-7 shrink-0 place-items-center rounded-full', i.ok ? 'bg-casper-working/15 text-casper-working' : 'bg-casper-attention/15 text-casper-attention')}>
              <HugeiconsIcon icon={i.ok ? Tick02Icon : Cancel01Icon} strokeWidth={2.6} className="size-3.5" />
            </span>
            <span className="w-20 shrink-0 text-sm font-semibold">{i.label}</span>
            <span className="min-w-0 flex-1 truncate text-right text-sm text-muted-foreground">{i.detail}</span>
          </div>
        ))}
      </div>
      <p className="px-1 text-center text-xs text-muted-foreground">
        Everything here lives in Settings, {user.name.split(' ')[0] || 'friend'} — change it any time.
      </p>
    </div>
  );
};
