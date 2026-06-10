import type { Platform } from '@casper/shared';
import { getQueue, setQueue } from '../lib/storage.js';
import type { QueuedTask, SchedulerTaskType, TaskKind } from './types.js';

const uid = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `t_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const kindOf = (type: SchedulerTaskType): TaskKind =>
  type.startsWith('scan-') ? 'scan' : 'action';

export const enqueue = async (
  platform: Platform,
  taskType: SchedulerTaskType,
  payload: Record<string, unknown> = {},
): Promise<QueuedTask> => {
  const task: QueuedTask = {
    id: uid(),
    kind: kindOf(taskType),
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

export const hasRunningTask = async (): Promise<boolean> => {
  const queue = await getQueue();
  return queue.some((t) => t.status === 'running');
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

export const pruneFinished = async (keepRecent = 25): Promise<void> => {
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

/** Drop dev stub tasks and finished tasks on startup so a stale queue can't
 *  block real work. Keeps real pending/running tasks intact. */
export const purgeStaleTasks = async (): Promise<number> => {
  const queue = await getQueue();
  const kept = queue.filter((t) => {
    const payload = (t.payload ?? {}) as Record<string, unknown>;
    // Dev stub tasks (from the old seed button) — never valid.
    if ('seed' in payload) return false;
    const handle = typeof payload.targetHandle === 'string' ? payload.targetHandle : '';
    if (handle.startsWith('@stub_')) return false;
    // Finished tasks are just history — clear them on boot.
    if (t.status === 'completed' || t.status === 'failed' || t.status === 'skipped') return false;
    return true;
  });
  if (kept.length !== queue.length) await setQueue(kept);
  return queue.length - kept.length;
};

/** Repair the queue on startup — any tasks left in 'running' before SW eviction
 *  should be reset to 'pending' so the next tick can resume them. */
export const reviveRunningTasks = async (): Promise<number> => {
  const queue = await getQueue();
  let touched = 0;
  for (const t of queue) {
    if (t.status === 'running') {
      t.status = 'pending';
      touched++;
    }
  }
  if (touched > 0) await setQueue(queue);
  return touched;
};
