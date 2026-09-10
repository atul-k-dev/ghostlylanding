import { useEffect, useState } from 'react';
import type { GrowthSummary } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import { getCounters, STORAGE_KEYS } from '../../lib/storage.js';
import { Card, PaceBar, Stat, Button, FeedLine, EmptyState } from '../../ui/index.js';
import type { EngineStatus } from '../useEngineStatus.js';
import { ConditionCard } from './ConditionCard.js';
import type { ActionLogEntry } from './_shared.js';
import type { PanelTarget } from '../navigation.js';

/**
 * Today — what happened, what is happening, and the one thing in the way.
 *
 * Ordered by the copy rules in updateplan §3: outcomes first (followers gained),
 * then what it did, then the budget. The old dashboard led with "3 pending · 12
 * done · 0 failed", which is the engine talking about itself.
 */

/** Yesterday's counter, when the stored counter is still yesterday's. */
const useOutcomes = () => {
  const [growth, setGrowth] = useState<GrowthSummary | null>(null);
  const [today, setToday] = useState<{ replies: number; follows: number; likes: number } | null>(
    null,
  );

  const load = async () => {
    const counters = await getCounters();
    const c = counters.twitter;
    setToday(
      c
        ? { replies: c.byActionType.comment, follows: c.byActionType.follow, likes: c.byActionType.like }
        : { replies: 0, follows: 0, likes: 0 },
    );
    try {
      const resp = await sendToBackground<
        { ok: true; data: GrowthSummary } | { ok: false; error: unknown }
      >({ type: 'GET_GROWTH', payload: {} });
      if (resp.ok) setGrowth(resp.data);
    } catch {
      /* the numbers that need the server just stay absent */
    }
  };

  useEffect(() => {
    void load();
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'local' && STORAGE_KEYS.counters in changes) void load();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return { growth, today };
};

const timeOf = (iso: string): string => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
};

/** "Liked @levelsio's post" — a sentence, not a row of fields. */
const describe = (e: ActionLogEntry): string => {
  const who = e.targetHandle ? `@${e.targetHandle.replace(/^@/, '')}` : 'someone';
  const verb: Record<string, string> = {
    like: 'Liked',
    comment: 'Replied to',
    follow: 'Followed',
    bookmark: 'Bookmarked',
    repost: 'Reposted',
    quote: 'Quoted',
  };
  const v = verb[e.actionType] ?? e.actionType;
  if (e.actionType === 'follow') return `${v} ${who}`;
  if (!e.success) return `Tried to ${v.toLowerCase()} ${who} — ${e.errorMessage ?? 'it did not work'}`;
  return `${v} ${who}’s post`;
};

const LiveFeed = () => {
  const [entries, setEntries] = useState<ActionLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const resp = await sendToBackground<
        { ok: true; data: { entries: ActionLogEntry[] } } | { ok: false; error: { message: string } }
      >({ type: 'LIST_ACTION_LOG', payload: { limit: 50 } });
      if (resp.ok) {
        setEntries(resp.data.entries);
        setError(null);
      } else {
        setError(resp.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the server');
    }
  };

  useEffect(() => {
    void refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, []);

  if (entries === null) {
    return <p className="py-4 text-center text-xs text-casper-muted">Catching up…</p>;
  }

  if (error) {
    return (
      <Card tone="attention" title="I can’t reach the server">
        <p className="mb-2 text-xs leading-relaxed text-casper-muted">{error}</p>
        <Button size="sm" variant="secondary" onClick={() => void refresh()}>
          Try again
        </Button>
      </Card>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        icon="🌱"
        title="Nothing yet today"
        body="Every like, reply and follow shows up here the moment it happens."
      />
    );
  }

  return (
    <Card title="What I’ve done">
      <div className="-mx-1">
        {entries.map((e) => (
          <FeedLine
            key={e.id}
            time={timeOf(e.timestamp)}
            text={describe(e)}
            href={e.targetUrl || undefined}
            tone={e.success ? 'default' : 'attention'}
          />
        ))}
      </div>
    </Card>
  );
};

export const Today = ({
  status,
  onNavigate,
}: {
  status: EngineStatus;
  onNavigate?: (t: PanelTarget) => void;
}) => {
  const { growth, today } = useOutcomes();
  const gained = growth?.deltas.day.change ?? null;

  return (
    <div className="flex flex-col gap-3 p-3">
      <ConditionCard status={status} onNavigate={onNavigate} />

      <Card title="Today">
        <div className="mb-3 grid grid-cols-3 gap-2">
          <Stat
            value={gained === null ? '—' : gained > 0 ? `+${gained}` : String(gained)}
            label="followers"
            sub={gained === null ? 'no reading yet' : undefined}
            tone={gained !== null && gained > 0 ? 'working' : 'default'}
          />
          <Stat value={today?.replies ?? 0} label="replies" />
          <Stat value={today?.follows ?? 0} label="follows" />
        </div>
        <PaceBar fraction={status.pace ?? 0} />
        <p className="mt-1.5 text-xs text-casper-muted tabular-nums">
          {status.spent} of {status.allowance || '—'} actions I can safely take today
        </p>
      </Card>

      <LiveFeed />
    </div>
  );
};
