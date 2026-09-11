import { useEffect, useRef, useState } from 'react';
import type { ExtensionSettings } from '@casper/shared';
import { getQueue, getSchedulerState, STORAGE_KEYS } from '../../lib/storage.js';
import type { QueuedTask } from '../../scheduler/types.js';
import type { EngineStatus } from '../useEngineStatus.js';

/**
 * What Ghostly is doing this second — the "Current" view of the status card.
 *
 *  · running  — a task is executing (scrolling, searching, liking…); `since`
 *               is when this panel first saw it running.
 *  · waiting  — between moves; `until` is when the next one may start: the
 *               scheduler's human-pacing gap, or — when the engine is resting
 *               for a reason — when that reason clears (active hours start,
 *               caps reset).
 *  · paused   — the user paused it.
 *  · idle     — nothing queued and no known next time; it's watching.
 */
export type LiveMode = 'running' | 'waiting' | 'paused' | 'idle';

export interface LiveActivity {
  mode: LiveMode;
  task: QueuedTask | null;
  /** Pending tasks, in order. */
  next: QueuedTask[];
  /** ms epoch the current wait ends. */
  until: number | null;
  /** ms epoch the current wait (or task) was first seen — for progress. */
  since: number;
  /** Why it's resting, when it is resting for a reason. */
  reason: 'outside-hours' | 'caps-spent' | 'nothing-matched' | null;
  now: number;
}

const inWindow = (h: number, start: number, end: number) => (start < end ? h >= start && h < end : h >= start || h < end);

/** Next local time the active window opens. */
const nextStart = (s: ExtensionSettings, from = new Date()): number => {
  const t = new Date(from);
  t.setMinutes(0, 0, 0);
  for (let i = 0; i < 48; i++) {
    t.setHours(t.getHours() + 1);
    if (t.getHours() === s.activeHours.startHour) return t.getTime();
  }
  return from.getTime();
};

/** Caps reset at local midnight; work resumes then if that's inside the window, else when it opens. */
const capsReset = (s: ExtensionSettings, from = new Date()): number => {
  const midnight = new Date(from);
  midnight.setHours(24, 0, 0, 0);
  return inWindow(0, s.activeHours.startHour, s.activeHours.endHour) ? midnight.getTime() : nextStart(s, midnight);
};

export const useLiveActivity = (status: EngineStatus): LiveActivity => {
  const [queue, setQueue] = useState<QueuedTask[]>([]);
  const [nextEligibleAt, setNextEligibleAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  // First time we saw the current task / wait, keyed so it survives re-renders.
  const seen = useRef<{ key: string; at: number }>({ key: '', at: Date.now() });

  useEffect(() => {
    const load = async () => {
      const [q, s] = await Promise.all([getQueue(), getSchedulerState()]);
      setQueue(q);
      setNextEligibleAt(s.nextEligibleAt);
    };
    void load();
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: chrome.storage.AreaName) => {
      if (area === 'local' && (STORAGE_KEYS.queue in changes || STORAGE_KEYS.schedulerState in changes)) void load();
    };
    chrome.storage.onChanged.addListener(listener);
    const tick = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
      clearInterval(tick);
    };
  }, []);

  const settings = status.settings;
  const task = queue.find((t) => t.status === 'running') ?? null;
  const next = queue.filter((t) => t.status === 'pending');
  const code = status.blockReason?.code;

  let mode: LiveMode;
  let until: number | null = null;
  let reason: LiveActivity['reason'] = null;

  if (settings?.isPaused) {
    mode = 'paused';
  } else if (task) {
    mode = 'running';
  } else if (settings && code === 'outside-hours') {
    mode = 'waiting';
    reason = 'outside-hours';
    until = nextStart(settings);
  } else if (settings && code === 'caps-spent') {
    mode = 'waiting';
    reason = 'caps-spent';
    until = capsReset(settings);
  } else if (nextEligibleAt > now) {
    mode = 'waiting';
    until = nextEligibleAt;
    if (code === 'nothing-matched') reason = 'nothing-matched';
  } else {
    mode = 'idle';
    if (code === 'nothing-matched') reason = 'nothing-matched';
  }

  const key = `${mode}:${task?.id ?? ''}:${until ?? ''}`;
  if (seen.current.key !== key) seen.current = { key, at: Date.now() };

  return { mode, task, next, until, since: seen.current.at, reason, now };
};
