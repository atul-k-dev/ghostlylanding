import type { ActionType, Platform } from '@casper/shared';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface QueuedTask {
  id: string;
  platform: Platform;
  taskType: ActionType;
  payload: Record<string, unknown>;
  enqueuedAt: string;
  attempts: number;
  status: TaskStatus;
  lastError?: string;
}

export interface SchedulerState {
  /** ms epoch — earliest time scheduler is allowed to run the next task */
  nextEligibleAt: number;
  /** ms epoch — last time we flushed the local action-log buffer */
  lastFlushAt: number;
}
