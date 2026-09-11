import { useEffect, useMemo, useState } from 'react';
import type { ExtensionSettings, Platform, TargetCreator, SearchQuery } from '@casper/shared';
import { MAX_SEARCH_QUERIES } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import { getSettings, setSettings, appendGrowthMilestone } from '../../lib/storage.js';
import { Section } from './_shared.js';

/**
 * Who I watch — one page for every source of posts.
 *
 * Four separate sections of the old six-tab dashboard (home feed, topic feeds,
 * target creators, whitelist) merged in updateplan 1.6. They were always one
 * decision — "where do the posts come from?" — split across a settings tab and
 * three collapsible panels, which is how people ended up with topic feeds saved
 * and the home feed switched off, engaging nothing and being told nothing (D8).
 *
 * The live count at the top is there for exactly that: it says what this
 * configuration actually adds up to, before the user closes the panel.
 */

const HomeFeedSection = ({
  settings,
  onChange,
}: {
  settings: ExtensionSettings;
  onChange: (s: ExtensionSettings) => void;
}) => {
  const hf = settings.homeFeed;
  const [keywordText, setKeywordText] = useState(hf.keywords.join(', '));
  const [excludeText, setExcludeText] = useState(hf.excludeKeywords.join(', '));
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const update = (patch: Partial<typeof hf>) =>
    onChange({ ...settings, homeFeed: { ...hf, ...patch } });

  const commitExclude = () => {
    const list = excludeText
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    update({ excludeKeywords: list });
  };

  const commitKeywords = () => {
    const list = keywordText
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    update({ keywords: list });
    // Persist to the DB so they survive reinstalls and sync across devices.
    void sendToBackground({ type: 'UPDATE_PREFERENCES', payload: { keywords: list } }).catch(
      () => {},
    );
  };

  const scanNow = async (p: Platform) => {
    setScanStatus(`Scanning ${p} feed…`);
    try {
      await sendToBackground({ type: 'SCAN_HOME_NOW', payload: { platform: p } });
      setScanStatus(
        settings.isPaused
          ? `Queued — but the engine is Paused. Hit "● Active" so it runs.`
          : `Scanning ${p} now — a tab will open and start scrolling.`,
      );
    } catch (err) {
      setScanStatus(err instanceof Error ? err.message : 'failed');
    }
  };

  const Check = ({
    checked,
    onToggle,
    label,
  }: {
    checked: boolean;
    onToggle: () => void;
    label: string;
  }) => (
    <label className="flex items-center gap-2 text-xs text-casper-ink/80">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-3.5 w-3.5 rounded border-casper-ink/20 text-casper-violet focus:ring-casper-violet/30"
      />
      {label}
    </label>
  );

  return (
    <Section
      title="Home feed autopilot"
      subtitle="Ghostly247 scrolls your own timeline and engages with relevant posts."
    >
      <label className="flex items-center justify-between">
        <span className="text-xs font-medium text-casper-ink">Enable autopilot</span>
        <button
          type="button"
          onClick={() => update({ enabled: !hf.enabled })}
          aria-pressed={hf.enabled}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            hf.enabled
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-casper-ink/10 text-casper-ink/60'
          }`}
        >
          {hf.enabled ? 'On' : 'Off'}
        </button>
      </label>

      {hf.enabled && (
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1.5 font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
              Actions
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <Check checked={hf.like} onToggle={() => update({ like: !hf.like })} label="Like" />
              <Check
                checked={hf.comment}
                onToggle={() => update({ comment: !hf.comment })}
                label="Auto-reply"
              />
              <Check
                checked={hf.follow}
                onToggle={() => update({ follow: !hf.follow })}
                label="Follow"
              />
              <Check
                checked={hf.bookmark}
                onToggle={() => update({ bookmark: !hf.bookmark })}
                label="Bookmark"
              />
              <Check
                checked={hf.repost}
                onToggle={() => update({ repost: !hf.repost })}
                label="Repost"
              />
              <Check
                checked={hf.quote}
                onToggle={() => update({ quote: !hf.quote })}
                label="Quote"
              />
            </div>
            {hf.comment && (
              <p className="mt-2 text-xs text-casper-ink/40">
                Ghostly247 posts a short, relevant reply automatically. Bounded by your daily caps &
                relevance keywords — toggle the Active pill to stop everything instantly. Free plan:
                50 actions per month (likes + replies + follows). Needs your Ghostly247 server running.
              </p>
            )}
          </div>

          <div>
            <p className="mb-1.5 font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
              Relevance keywords
            </p>
            <input
              type="text"
              value={keywordText}
              onChange={(e) => setKeywordText(e.target.value)}
              onBlur={commitKeywords}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitKeywords();
              }}
              placeholder="design, startups, ai (comma-separated)"
              className="w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
            />
            <p className="mt-1 text-xs text-casper-ink/40">
              At least one topic, or I won't act on your home feed at all — I'll still work any
              target accounts or searches below.
            </p>
          </div>

          <div>
            <p className="mb-1.5 font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
              Exclude keywords
            </p>
            <input
              type="text"
              value={excludeText}
              onChange={(e) => setExcludeText(e.target.value)}
              onBlur={commitExclude}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitExclude();
              }}
              placeholder="politics, nsfw, crypto (comma-separated)"
              className="w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
            />
            <p className="mt-1 text-xs text-casper-ink/40">
              Skip any post containing these words — even if it matches above.
            </p>
          </div>

          <div className="flex gap-2">
            {hf.platforms.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => scanNow(p)}
                className="rounded-lg bg-casper-violet/10 px-3 py-1.5 text-xs capitalize text-casper-violet transition hover:bg-casper-violet/20"
              >
                Scan {p} now
              </button>
            ))}
          </div>
          {scanStatus && <p className="text-xs text-casper-ink/50">{scanStatus}</p>}
        </div>
      )}
    </Section>
  );
};


const SearchSection = ({
  settings,
  onChange,
}: {
  settings: ExtensionSettings;
  onChange: (s: ExtensionSettings) => void;
}) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const queries = settings.searchQueries;
  const full = queries.length >= MAX_SEARCH_QUERIES;

  const add = () => {
    const clean = query.trim();
    if (!clean || full) return;
    if (queries.some((q) => q.query.toLowerCase() === clean.toLowerCase())) {
      setQuery('');
      return;
    }
    const next: SearchQuery = { query: clean, addedAt: new Date().toISOString() };
    onChange({ ...settings, searchQueries: [...queries, next] });
    setQuery('');
  };

  const remove = (q: SearchQuery) =>
    onChange({ ...settings, searchQueries: queries.filter((x) => x.query !== q.query) });

  // The topics already typed in for the home feed are the single most common
  // thing anyone would type in here too — and until this existed, a topic
  // feed only ever worked the accounts already followed, one at a time,
  // instead of reaching anyone else posting about the same thing. One click
  // instead of retyping the same words.
  const existing = new Set(queries.map((q) => q.query.toLowerCase()));
  const missingTopics = settings.contentTopics.filter((t) => !existing.has(t.toLowerCase()));
  const addMyTopics = () => {
    const room = Math.max(0, MAX_SEARCH_QUERIES - queries.length);
    if (room === 0 || missingTopics.length === 0) return;
    const now = new Date().toISOString();
    const added: SearchQuery[] = missingTopics
      .slice(0, room)
      .map((query) => ({ query, addedAt: now }));
    onChange({ ...settings, searchQueries: [...queries, ...added] });
  };

  const runNow = async (q: SearchQuery) => {
    setStatus('Starting…');
    try {
      await sendToBackground({ type: 'SCAN_SEARCH_NOW', payload: { query: q.query } });
      setStatus(
        settings.isPaused
          ? 'Queued — but the engine is Paused. Hit "● Active" up top so it runs.'
          : `Working the Latest results for "${q.query}"…`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'failed');
    }
  };

  const sf = settings.searchFeed;
  const updateSf = (patch: Partial<typeof sf>) =>
    onChange({ ...settings, searchFeed: { ...sf, ...patch } });

  const Check = ({
    checked,
    onToggle,
    label,
  }: {
    checked: boolean;
    onToggle: () => void;
    label: string;
  }) => (
    <label className="flex items-center gap-2 text-xs text-casper-ink/80">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-3.5 w-3.5 rounded border-casper-ink/20 text-casper-violet focus:ring-casper-violet/30"
      />
      {label}
    </label>
  );

  return (
    <Section
      title="Topic feeds"
      subtitle="Work X's Latest results for a topic, instead of whatever the home feed serves you."
    >
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="indie hackers"
          disabled={full}
          className="flex-1 rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-sm focus:border-casper-violet focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={add}
          disabled={full}
          className="rounded-lg bg-casper-violet px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          Add
        </button>
      </div>
      <p className="mt-1 text-xs text-casper-ink/40">
        {full
          ? `That's the limit of ${MAX_SEARCH_QUERIES} feeds.`
          : `X's search operators work here — try "indie hackers min_faves:5 -filter:replies".`}
      </p>

      {missingTopics.length > 0 && !full && (
        <button
          type="button"
          onClick={addMyTopics}
          className="mt-2 rounded-lg border border-casper-violet/30 px-2.5 py-1 text-xs font-medium text-casper-violet transition hover:bg-casper-violet/10"
        >
          + Add my {missingTopics.length === 1 ? 'topic' : `${missingTopics.length} topics`} as
          search feeds too
        </button>
      )}

      {queries.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {queries.map((q) => (
            <div
              key={q.query}
              className="flex items-center gap-2 rounded-lg bg-casper-cloud px-2 py-1.5"
            >
              <span className="flex-1 truncate text-xs" title={q.query}>
                {q.query}
              </span>
              <button
                type="button"
                onClick={() => runNow(q)}
                className="text-xs text-casper-violet transition hover:opacity-80"
              >
                Run now
              </button>
              <button
                type="button"
                onClick={() => remove(q)}
                aria-label="Remove"
                className="text-casper-ink/30 transition hover:text-casper-coral"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {status && <p className="mt-2 text-xs text-casper-ink/50">{status}</p>}

      {queries.length > 0 && (
        <div className="mt-3 border-t border-casper-border pt-3">
          <p className="mb-1.5 font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
            Actions — separate from the home feed&rsquo;s
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Check checked={sf.like} onToggle={() => updateSf({ like: !sf.like })} label="Like" />
            <Check
              checked={sf.comment}
              onToggle={() => updateSf({ comment: !sf.comment })}
              label="Auto-reply"
            />
            <Check
              checked={sf.follow}
              onToggle={() => updateSf({ follow: !sf.follow })}
              label="Follow"
            />
            <Check
              checked={sf.bookmark}
              onToggle={() => updateSf({ bookmark: !sf.bookmark })}
              label="Bookmark"
            />
            <Check
              checked={sf.repost}
              onToggle={() => updateSf({ repost: !sf.repost })}
              label="Repost"
            />
            <Check
              checked={sf.quote}
              onToggle={() => updateSf({ quote: !sf.quote })}
              label="Quote"
            />
          </div>
          <p className="mt-1.5 text-xs text-casper-ink/40">
            Topic feeds run on their own daily budget — separate from the home feed, so one can never
            starve the other.
          </p>
        </div>
      )}

      <label className="mt-3 flex items-center gap-2 border-t border-casper-border pt-3 text-xs text-casper-ink/80">
        <input
          type="checkbox"
          checked={settings.skipReplies !== false}
          onChange={() => onChange({ ...settings, skipReplies: !(settings.skipReplies !== false) })}
          className="h-3.5 w-3.5 rounded border-casper-ink/20 text-casper-violet focus:ring-casper-violet/30"
        />
        Skip posts buried in someone else&rsquo;s thread
      </label>
      <p className="mt-1 text-xs leading-relaxed text-casper-ink/40">
        A reply inside a thread costs the same daily budget as a top-level post and reaches a
        fraction of the people.
      </p>
    </Section>
  );
};


const TargetsSection = ({
  settings,
  onChange,
}: {
  settings: ExtensionSettings;
  onChange: (s: ExtensionSettings) => void;
}) => {
  const [platform, setPlatform] = useState<Platform>('twitter');
  const [handle, setHandle] = useState('');
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const add = () => {
    const clean = handle.trim().replace(/^@/, '');
    if (!clean) return;
    if (
      settings.targetCreators.some(
        (t) => t.platform === platform && t.handle.toLowerCase() === clean.toLowerCase(),
      )
    ) {
      setHandle('');
      return;
    }
    const next: TargetCreator = {
      platform,
      handle: clean,
      addedAt: new Date().toISOString(),
    };
    // Change marker for the Growth tab's follower chart (updateplan 5.1).
    void appendGrowthMilestone({
      at: next.addedAt,
      kind: 'target-added',
      detail: `Added @${clean}`,
    });
    onChange({ ...settings, targetCreators: [...settings.targetCreators, next] });
    setHandle('');
  };

  const remove = (target: TargetCreator) => {
    onChange({
      ...settings,
      targetCreators: settings.targetCreators.filter(
        (t) => !(t.platform === target.platform && t.handle === target.handle),
      ),
    });
  };

  const scanNow = async (target: TargetCreator) => {
    setScanStatus(`Visiting @${target.handle}…`);
    try {
      await sendToBackground({
        type: 'SCAN_TARGET_NOW',
        payload: { platform: target.platform, handle: target.handle },
      });
      setScanStatus(
        settings.isPaused
          ? `Queued — but the engine is Paused. Hit "● Active" up top so it runs.`
          : `Visiting @${target.handle} now — a tab opens and likes their recent posts.`,
      );
    } catch (err) {
      setScanStatus(err instanceof Error ? err.message : 'failed');
    }
  };

  const scanFollowersNow = async (target: TargetCreator) => {
    setScanStatus(`Scanning @${target.handle}'s followers…`);
    try {
      await sendToBackground({
        type: 'SCAN_FOLLOWERS_NOW',
        payload: { platform: target.platform, handle: target.handle },
      });
      setScanStatus(
        settings.isPaused
          ? `Queued — but the engine is Paused. Hit "● Active" up top so it runs.`
          : `Finding @${target.handle}'s followers to follow…`,
      );
    } catch (err) {
      setScanStatus(err instanceof Error ? err.message : 'failed');
    }
  };

  return (
    <Section
      title="Target creators"
      subtitle='Add a creator, make sure the engine is "● Active", then tap Like posts — Ghostly247 visits their profile and likes their recent posts in one tab.'
    >
      <div className="flex gap-2">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          className="rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs"
        >
          <option value="twitter">twitter</option>
        </select>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          placeholder="@handle"
          className="flex-1 rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          disabled={!handle.trim()}
          className="rounded-lg bg-casper-violet px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {settings.targetCreators.length === 0 ? (
        <p className="mt-3 text-xs text-casper-ink/40">No targets yet. Add a handle above.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {settings.targetCreators.map((t) => (
            <li
              key={`${t.platform}:${t.handle}`}
              className="flex items-center justify-between rounded-lg bg-casper-cloud px-2 py-1.5 text-xs"
            >
              <span>
                <span className="text-casper-ink/40">{t.platform[0]?.toUpperCase()}</span>{' '}
                <span>@{t.handle}</span>
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scanNow(t)}
                  className="rounded-md border border-casper-violet/30 bg-casper-violet/10 px-2 py-0.5 text-xs font-medium text-casper-violet transition hover:bg-casper-violet/20"
                  title="Visit this profile and like their recent posts"
                >
                  Like posts
                </button>
                <button
                  type="button"
                  onClick={() => scanFollowersNow(t)}
                  className="rounded-md border border-casper-ink/10 px-2 py-0.5 text-xs text-casper-ink/70 transition hover:bg-white/5"
                  title="Find this creator's followers and follow them"
                >
                  Followers
                </button>
                <button
                  type="button"
                  onClick={() => remove(t)}
                  aria-label="Remove"
                  className="rounded px-1.5 py-0.5 text-[12px] text-rose-400 hover:bg-rose-500/10"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {scanStatus && <p className="mt-2 text-xs text-casper-ink/50">{scanStatus}</p>}
          <label className="mt-3 flex items-center gap-2 border-t border-casper-border pt-3 text-xs text-casper-ink/80">
        <input
          type="checkbox"
          checked={settings.earlyReply === true}
          onChange={() => onChange({ ...settings, earlyReply: !settings.earlyReply })}
          className="h-3.5 w-3.5 rounded border-casper-ink/20 text-casper-violet focus:ring-casper-violet/30"
        />
        Reply early to new posts
      </label>
      <p className="mt-1 text-xs leading-relaxed text-casper-ink/40">
        {settings.earlyReply
          ? 'Checking one creator every few minutes and engaging only posts from the last few hours — so your reply lands while the thread is still short.'
          : 'Off: creators are swept every 6 hours, so a reply may arrive long after the post did.'}
      </p>
</Section>
  );
};

const WhitelistSection = ({
  settings,
  onChange,
}: {
  settings: ExtensionSettings;
  onChange: (s: ExtensionSettings) => void;
}) => {
  const [platform, setPlatform] = useState<Platform>('twitter');
  const [handle, setHandle] = useState('');
  const [bioKeywordText, setBioKeywordText] = useState(settings.followFilter.keywords.join(', '));
  const [bioExcludeText, setBioExcludeText] = useState(
    settings.followFilter.excludeKeywords.join(', '),
  );

  const commitBioKeywords = () => {
    onChange({
      ...settings,
      followFilter: {
        ...settings.followFilter,
        keywords: bioKeywordText
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      },
    });
  };
  const commitBioExclude = () => {
    onChange({
      ...settings,
      followFilter: {
        ...settings.followFilter,
        excludeKeywords: bioExcludeText
          .split(',')
          .map((k) => k.trim())
          .filter(Boolean),
      },
    });
  };

  const add = () => {
    const clean = handle.trim().replace(/^@/, '');
    if (!clean) return;
    if (
      settings.whitelist.some(
        (w) => w.platform === platform && w.handle.toLowerCase() === clean.toLowerCase(),
      )
    ) {
      setHandle('');
      return;
    }
    onChange({
      ...settings,
      whitelist: [...settings.whitelist, { platform, handle: clean }],
    });
    setHandle('');
  };

  const remove = (entry: { platform: Platform; handle: string }) => {
    onChange({
      ...settings,
      whitelist: settings.whitelist.filter(
        (w) => !(w.platform === entry.platform && w.handle === entry.handle),
      ),
    });
  };

  return (
    <Section
      title="Whitelist"
      subtitle="Ghostly247 will never follow accounts on this list."
    >
      <div className="flex gap-2">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          className="rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs"
        >
          <option value="twitter">twitter</option>
        </select>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          placeholder="@handle"
          className="flex-1 rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          disabled={!handle.trim()}
          className="rounded-lg bg-casper-ink/10 px-3 py-1.5 text-xs font-medium text-casper-ink transition hover:bg-casper-ink/20 disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {settings.whitelist.length === 0 ? (
        <p className="mt-3 text-xs text-casper-ink/40">No whitelisted handles.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {settings.whitelist.map((w) => (
            <li
              key={`${w.platform}:${w.handle}`}
              className="flex items-center justify-between rounded-lg bg-casper-cloud px-2 py-1.5 text-xs"
            >
              <span>
                <span className="text-casper-ink/40">{w.platform[0]?.toUpperCase()}</span>{' '}
                <span>@{w.handle}</span>
              </span>
              <button
                type="button"
                onClick={() => remove(w)}
                aria-label="Remove"
                className="rounded px-2 py-0.5 text-xs text-rose-400 hover:bg-rose-500/10"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 border-t border-casper-border pt-3">
        <p className="mb-1.5 font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
          Follow quality (bio)
        </p>
        <input
          type="text"
          value={bioKeywordText}
          onChange={(e) => setBioKeywordText(e.target.value)}
          onBlur={commitBioKeywords}
          onKeyDown={(e) => e.key === 'Enter' && commitBioKeywords()}
          placeholder="only follow back if their bio mentions… (comma-separated)"
          className="w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
        />
        <input
          type="text"
          value={bioExcludeText}
          onChange={(e) => setBioExcludeText(e.target.value)}
          onBlur={commitBioExclude}
          onKeyDown={(e) => e.key === 'Enter' && commitBioExclude()}
          placeholder="never follow back if their bio mentions… (comma-separated)"
          className="mt-1.5 w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
        />
        <p className="mt-1 text-xs leading-relaxed text-casper-ink/40">
          Checked on auto follow-back and a target's followers list — the only place their bio is
          visible without opening their profile. Leave both blank to follow back everyone, as today.
        </p>
      </div>
    </Section>
  );
};


/** Everything that can produce a post to act on, in one place. */
export const WhoIWatch = () => {
  const [settings, setLocal] = useState<ExtensionSettings | null>(null);

  useEffect(() => {
    void getSettings().then(setLocal);
  }, []);

  const onChange = (next: ExtensionSettings) => {
    setLocal(next);
    void setSettings(next);
  };

  const summary = useMemo(() => {
    if (!settings) return null;
    const hf = settings.homeFeed;
    const actions = (['like', 'comment', 'follow', 'bookmark', 'repost', 'quote'] as const).filter(
      (a) => hf[a],
    );
    return {
      sources:
        (hf.enabled ? 1 : 0) + settings.searchQueries.length + settings.targetCreators.length,
      actions: actions.length,
      keywords: hf.keywords.length,
      feedOff: !hf.enabled || actions.length === 0,
    };
  }, [settings]);

  if (!settings || !summary) {
    return <p className="py-6 text-center text-xs text-casper-muted">Catching up…</p>;
  }

  return (
    <div className="space-y-3 p-3">
      {/*
        The live count. Not decoration: "3 places to look, 0 actions on" is the
        exact configuration that used to fail silently, and saying it here is
        cheaper than explaining it in a diagnostics panel afterwards.
      */}
      <div className="rounded-2xl border border-casper-border bg-casper-surface px-3.5 py-3">
        <p className="text-[13px] text-casper-fg">
          {summary.sources === 0
            ? 'Nowhere to look yet'
            : `${summary.sources} ${summary.sources === 1 ? 'place' : 'places'} to look`}
          {summary.keywords > 0 && (
            <span className="text-casper-muted">
              {' '}
              · {summary.keywords} {summary.keywords === 1 ? 'topic' : 'topics'}
            </span>
          )}
        </p>
        <p className="mt-0.5 text-xs text-casper-muted">
          {summary.feedOff
            ? 'Nothing will happen until the home feed is on with at least one action.'
            : `${summary.actions} ${summary.actions === 1 ? 'action' : 'actions'} switched on.`}
        </p>
      </div>

      <HomeFeedSection settings={settings} onChange={onChange} />
      <SearchSection settings={settings} onChange={onChange} />
      <TargetsSection settings={settings} onChange={onChange} />
      <WhitelistSection settings={settings} onChange={onChange} />
    </div>
  );
};
