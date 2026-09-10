import type { ActionType, Platform } from './platform.js';

export interface ActionLog {
  id: string;
  userId: string;
  /**
   * Client-generated id, unique per logged action. The extension keeps its
   * buffer when a flush fails — including when the failure was a lost response
   * to a request the server had already committed — so without this the retry
   * writes the same actions twice, inflating the dashboard AND the monthly
   * quota that gates the free tier.
   */
  clientId?: string;
  platform: Platform;
  actionType: ActionType;
  targetUrl: string;
  targetHandle?: string;
  /**
   * The home-feed keyword that made this post relevant (updateplan 5.1's
   * "which topics are working"), when the action came from a keyword match
   * rather than a target creator's profile or an unfiltered feed. Absent for
   * everything else — never guessed after the fact.
   */
  matchedKeyword?: string;
  success: boolean;
  errorMessage?: string;
  timestamp: string;
}

export type ActionLogInput = Omit<ActionLog, 'id' | 'userId'>;
