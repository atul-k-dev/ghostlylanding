import type { Platform } from '@casper/shared';

/**
 * Shared whitelist checking (updateplan 6.6 — D7).
 *
 * "Whitelist is not honored in the main follow path... honored only at
 * executor.ts:269-271." Three follow paths read this now — the standalone
 * follow-list runner (`runInlineFollowList`, which already worked), the
 * inline home/search/profile follow in `autopilot.ts`, and the single-handle
 * `executeFollow` task — and all three need to agree on what "the same
 * handle" means. Pulled out here so that agreement is one function, not three
 * copies of `.replace(/^@/, '').toLowerCase()` that could drift.
 */
export const normalizeHandle = (handle: string): string => handle.replace(/^@/, '').toLowerCase();

export const isWhitelisted = (
  handle: string,
  platform: Platform,
  whitelist: readonly { platform: Platform; handle: string }[],
): boolean =>
  whitelist.some(
    (w) => w.platform === platform && normalizeHandle(w.handle) === normalizeHandle(handle),
  );
