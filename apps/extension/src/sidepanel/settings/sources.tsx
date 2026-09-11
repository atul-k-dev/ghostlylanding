import { useState } from 'react';
import type { ExtensionSettings, HomeFeedSettings, Platform, SearchQuery, TargetCreator } from '@casper/shared';
import { MAX_SEARCH_QUERIES } from '@casper/shared';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  Bookmark02Icon,
  Cancel01Icon,
  Comment01Icon,
  FavouriteIcon,
  QuoteDownIcon,
  RepeatIcon,
  Search01Icon,
  UserAdd01Icon,
} from '@hugeicons/core-free-icons';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { sendToBackground } from '../../lib/messages.js';
import { appendGrowthMilestone } from '../../lib/storage.js';
import { Group, Pad, Row } from './kit';

/**
 * Where the posts come from — the four Engagement detail pages: home feed,
 * topic feeds, target creators and the whitelist.
 */
interface Props {
  settings: ExtensionSettings;
  onChange: (s: ExtensionSettings) => void;
}

const PLATFORM: Platform = 'twitter';
const splitList = (text: string) =>
  text
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
const pausedNote = 'Queued — but autopilot is paused, so nothing runs until you turn it on.';

type ActionFlags = Pick<HomeFeedSettings, 'like' | 'comment' | 'follow' | 'bookmark' | 'repost' | 'quote'>;
const ACTIONS = [
  { key: 'like', label: 'Like', icon: FavouriteIcon },
  { key: 'comment', label: 'Auto-reply', icon: Comment01Icon },
  { key: 'follow', label: 'Follow', icon: UserAdd01Icon },
  { key: 'bookmark', label: 'Bookmark', icon: Bookmark02Icon },
  { key: 'repost', label: 'Repost', icon: RepeatIcon },
  { key: 'quote', label: 'Quote', icon: QuoteDownIcon },
] as const;

const ActionRows = ({ flags, set }: { flags: ActionFlags; set: (patch: Partial<ActionFlags>) => void }) =>
  ACTIONS.map((a) => (
    <Row
      key={a.key}
      icon={a.icon}
      label={a.label}
      toggle={{ checked: flags[a.key], onChange: (v) => set({ [a.key]: v }) }}
    />
  ));

const SUGGEST = {
  keywords: ['AI', 'startups', 'SaaS', 'indie hackers', 'building in public', 'design', 'marketing', 'productivity', 'no-code', 'programming', 'growth', 'tech'],
  exclude: ['politics', 'nsfw', 'giveaway', 'airdrop', 'betting', 'religion', 'drama', 'crypto', 'promo', 'onlyfans'],
  bioOnly: ['founder', 'builder', 'developer', 'designer', 'creator', 'indie hacker', 'engineer', 'marketer'],
  bioNever: ['bot', 'crypto', 'nsfw', 'onlyfans', 'follow back', 'giveaway', 'dm for promo', 'forex'],
  topics: ['indie hackers', 'building in public', 'SaaS', 'AI tools', 'startup', 'product launch'],
};

const has = (list: string[], v: string) => list.some((x) => x.toLowerCase() === v.toLowerCase());
const dedupe = (list: string[]) =>
  list.filter((v, i) => list.findIndex((x) => x.toLowerCase() === v.toLowerCase()) === i);

/** Dashed chips to tap-add; the ones already picked are hidden. */
const Suggestions = ({
  options,
  picked,
  onPick,
}: {
  options: string[];
  picked: string[];
  onPick: (v: string) => void;
}) => {
  const open = dedupe(options).filter((o) => !has(picked, o));
  if (open.length === 0) return null;
  return (
    <Pad>
      <p className="mb-2 text-xs font-medium text-muted-foreground">Suggestions</p>
      <div className="flex flex-wrap gap-1.5">
        {open.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => onPick(o)}
            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-full border border-dashed border-foreground/25 px-2.5 text-[13px] text-muted-foreground transition-colors outline-none hover:border-primary hover:bg-primary/10 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30"
          >
            <HugeiconsIcon icon={Add01Icon} strokeWidth={2} className="size-3.5" />
            {o}
          </button>
        ))}
      </div>
    </Pad>
  );
};

/** Keywords as removable chips, a field to type more, and suggestions to tap. */
const TagInput = ({
  values,
  onChange,
  placeholder,
  suggestions,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder: string;
  suggestions: string[];
}) => {
  const [text, setText] = useState('');
  const add = (raw: string) => {
    const next = dedupe([...values, ...splitList(raw)]);
    if (next.length !== values.length) onChange(next);
    setText('');
  };
  return (
    <>
      <Pad className="flex flex-col gap-3">
        {values.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {values.map((v) => (
              <Badge key={v} variant="secondary" className="h-7 gap-1 pr-1 pl-2.5 text-[13px]">
                {v}
                <button
                  type="button"
                  onClick={() => onChange(values.filter((x) => x !== v))}
                  aria-label={`Remove ${v}`}
                  className="grid size-5 cursor-pointer place-items-center rounded-full hover:bg-foreground/10"
                >
                  <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault();
                add(text);
              }
            }}
            onBlur={() => text.trim() && add(text)}
            placeholder={placeholder}
          />
          <Button variant="secondary" onClick={() => add(text)} disabled={!text.trim()}>
            Add
          </Button>
        </div>
      </Pad>
      <Suggestions options={suggestions} picked={values} onPick={add} />
    </>
  );
};

/** Input + Add button, used by every list on these pages. */
const AddField = ({
  value,
  onChange,
  onAdd,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onAdd: () => void;
  placeholder: string;
  disabled?: boolean;
}) => (
  <Pad className="flex gap-2">
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === 'Enter' && onAdd()}
      placeholder={placeholder}
      disabled={disabled}
    />
    <Button onClick={onAdd} disabled={disabled || !value.trim()}>
      <HugeiconsIcon icon={Add01Icon} strokeWidth={2} data-icon="inline-start" />
      Add
    </Button>
  </Pad>
);

const RemoveButton = ({ onClick }: { onClick: () => void }) => (
  <Button variant="ghost" size="icon-sm" onClick={onClick} aria-label="Remove" className="text-muted-foreground hover:text-destructive">
    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
  </Button>
);

export const HomeFeedDetail = ({ settings, onChange }: Props) => {
  const hf = settings.homeFeed;
  const [status, setStatus] = useState<string | null>(null);
  const update = (patch: Partial<HomeFeedSettings>) => onChange({ ...settings, homeFeed: { ...hf, ...patch } });

  const setKeywords = (list: string[]) => {
    update({ keywords: list });
    // Persist to the DB so they survive reinstalls and sync across devices.
    void sendToBackground({ type: 'UPDATE_PREFERENCES', payload: { keywords: list } }).catch(() => {});
  };

  const scanNow = async (p: Platform) => {
    setStatus(`Scanning your ${p} feed…`);
    try {
      await sendToBackground({ type: 'SCAN_HOME_NOW', payload: { platform: p } });
      setStatus(settings.isPaused ? pausedNote : 'Scanning now — a tab will open and start scrolling.');
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'That did not work');
    }
  };

  return (
    <>
      <Group footer="I scroll your own timeline and engage with relevant posts.">
        <Row label="Home feed autopilot" toggle={{ checked: hf.enabled, onChange: (v) => update({ enabled: v }) }} />
      </Group>

      {hf.enabled && (
        <>
          <Group
            label="Actions"
            footer={
              hf.comment
                ? 'Auto-replies are short and relevant, bounded by your daily caps and your keywords. Free plan: 50 actions a month.'
                : undefined
            }
          >
            <ActionRows flags={hf} set={update} />
          </Group>

          <Group
            label="Relevance keywords"
            footer="At least one topic, or I won't act on your home feed at all — I still work target creators and topic feeds."
          >
            <TagInput
              values={hf.keywords}
              onChange={setKeywords}
              placeholder="Add a topic"
              suggestions={[...settings.contentTopics, ...SUGGEST.keywords]}
            />
          </Group>

          <Group label="Exclude keywords" footer="Skip any post containing these words — even if it matches above.">
            <TagInput
              values={hf.excludeKeywords}
              onChange={(list) => update({ excludeKeywords: list })}
              placeholder="Add a word to skip"
              suggestions={SUGGEST.exclude}
            />
          </Group>

          <Group footer={status ?? undefined}>
            {hf.platforms.map((p) => (
              <Row key={p} icon={Search01Icon} label={`Scan my ${p === 'twitter' ? 'X' : p} feed now`} onClick={() => void scanNow(p)} />
            ))}
          </Group>
        </>
      )}
    </>
  );
};

export const TopicFeedsDetail = ({ settings, onChange }: Props) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const queries = settings.searchQueries;
  const full = queries.length >= MAX_SEARCH_QUERIES;
  const sf = settings.searchFeed;

  const addQuery = (raw: string) => {
    const clean = raw.trim();
    if (!clean || full || has(queries.map((q) => q.query), clean)) return;
    onChange({ ...settings, searchQueries: [...queries, { query: clean, addedAt: new Date().toISOString() }] });
  };
  const add = () => {
    addQuery(query);
    setQuery('');
  };

  const runNow = async (q: SearchQuery) => {
    setStatus('Starting…');
    try {
      await sendToBackground({ type: 'SCAN_SEARCH_NOW', payload: { query: q.query } });
      setStatus(settings.isPaused ? pausedNote : `Working the Latest results for "${q.query}"…`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'That did not work');
    }
  };

  return (
    <>
      <Group
        label="Add a feed"
        footer={
          full
            ? `That's the limit of ${MAX_SEARCH_QUERIES} feeds.`
            : 'Works X\'s Latest results for a topic. Search operators work — try "indie hackers min_faves:5 -filter:replies".'
        }
      >
        <AddField value={query} onChange={setQuery} onAdd={add} placeholder="indie hackers" disabled={full} />
        {!full && (
          <Suggestions
            options={[...settings.contentTopics, ...SUGGEST.topics]}
            picked={queries.map((q) => q.query)}
            onPick={addQuery}
          />
        )}
      </Group>

      {queries.length > 0 && (
        <Group label="Your feeds" footer={status ?? undefined}>
          {queries.map((q) => (
            <Row
              key={q.query}
              label={<span className="block truncate">{q.query}</span>}
              trailing={
                <>
                  <Button variant="secondary" size="xs" onClick={() => void runNow(q)}>
                    Run now
                  </Button>
                  <RemoveButton
                    onClick={() => onChange({ ...settings, searchQueries: queries.filter((x) => x.query !== q.query) })}
                  />
                </>
              }
            />
          ))}
        </Group>
      )}

      {queries.length > 0 && (
        <Group
          label="Actions"
          footer="Topic feeds run on their own daily budget, separate from the home feed, so one never starves the other."
        >
          <ActionRows flags={sf} set={(patch) => onChange({ ...settings, searchFeed: { ...sf, ...patch } })} />
        </Group>
      )}

      <Group footer="A reply inside a thread costs the same budget as a top-level post and reaches a fraction of the people.">
        <Row
          label="Skip posts buried in threads"
          toggle={{
            checked: settings.skipReplies !== false,
            onChange: (v) => onChange({ ...settings, skipReplies: v }),
          }}
        />
      </Group>
    </>
  );
};

export const TargetsDetail = ({ settings, onChange }: Props) => {
  const [handle, setHandle] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const targets = settings.targetCreators;

  const add = () => {
    const clean = handle.trim().replace(/^@/, '');
    if (!clean) return;
    if (!targets.some((t) => t.platform === PLATFORM && t.handle.toLowerCase() === clean.toLowerCase())) {
      const next: TargetCreator = { platform: PLATFORM, handle: clean, addedAt: new Date().toISOString() };
      // Change marker for the Growth follower chart.
      void appendGrowthMilestone({ at: next.addedAt, kind: 'target-added', detail: `Added @${clean}` });
      onChange({ ...settings, targetCreators: [...targets, next] });
    }
    setHandle('');
  };

  const run = async (t: TargetCreator, kind: 'posts' | 'followers') => {
    setStatus(kind === 'posts' ? `Visiting @${t.handle}…` : `Scanning @${t.handle}'s followers…`);
    try {
      await sendToBackground({
        type: kind === 'posts' ? 'SCAN_TARGET_NOW' : 'SCAN_FOLLOWERS_NOW',
        payload: { platform: t.platform, handle: t.handle },
      });
      setStatus(
        settings.isPaused
          ? pausedNote
          : kind === 'posts'
            ? `Visiting @${t.handle} now — a tab opens and likes their recent posts.`
            : `Finding @${t.handle}'s followers to follow…`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'That did not work');
    }
  };

  return (
    <>
      <Group label="Add a creator" footer="I visit their profile and engage with their recent posts.">
        <AddField value={handle} onChange={setHandle} onAdd={add} placeholder="@handle" />
      </Group>

      <Group label="Creators" footer={status ?? undefined}>
        {targets.length === 0 ? (
          <Pad className="text-[15px] text-muted-foreground">No creators yet. Add a handle above.</Pad>
        ) : (
          targets.map((t) => (
            <Row
              key={`${t.platform}:${t.handle}`}
              label={<span className="block truncate">@{t.handle}</span>}
              trailing={
                <>
                  <Button variant="secondary" size="xs" onClick={() => void run(t, 'posts')} title="Visit and like their recent posts">
                    Like posts
                  </Button>
                  <Button variant="outline" size="xs" onClick={() => void run(t, 'followers')} title="Follow their followers">
                    Followers
                  </Button>
                  <RemoveButton
                    onClick={() =>
                      onChange({
                        ...settings,
                        targetCreators: targets.filter((x) => !(x.platform === t.platform && x.handle === t.handle)),
                      })
                    }
                  />
                </>
              }
            />
          ))
        )}
      </Group>

      <Group
        footer={
          settings.earlyReply
            ? 'Checking one creator every few minutes and engaging only fresh posts — so your reply lands while the thread is still short.'
            : 'Off: creators are swept every 6 hours, so a reply may arrive long after the post did.'
        }
      >
        <Row
          label="Reply early to new posts"
          toggle={{ checked: settings.earlyReply === true, onChange: (v) => onChange({ ...settings, earlyReply: v }) }}
        />
      </Group>
    </>
  );
};

export const WhitelistDetail = ({ settings, onChange }: Props) => {
  const [handle, setHandle] = useState('');
  const ff = settings.followFilter;
  const list = settings.whitelist;

  const add = () => {
    const clean = handle.trim().replace(/^@/, '');
    if (!clean) return;
    if (!list.some((w) => w.platform === PLATFORM && w.handle.toLowerCase() === clean.toLowerCase())) {
      onChange({ ...settings, whitelist: [...list, { platform: PLATFORM, handle: clean }] });
    }
    setHandle('');
  };

  return (
    <>
      <Group label="Never follow" footer="I will never follow accounts on this list.">
        <AddField value={handle} onChange={setHandle} onAdd={add} placeholder="@handle" />
        {list.map((w) => (
          <Row
            key={`${w.platform}:${w.handle}`}
            label={<span className="block truncate">@{w.handle}</span>}
            trailing={
              <RemoveButton
                onClick={() =>
                  onChange({
                    ...settings,
                    whitelist: list.filter((x) => !(x.platform === w.platform && x.handle === w.handle)),
                  })
                }
              />
            }
          />
        ))}
      </Group>

      <Group label="Only follow back if their bio mentions" footer="Leave empty to follow back everyone.">
        <TagInput
          values={ff.keywords}
          onChange={(list) => onChange({ ...settings, followFilter: { ...ff, keywords: list } })}
          placeholder="Add a word"
          suggestions={SUGGEST.bioOnly}
        />
      </Group>

      <Group
        label="Never follow back if their bio mentions"
        footer="Checked on auto follow-back and on a creator's followers list."
      >
        <TagInput
          values={ff.excludeKeywords}
          onChange={(list) => onChange({ ...settings, followFilter: { ...ff, excludeKeywords: list } })}
          placeholder="Add a word"
          suggestions={SUGGEST.bioNever}
        />
      </Group>
    </>
  );
};
