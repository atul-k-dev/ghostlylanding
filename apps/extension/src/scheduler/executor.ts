import type { ActionLogInput } from '@casper/shared';
import type { QueuedTask } from './types.js';
import { randomInt } from './timegate.js';

/**
 * Dispatch a task to its platform-specific executor.
 * In M3 every task type is stubbed. M4+ replaces individual cases with real DOM work.
 */
export const executeTask = async (task: QueuedTask): Promise<ActionLogInput> => {
  // simulate "work" with 1–3s of internal latency
  await new Promise((r) => setTimeout(r, randomInt(1_000, 3_000)));

  // 10% simulated failure to exercise error paths
  const success = Math.random() > 0.1;
  const targetUrl =
    (task.payload.targetUrl as string | undefined) ?? stubUrl(task.platform, task.id);
  const targetHandle = (task.payload.targetHandle as string | undefined) ?? undefined;

  return {
    platform: task.platform,
    actionType: task.taskType,
    targetUrl,
    ...(targetHandle ? { targetHandle } : {}),
    success,
    ...(success ? {} : { errorMessage: 'stub: simulated failure' }),
    timestamp: new Date().toISOString(),
  };
};

const stubUrl = (platform: string, id: string): string =>
  platform === 'twitter'
    ? `https://x.com/example/status/${id}`
    : `https://www.linkedin.com/posts/example-${id}`;
