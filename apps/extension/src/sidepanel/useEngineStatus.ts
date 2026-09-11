import { useCallback, useEffect, useState } from 'react';
import type { CountersState, ExtensionSettings } from '@casper/shared';
import { getSettings, setSettings, getCounters, getSchedulerState, STORAGE_KEYS } from '../lib/storage.js';
import { getBlockReason, type BlockReason } from '../scheduler/block-reason.js';
import type { EngineState } from '../ui/index.js';

/**
 * Everything the shell's status bar needs, kept live.
 *
 * Reads `chrome.storage.local` directly rather than asking the service worker:
 * the panel is an extension page, storage is the source of truth (the plan's
 * "no server-authoritative settings" decision), and `chrome.storage.onChanged`
 * gives us a push feed for free — so a like landing in a content script updates
 * this bar without a poll or a round-trip.
 */
export interface EngineStatus {
  loading: boolean;
  settings: ExtensionSettings | null;
  counters: CountersState | null;
  blockReason: BlockReason | null;
  state: EngineState;
  /** One short present-tense line. The full card copy lives in 1.7. */
  label: string;
  /** 0–1 of today's allowance, or undefined before the first counter exists. */
  pace: number | undefined;
  spent: number;
  allowance: number;
  /** ms epoch a between-sessions break ends; null when not on one. */
  restUntil: number | null;
  togglePause: () => Promise<void>;
  refresh: () => Promise<void>;
}

const sum = (n: Record<string, number>): number => Object.values(n).reduce((a, b) => a + b, 0);

/**
 * The one-line version of each blocking condition. Phase 1.7 owns the CARD copy
 * — the sentence plus the button that resolves it — and that copy is fixed by
 * the design brief. This is only what fits in a 400px status bar; if the two
 * ever disagree, 1.7 is right.
 */
const SHORT_REASON: Record<string, string> = {
  paused: 'Paused',
  'signed-out': 'Signed out of X',
  'sub-lapsed': 'Subscription lapsed',
  'free-cap': 'Free allowance spent',
  'server-unreachable': "Can't reach the server",
  degraded: "Can't read your timeline",
  'caps-spent': "That's today's safe limit",
  'outside-hours': 'Outside your active hours',
  'not-configured': 'Nothing to watch yet',
  'feed-off': 'The feed is switched off',
  'nothing-matched': 'Nothing worth replying to yet',
};

/** Reasons the user has to resolve; the rest are the engine resting normally. */
const NEEDS_A_HUMAN = new Set([
  'signed-out',
  'sub-lapsed',
  'free-cap',
  'server-unreachable',
  'degraded',
  'not-configured',
  'feed-off',
]);

export const useEngineStatus = (): EngineStatus => {
  const [settings, setLocal] = useState<ExtensionSettings | null>(null);
  const [counters, setCountersState] = useState<CountersState | null>(null);
  const [blockReason, setReason] = useState<BlockReason | null>(null);
  const [restUntil, setRestUntil] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [s, c, r, sched] = await Promise.all([getSettings(), getCounters(), getBlockReason(), getSchedulerState()]);
    setLocal(s);
    setCountersState(c);
    setReason(r);
    setRestUntil(sched.restUntil && sched.restUntil > Date.now() ? sched.restUntil : null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area !== 'local') return;
      if (
        STORAGE_KEYS.settings in changes ||
        STORAGE_KEYS.counters in changes ||
        STORAGE_KEYS.blockReason in changes ||
        STORAGE_KEYS.schedulerState in changes
      ) {
        void refresh();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [refresh]);

  const togglePause = useCallback(async () => {
    const current = await getSettings();
    await setSettings({ ...current, isPaused: !current.isPaused });
    await refresh();
  }, [refresh]);

  const today = counters?.twitter ?? null;
  const spent = today ? sum(today.byActionType as unknown as Record<string, number>) : 0;
  const allowance = today ? sum(today.effectiveCap as unknown as Record<string, number>) : 0;
  const pace = allowance > 0 ? spent / allowance : undefined;

  const code = blockReason?.code;
  const paused = settings?.isPaused ?? false;

  let state: EngineState = 'working';
  let label = 'Working through your feed';
  if (loading) {
    state = 'waiting';
    label = 'Catching up…';
  } else if (paused) {
    state = 'paused';
    label = SHORT_REASON.paused ?? 'Paused';
  } else if (code && NEEDS_A_HUMAN.has(code)) {
    state = 'attention';
    label = SHORT_REASON[code] ?? 'Resting';
  } else if (restUntil) {
    state = 'waiting';
    label = 'Taking a break';
  } else if (code) {
    state = 'waiting';
    label = SHORT_REASON[code] ?? 'Resting';
  }

  return {
    loading,
    settings,
    counters,
    blockReason,
    state,
    label,
    pace,
    spent,
    allowance,
    restUntil,
    togglePause,
    refresh,
  };
};
