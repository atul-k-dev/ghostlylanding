import { useEffect, useState } from 'react';
import type { GrowthMilestone, GrowthSummary, PendingReply } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import {
  getAutoTuneDrops,
  getGrowthMilestones,
  getPendingReplies,
  getScheduledPosts,
  STORAGE_KEYS,
  type AutoTuneDrop,
  type ScheduledPost,
} from '../../lib/storage.js';
import type { EngineStatus } from '../useEngineStatus.js';
import { useCondition } from '../pages/ConditionCard.js';
import type { Card as ConditionData } from '../conditions.js';

/**
 * The notification centre's data, built from what the extension already
 * knows rather than a separate log — so it can't drift from the rest of the
 * panel:
 *
 *   Needs you  — a problem only you can fix, replies waiting for approval,
 *                posts Ghostly drafted, posts that failed to go out.
 *   Activity   — posts that went out, follower changes, creators the weekly
 *                clean-up dropped, and changes you made.
 *
 * "Needs you" is always counted; activity counts as unread until the page is
 * next closed (or "Mark all read"). Cleared activity items stay cleared.
 */
export type FeedKind = 'posted' | 'followers' | 'drop' | 'change';

export interface FeedItem {
  id: string;
  kind: FeedKind;
  time: number;
  title: string;
  body?: string;
  drop?: AutoTuneDrop;
}

interface Seen {
  seenAt: number;
  cleared: string[];
}

const WEEK = 7 * 86_400_000;

const MILESTONE_TITLE: Record<GrowthMilestone['kind'], string> = {
  'preset-changed': 'You changed the work pace',
  'target-added': 'You added a creator',
  'auto-posting-started': 'You turned on auto-posting',
  'auto-tune-dropped-targets': 'Weekly clean-up ran',
};

const readSeen = async (): Promise<Seen> => {
  const got = await chrome.storage.local.get(STORAGE_KEYS.notificationsSeen);
  return (got[STORAGE_KEYS.notificationsSeen] as Seen | undefined) ?? { seenAt: 0, cleared: [] };
};
const writeSeen = (s: Seen) => chrome.storage.local.set({ [STORAGE_KEYS.notificationsSeen]: s });

export const useNotifications = (status: EngineStatus) => {
  const condition = useCondition(status);
  const [replies, setReplies] = useState<PendingReply[]>([]);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [drops, setDrops] = useState<AutoTuneDrop[]>([]);
  const [milestones, setMilestones] = useState<GrowthMilestone[]>([]);
  const [growth, setGrowth] = useState<GrowthSummary | null>(null);
  const [seen, setSeen] = useState<Seen>({ seenAt: Date.now(), cleared: [] });

  const loadLocal = async () => {
    const [r, p, d, m, s] = await Promise.all([
      getPendingReplies(),
      getScheduledPosts(),
      getAutoTuneDrops(),
      getGrowthMilestones(),
      readSeen(),
    ]);
    setReplies([...r].sort((a, b) => a.createdAt - b.createdAt));
    setPosts(p);
    setDrops(d);
    setMilestones(m);
    setSeen(s);
  };

  const loadGrowth = async () => {
    try {
      const r = await sendToBackground<{ ok: true; data: GrowthSummary } | { ok: false }>({ type: 'GET_GROWTH', payload: { days: 7 } });
      if (r.ok) setGrowth(r.data);
    } catch {
      /* follower news just waits for the server */
    }
  };

  useEffect(() => {
    void loadLocal();
    void loadGrowth();
    const keys: string[] = [
      STORAGE_KEYS.pendingReplies,
      STORAGE_KEYS.scheduledPosts,
      STORAGE_KEYS.autoTuneDropped,
      STORAGE_KEYS.growthMilestones,
      STORAGE_KEYS.notificationsSeen,
    ];
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: chrome.storage.AreaName) => {
      if (area === 'local' && keys.some((k) => k in changes)) void loadLocal();
    };
    chrome.storage.onChanged.addListener(listener);
    const id = setInterval(() => void loadGrowth(), 30 * 60_000);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
      clearInterval(id);
    };
  }, []);

  // Only a problem the user has to fix; the reply queue speaks for itself below.
  const alert: ConditionData | null =
    condition && condition.tone === 'attention' && condition.code !== 'drafts-waiting' ? condition : null;
  const draftPosts = posts.filter((p) => p.status === 'draft').sort((a, b) => a.scheduledAt - b.scheduledAt);
  const failedPosts = posts.filter((p) => p.status === 'failed').sort((a, b) => b.scheduledAt - a.scheduledAt);

  const now = Date.now();
  const feed: FeedItem[] = [];
  for (const p of posts) {
    if (p.status === 'posted' && p.postedAt && now - p.postedAt < 2 * WEEK) {
      feed.push({ id: `posted-${p.id}`, kind: 'posted', time: p.postedAt, title: 'Your post went out', body: p.text });
    }
  }
  const day = growth?.deltas.day;
  if (growth?.latest && day && day.change !== null && day.change !== 0) {
    const change = day.change;
    feed.push({
      id: `followers-${growth.latest.date}`,
      kind: 'followers',
      time: Date.parse(`${growth.latest.date}T12:00:00`),
      title: change > 0 ? `+${change} new followers` : `${change} followers`,
      body: `You're at ${growth.latest.followers.toLocaleString()} followers now.`,
    });
  }
  for (const d of drops) {
    feed.push({
      id: `drop-${d.handle}-${d.at}`,
      kind: 'drop',
      time: Date.parse(d.at),
      title: `I dropped @${d.handle}`,
      body: 'No replies there in 3+ weeks. Undo to keep watching them.',
      drop: d,
    });
  }
  for (const m of milestones) {
    if (m.kind === 'auto-tune-dropped-targets') continue; // the drops above say it better
    feed.push({ id: `ms-${m.kind}-${m.at}`, kind: 'change', time: Date.parse(m.at), title: MILESTONE_TITLE[m.kind], body: m.detail });
  }
  const visible = feed
    .filter((f) => Number.isFinite(f.time) && !seen.cleared.includes(f.id))
    .sort((a, b) => b.time - a.time)
    .slice(0, 40);

  const needsYou = (alert ? 1 : 0) + replies.length + draftPosts.length + failedPosts.length;
  const unread = visible.filter((f) => f.time > seen.seenAt).length;

  return {
    alert,
    replies,
    draftPosts,
    failedPosts,
    feed: visible,
    seenAt: seen.seenAt,
    needsYou,
    unread,
    /** The bell's number: everything waiting on you, plus news you haven't seen. */
    count: needsYou + unread,
    markAllRead: () => void writeSeen({ ...seen, seenAt: Date.now() }),
    clear: (id: string) => void writeSeen({ ...seen, cleared: [...seen.cleared.slice(-200), id] }),
    reload: loadLocal,
  };
};

export type NotificationsState = ReturnType<typeof useNotifications>;
