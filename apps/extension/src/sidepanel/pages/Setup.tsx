import { useEffect, useState } from 'react';
import type { SafetyPresetName, SearchQuery } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import { getSettings, setSettings, STORAGE_KEYS } from '../../lib/storage.js';
import { SAFETY_PRESETS, applyPreset } from '../../lib/presets.js';
import type { SetupProgress, SetupRead } from '../../background/setup-read.js';
import { Button, Card } from '../../ui/index.js';
import { DryRun } from './DryRun.js';

/**
 * Setup — the fix for D14.
 *
 * Every default in this product ships off: paused, no keywords, no targets, the
 * home feed disabled. A new user turned it on and nothing ever happened, and
 * nothing ever told them why. Three steps, and at the end the engine is armed
 * and actually working.
 *
 * Step 1 reads their own account rather than asking them to describe it.
 * Step 2 is one safety choice, not six sliders.
 * Step 3 (1.5) shows what it WOULD do, before it does anything at all.
 */
type Step = 1 | 2 | 3;

const compact = (n: number): string =>
  n >= 1_000_000
    ? `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
    : n >= 1_000
      ? `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}K`
      : String(n);

export const Setup = ({ onDone }: { onDone: () => void }) => {
  const [step, setStep] = useState<Step>(1);
  const [read, setRead] = useState<SetupRead | null>(null);
  const [progress, setProgress] = useState<SetupProgress | null>(null);
  const [reading, setReading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Which proposals survive. Everything starts in — the user removes, rather
  // than picking ten things out of a list of ten.
  const [keepTopics, setKeepTopics] = useState<Set<string>>(new Set());
  const [keepTargets, setKeepTargets] = useState<Set<string>>(new Set());

  const [preset, setPreset] = useState<SafetyPresetName>('balanced');
  // Defaults CHECKED: an unknown-age account is treated as new (0.3), and the
  // honest default for someone who hasn't thought about it is the slower one.
  const [youngAccount, setYoungAccount] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const adopt = (r: SetupRead) => {
    setRead(r);
    setKeepTopics(new Set(r.topics));
    setKeepTargets(new Set(r.targets.map((t) => t.handle)));
  };

  // A read already in the bag (the panel was closed mid-setup) is used as-is.
  useEffect(() => {
    void (async () => {
      const resp = await sendToBackground<{ ok: boolean; data: SetupRead | null }>({
        type: 'GET_SETUP_READ',
        payload: {},
      });
      if (resp.data) adopt(resp.data);
    })();

    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area !== 'local') return;
      const change = changes[STORAGE_KEYS.setupProgress];
      if (change) setProgress(change.newValue as SetupProgress);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const runRead = async () => {
    setReading(true);
    setError(null);
    const resp = await sendToBackground<{
      ok: boolean;
      data?: SetupRead;
      error?: { message: string };
    }>({ type: 'SETUP_READ_ACCOUNT', payload: {} });
    setReading(false);
    if (resp.ok && resp.data) adopt(resp.data);
    else setError(resp.error?.message ?? 'Something went wrong reading your account.');
  };

  const finish = async () => {
    setFinishing(true);
    const current = await getSettings();
    const withPreset = applyPreset(current, preset);
    // Without this, a fresh setup only ever had two engagement sources: the
    // home feed (filtered to these same topics) and a handful of target
    // creators — so the whole account ended up cycling the same 2-3 people
    // over and over, with no way to reach anyone else talking about what the
    // user actually cares about. Search feeds are the thing that reaches
    // people OUTSIDE the accounts already followed; leaving `searchQueries`
    // empty after setup meant that source silently never ran; the user would
    // have had to find "Who I watch" and add the exact same topics again by
    // hand to discover it exists at all.
    const now = new Date().toISOString();
    const topicQueries: SearchQuery[] = [...keepTopics].map((query) => ({ query, addedAt: now }));
    const existingQueries = current.searchQueries.filter((sq) => !keepTopics.has(sq.query));
    await setSettings({
      ...withPreset,
      // Under six months is what the age multiplier treats as new (quotas.ts).
      accountAgeMonths: { ...current.accountAgeMonths, twitter: youngAccount ? 3 : 24 },
      contentTopics: [...keepTopics],
      homeFeed: {
        ...withPreset.homeFeed,
        enabled: true,
        keywords: [...keepTopics],
      },
      searchQueries: [...existingQueries, ...topicQueries],
      targetCreators: (read?.targets ?? [])
        .filter((t) => keepTargets.has(t.handle))
        .map((t) => ({ platform: 'twitter' as const, handle: t.handle, addedAt: new Date().toISOString() })),
      setupCompletedAt: new Date().toISOString(),
      // The whole point: at the end of setup it is actually running.
      isPaused: false,
    });
    setFinishing(false);
    onDone();
  };

  const toggle = (set: Set<string>, key: string, apply: (s: Set<string>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    apply(next);
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      <ol className="flex items-center gap-1.5 text-xs text-casper-muted">
        {([1, 2, 3] as Step[]).map((n) => (
          <li key={n} className="flex items-center gap-1.5">
            <span
              className={[
                'grid h-5 w-5 place-items-center rounded-full text-[11px] tabular-nums',
                n === step
                  ? 'bg-casper-coral text-casper-on-coral font-semibold'
                  : n < step
                    ? 'bg-casper-working/20 text-casper-working'
                    : 'bg-casper-surface text-casper-muted',
              ].join(' ')}
            >
              {n < step ? '✓' : n}
            </span>
            {n < 3 && <span aria-hidden className="h-px w-4 bg-casper-border" />}
          </li>
        ))}
      </ol>

      {step === 1 && (
        <>
          {!read && !reading && (
            <Card title="Let me read your account first">
              <p className="mb-3 text-xs leading-relaxed text-casper-muted">
                I&rsquo;ll look at your bio, your last thirty posts and who you already follow, then
                suggest what to watch. Nothing is posted, followed or liked while I do it.
              </p>
              <Button variant="primary" full onClick={() => void runRead()}>
                Read my account
              </Button>
            </Card>
          )}

          {reading && (
            <Card title={progress?.label ?? 'Reading your account'}>
              <p className="text-xs leading-relaxed text-casper-muted">
                This takes about a minute. Tabs will open and close on their own — that&rsquo;s me
                looking things up.
              </p>
              {progress && progress.total > 0 && (
                <p className="mt-2 text-xs text-casper-muted tabular-nums">
                  {progress.done} of {progress.total}
                </p>
              )}
            </Card>
          )}

          {error && (
            <Card tone="attention" title="I couldn’t finish reading your account">
              <p className="mb-3 text-xs leading-relaxed text-casper-muted">{error}</p>
              <Button variant="primary" full onClick={() => void runRead()}>
                Try again
              </Button>
            </Card>
          )}

          {read && !reading && (
            <>
              <Card title={`@${read.handle}`}>
                <p className="text-xs leading-relaxed text-casper-muted">
                  {read.followers !== null && `${compact(read.followers)} followers · `}
                  {read.postsRead} recent posts read
                </p>
              </Card>

              <Card title="What you post about">
                {read.topics.length === 0 ? (
                  <p className="text-xs leading-relaxed text-casper-muted">
                    I couldn&rsquo;t tell from your posts alone — you can add topics yourself once
                    setup is done, and I&rsquo;ll work the whole feed until then.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {read.topics.map((t) => {
                      const on = keepTopics.has(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => toggle(keepTopics, t, setKeepTopics)}
                          className={[
                            'cursor-pointer rounded-md border px-2 py-1 text-xs transition-colors',
                            on
                              ? 'border-casper-coral/40 bg-casper-coral/12 text-casper-coral'
                              : 'border-casper-border text-casper-muted line-through',
                          ].join(' ')}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Card>

              <Card title="People worth watching">
                {read.targets.length === 0 ? (
                  <p className="text-xs leading-relaxed text-casper-muted">
                    I couldn&rsquo;t read your following list. You can add people by hand once
                    setup is done.
                  </p>
                ) : (
                  <ul className="flex flex-col gap-2">
                    {read.targets.map((t) => {
                      const on = keepTargets.has(t.handle);
                      return (
                        <li key={t.handle} className="flex items-start gap-2">
                          <button
                            type="button"
                            aria-pressed={on}
                            onClick={() => toggle(keepTargets, t.handle, setKeepTargets)}
                            className={[
                              'mt-0.5 grid h-4 w-4 shrink-0 cursor-pointer place-items-center rounded border text-[10px]',
                              on
                                ? 'border-casper-coral bg-casper-coral text-casper-on-coral'
                                : 'border-casper-border text-transparent',
                            ].join(' ')}
                          >
                            ✓
                          </button>
                          <div className={['min-w-0', on ? '' : 'opacity-45'].join(' ')}>
                            <p className="truncate text-xs text-casper-fg">
                              @{t.handle}
                              {t.followers !== null && (
                                <span className="ml-1.5 text-casper-muted tabular-nums">
                                  {compact(t.followers)}
                                </span>
                              )}
                            </p>
                            <p className="truncate text-xs text-casper-muted">{t.reason}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Card>

              <div className="flex gap-2">
                <Button variant="primary" full onClick={() => setStep(2)}>
                  Looks right →
                </Button>
                <Button variant="ghost" onClick={() => void runRead()}>
                  Read again
                </Button>
              </div>
            </>
          )}
        </>
      )}

      {step === 2 && (
        <>
          <Card title="How hard should I work?">
            <div className="flex flex-col gap-2">
              {(['careful', 'balanced', 'growth'] as SafetyPresetName[]).map((name) => {
                const p = SAFETY_PRESETS[name];
                const on = preset === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setPreset(name)}
                    aria-pressed={on}
                    className={[
                      'cursor-pointer rounded-xl border px-3 py-2 text-left transition-colors',
                      on
                        ? 'border-casper-coral bg-casper-coral/10'
                        : 'border-casper-border hover:border-casper-muted/50',
                    ].join(' ')}
                  >
                    <p
                      className={[
                        'text-[13px] font-medium',
                        on ? 'text-casper-coral' : 'text-casper-fg',
                      ].join(' ')}
                    >
                      {p.label}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-casper-muted">{p.blurb}</p>
                    <p className="mt-1 text-xs text-casper-muted tabular-nums">
                      up to {p.caps.likesPerDay} likes and {p.caps.commentsPerDay} replies a day
                    </p>
                  </button>
                );
              })}
            </div>
          </Card>

          <label className="flex cursor-pointer items-start gap-2 px-1 text-xs leading-relaxed text-casper-muted">
            <input
              type="checkbox"
              checked={youngAccount}
              onChange={(e) => setYoungAccount(e.target.checked)}
              className="mt-0.5 accent-[#f44d60]"
            />
            <span>Account under 6 months old? I&rsquo;ll start slower.</span>
          </label>

          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(1)}>
              ← Back
            </Button>
            <Button variant="primary" full onClick={() => setStep(3)}>
              Next →
            </Button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <DryRun onReady={() => undefined} />
          <p className="px-1 text-xs leading-relaxed text-casper-muted">
            I&rsquo;ll watch {keepTargets.size} {keepTargets.size === 1 ? 'account' : 'accounts'}
            {keepTopics.size > 0 && <> and posts about {[...keepTopics].slice(0, 3).join(', ')}</>}, on
            the {SAFETY_PRESETS[preset].label} setting. Everything I write comes to you for approval
            first.
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep(2)}>
              ← Back
            </Button>
            <Button variant="primary" full disabled={finishing} onClick={() => void finish()}>
              {finishing ? 'Starting…' : 'Start'}
            </Button>
          </div>
        </>
      )}
    </div>
  );
};
