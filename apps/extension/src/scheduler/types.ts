import type { ActionType, Platform } from '@casper/shared';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type TaskKind = 'action' | 'scan';

/** Non-action tasks (internal scanning steps that feed real actions). */
export type ScanTaskType =
  | 'scan-profile-likes'
  | 'scan-profile-followers'
  | 'scan-home-feed';
export type SchedulerTaskType = ActionType | ScanTaskType;

export interface QueuedTask {
  id: string;
  kind: TaskKind;
  platform: Platform;
  taskType: SchedulerTaskType;
  payload: Record<string, unknown>;
  enqueuedAt: string;
  attempts: number;
  status: TaskStatus;
  lastError?: string;
}

export interface SchedulerState {
  /** ms epoch — earliest time scheduler may run the next task */
  nextEligibleAt: number;
  /** ms epoch — last time we flushed the local action-log buffer */
  lastFlushAt: number;
}

/** Per-target persisted state — tracks the last successful scan(s). */
export interface TargetState {
  lastScannedAt: number; // last likes-scan
  lastFollowScanAt?: number; // last followers-scan
  lastHomeScanAt?: number; // last home-feed scan (keyed `home:${platform}`)
}

export type TargetStateMap = Record<string, TargetState>; // key = `${platform}:${handle}`

/** Result returned by executor functions. */
export interface ExecutorResult {
  success: boolean;
  errorMessage?: string;
  /** Only present for kind='action' tasks; scans don't write to the action log. */
  logEntry?: import('@casper/shared').ActionLogInput;
}
