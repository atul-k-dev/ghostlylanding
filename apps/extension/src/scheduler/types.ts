import type { ActionType, Platform } from '@casper/shared';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
export type TaskKind = 'action' | 'scan';

/** Non-action tasks (internal scanning steps that feed real actions). */
export type ScanTaskType =
  | 'scan-profile-likes'
  | 'scan-profile-followers'
  | 'scan-home-feed'
  | 'scan-followback'
  /** Daily growth scoreboard read: profile counters + how our posts performed. */
  | 'scan-growth'
  /** Work a live-search feed (X's "Latest" tab) for one saved query. */
  | 'scan-search';
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
  /**
   * ms epoch — last diagnostics flush. Tracked separately from lastFlushAt on
   * purpose: a fully broken install produces NO action logs, so gating
   * diagnostics on the action-log buffer would mute telemetry in exactly the
   * situation it exists to report.
   */
  lastDiagFlushAt?: number;
  /** ms epoch when the current Active session began; null while paused. */
  activeSince: number | null;
  /** Consecutive 'degraded' runs. Resets on any healthy one; trips the breaker. */
  degradedStreak?: number;
}

/** Per-target persisted state — tracks the last successful scan(s). */
export interface TargetState {
  lastScannedAt: number; // last likes-scan
  lastFollowScanAt?: number; // last followers-scan
  lastHomeScanAt?: number; // last home-feed scan (keyed `home:${platform}`)
  lastGrowthScanAt?: number; // last growth scoreboard read (keyed `growth:${platform}`)
  lastSearchScanAt?: number; // last live-search sweep (keyed `search:${query}`)
}

export type TargetStateMap = Record<string, TargetState>; // key = `${platform}:${handle}`

/** Result returned by executor functions. */
export interface ExecutorResult {
  success: boolean;
  errorMessage?: string;
  /**
   * Whether the run looked HEALTHY, regardless of whether it acted.
   *
   * 'degraded' means we couldn't see the page at all — the tab failed to drive,
   * or the timeline rendered zero posts (signed out, or a selector break).
   * A run that scanned plenty of posts and matched none is 'ok': a quiet feed
   * or narrow keywords is not a fault, and treating it as one would pause the
   * engine on an ordinary slow day.
   */
  health?: 'ok' | 'degraded';
  /** Only present for kind='action' tasks; scans don't write to the action log. */
  logEntry?: import('@casper/shared').ActionLogInput;
}
