import { useEffect, useState } from 'react';
import type { GrowthMilestone, GrowthSummary } from '@casper/shared';
import type { HeatmapCell } from '../../lib/best-times.js';
import { sendToBackground } from '../../lib/messages.js';
import {
  clearAutoTuneDrop,
  getAutoTuneDrops,
  getGrowthMilestones,
  getSettings,
  setSettings,
  type AutoTuneDrop,
} from '../../lib/storage.js';

/**
 * Everything Home's growth widgets read, loaded once and shared: the server's
 * 30-day growth summary, the best-times model, change markers and auto-tune
 * drops. Every number is real — a follower reading or a logged action; X gives
 * no way to attribute a follower to one action, so nothing here pretends to.
 */
export interface BestTimesData {
  heatmap: HeatmapCell[];
  labels: string[];
  personalised: boolean;
}

type Resp<T> = { ok: true; data: T } | { ok: false; error: { message: string } | string };
const message = (e: { message: string } | string) => (typeof e === 'string' ? e : e.message);

export const useGrowth = () => {
  const [summary, setSummary] = useState<GrowthSummary | null>(null);
  const [bestTimes, setBestTimes] = useState<BestTimesData | null>(null);
  const [milestones, setMilestones] = useState<GrowthMilestone[]>([]);
  const [drops, setDrops] = useState<AutoTuneDrop[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [g, t, ms, d] = await Promise.all([
        sendToBackground<Resp<GrowthSummary>>({ type: 'GET_GROWTH', payload: { days: 30 } }),
        sendToBackground<Resp<BestTimesData>>({ type: 'GET_BEST_TIMES', payload: { count: 4 } }),
        getGrowthMilestones(),
        getAutoTuneDrops(),
      ]);
      if (g.ok) {
        setSummary(g.data);
        setError(null);
      } else setError(message(g.error));
      if (t.ok) setBestTimes(t.data);
      setMilestones(ms);
      setDrops(d);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the server');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Followers move slowly; a gentle refresh keeps an open panel honest.
    const id = setInterval(() => void load(), 10 * 60_000);
    return () => clearInterval(id);
  }, []);

  /** Reads the profile now — a minute or two, in background tabs. */
  const refresh = async () => {
    setRefreshing(true);
    try {
      const resp = await sendToBackground<Resp<{ message: string }>>({ type: 'REFRESH_GROWTH', payload: {} });
      if (!resp.ok) setError(message(resp.error));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
      await load();
    }
  };

  const dropTarget = async (handle: string) => {
    const s = await getSettings();
    await setSettings({
      ...s,
      targetCreators: s.targetCreators.filter((t) => t.handle.toLowerCase() !== handle.toLowerCase()),
    });
    setSummary((cur) => (cur ? { ...cur, targets: cur.targets.filter((t) => t.handle !== handle) } : cur));
  };

  const undoDrop = async (drop: AutoTuneDrop) => {
    const s = await getSettings();
    if (!s.targetCreators.some((t) => t.handle.toLowerCase() === drop.handle.toLowerCase())) {
      await setSettings({
        ...s,
        targetCreators: [...s.targetCreators, { platform: 'twitter', handle: drop.handle, addedAt: new Date().toISOString() }],
      });
    }
    await clearAutoTuneDrop(drop.handle);
    setDrops((d) => d.filter((x) => x.handle !== drop.handle));
  };

  return { summary, bestTimes, milestones, drops, loading, refreshing, error, reload: load, refresh, dropTarget, undoDrop };
};

export type Growth = ReturnType<typeof useGrowth>;
