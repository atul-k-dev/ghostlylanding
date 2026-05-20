import type { ActionType, Platform } from '@casper/shared';
import { getQueue, setQueue } from '../lib/storage.js';
import type { QueuedTask } from './types.js';

const uid = (): string =>
  // Service workers don't always have crypto.randomUUID — fall back if missing.
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `t_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const enqueue = async (
  platform: Platform,
  taskType: ActionType,
  payload: Record<string, unknown> = {},
): Promise<QueuedTask> => {
  const task: QueuedTask = {
    id: uid(),
    platform,
    taskType,
    payload,
    enqueuedAt: new Date().toISOString(),
    attempts: 0,
    status: 'pending',
  };
  const queue = await getQueue();
  queue.push(task);
  await setQueue(queue);
  return task;
};

export const peekNextPending = async (): Promise<QueuedTask | null> => {
  const queue = await getQueue();
  return queue.find((t) => t.status === 'pending') ?? null;
};

export const updateTask = async (
  id: string,
  patch: Partial<QueuedTask>,
): Promise<void> => {
  const queue = await getQueue();
  const idx = queue.findIndex((t) => t.id === id);
  if (idx === -1) return;
  const current = queue[idx];
  if (!current) return;
  queue[idx] = { ...current, ...patch };
  await setQueue(queue);
};

export const pruneFinished = async (keepRecent = 20): Promise<void> => {
  const queue = await getQueue();
  const finished = queue.filter(
    (t) => t.status === 'completed' || t.status === 'failed' || t.status === 'skipped',
  );
  if (finished.length <= keepRecent) return;
  const pending = queue.filter((t) => t.status === 'pending' || t.status === 'running');
  const recentFinished = finished
    .sort((a, b) => b.enqueuedAt.localeCompare(a.enqueuedAt))
    .slice(0, keepRecent);
  await setQueue([...pending, ...recentFinished]);
};

export const stats = async (): Promise<{
  pending: number;
  running: number;
  completed: number;
  failed: number;
}> => {
  const queue = await getQueue();
  return {
    pending: queue.filter((t) => t.status === 'pending').length,
    running: queue.filter((t) => t.status === 'running').length,
    completed: queue.filter((t) => t.status === 'completed').length,
    failed: queue.filter((t) => t.status === 'failed').length,
  };
};
