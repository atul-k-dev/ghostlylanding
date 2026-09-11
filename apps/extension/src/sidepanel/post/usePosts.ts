import { useEffect, useState } from 'react';
import type { ExtensionSettings } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import {
  getOwnHandle,
  getSettings,
  isPendingPost,
  setSettings,
  STORAGE_KEYS,
  tweetLimitFor,
  type ScheduledPost,
} from '../../lib/storage.js';
import type { Slot } from '../../lib/best-times.js';
import { PROFILE_QUIET_MS } from '../conditions.js';

/**
 * Everything the Post page reads and writes, in one place: settings, the
 * scheduled posts, the best-time model, and one note channel so every section
 * reports back through the same toast.
 *
 * The background messages are exactly the ones the old Posts page used —
 * SCHEDULE_POST, GENERATE_POST, GENERATE_IDEAS, REWRITE_POST, … — so the
 * engine can't tell the redesign apart.
 */
export type Resp<T> = { ok: true; data: T } | { ok: false; error: { message: string } | string };

/** Sends a message and unwraps it, throwing the server's own message on failure. */
export const call = async <T,>(type: string, payload: unknown): Promise<T> => {
  const r = await sendToBackground<Resp<T>>({ type, payload });
  if (!r.ok) throw new Error(typeof r.error === 'string' ? r.error : r.error.message);
  return r.data;
};

export interface BestTimesView {
  slots: Slot[];
  labels: string[];
  personalised: boolean;
  days: number;
  posts: number;
}

export const DAY_MS = 86_400_000;
export const dayStart = (ms: number) => {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** The next time a best-time slot comes round, at least 10 minutes out. */
export const nextSlotTime = (slot: Slot, from = Date.now()): number => {
  for (let i = 0; i < 8; i++) {
    const d = new Date(dayStart(from) + i * DAY_MS);
    d.setHours(slot.hour, 0, 0, 0);
    if ((slot.weekday === null || d.getDay() === slot.weekday) && d.getTime() > from + 10 * 60_000) return d.getTime();
  }
  return from + DAY_MS;
};

export const usePosts = () => {
  const [settings, setLocal] = useState<ExtensionSettings | null>(null);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [max, setMax] = useState(5);
  const [ownHandle, setOwnHandle] = useState<string | null>(null);
  const [bestTimes, setBestTimes] = useState<BestTimesView | null>(null);
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'error' } | null>(null);

  const refresh = async () => {
    const r = await sendToBackground<Resp<{ posts: ScheduledPost[]; max: number }>>({
      type: 'LIST_SCHEDULED_POSTS',
      payload: {},
    });
    if (r.ok) {
      setPosts(r.data.posts);
      setMax(r.data.max);
    }
    // Approving a post can move the trust streak (written by the service
    // worker) — re-read so the offer appears now, not next time.
    setLocal(await getSettings());
  };

  useEffect(() => {
    void refresh();
    void getOwnHandle().then(setOwnHandle);
    void sendToBackground<Resp<BestTimesView>>({ type: 'GET_BEST_TIMES', payload: { count: 3 } }).then((r) => {
      if (r.ok) setBestTimes(r.data);
    });
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: chrome.storage.AreaName) => {
      if (area === 'local' && STORAGE_KEYS.scheduledPosts in changes) void refresh();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  // Toasts clear themselves.
  useEffect(() => {
    if (!note) return;
    const id = setTimeout(() => setNote(null), note.tone === 'error' ? 6000 : 3500);
    return () => clearTimeout(id);
  }, [note]);

  const update = (next: ExtensionSettings) => {
    setLocal(next);
    void setSettings(next);
  };

  const pending = posts.filter(isPendingPost).sort((a, b) => a.scheduledAt - b.scheduledAt);
  const history = posts
    .filter((p) => p.status === 'posted' || p.status === 'failed')
    .sort((a, b) => (b.postedAt ?? b.createdAt) - (a.postedAt ?? a.createdAt));

  // Same rule as the quiet-profile notice: never "quiet" for a profile that has
  // never published, and not while something is already on the way.
  const lastPosted = Math.max(0, ...posts.filter((p) => p.status === 'posted').map((p) => p.postedAt ?? 0));
  const quiet = lastPosted > 0 && !posts.some((p) => p.status === 'scheduled') && Date.now() - lastPosted >= PROFILE_QUIET_MS;

  const limit = settings ? tweetLimitFor(settings.xAccountPlan, settings.postLength) : 280;

  return {
    settings,
    update,
    posts,
    pending,
    history,
    max,
    limit,
    ownHandle,
    bestTimes,
    quiet,
    refresh,
    note,
    say: (text: string) => setNote({ text, tone: 'ok' }),
    fail: (text: string) => setNote({ text, tone: 'error' }),
    clearNote: () => setNote(null),
  };
};

export type PostsState = ReturnType<typeof usePosts>;
