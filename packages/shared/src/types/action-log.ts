import type { ActionType, Platform } from './platform.js';

export interface ActionLog {
  id: string;
  userId: string;
  platform: Platform;
  actionType: ActionType;
  targetUrl: string;
  targetHandle?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
}

export type ActionLogInput = Omit<ActionLog, 'id' | 'userId'>;
