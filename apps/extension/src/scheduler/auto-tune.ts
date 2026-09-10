import type { TargetPerformance } from '@casper/shared';

/**
 * Weekly auto-tune (updateplan 6.1) — the decision, kept pure and separate
 * from the network call that fetches `TargetPerformance` and the settings
 * write that applies it, so it's testable without either.
 *
 * Scoped to what's honestly automatable: dropping targets flagged `stale`
 * by the SAME threshold (21 days, no reply activity) the Growth tab already
 * shows the user before this ever runs unattended — never a second, looser
 * rule invented for the automatic path. "Promote ones that work" and "shift
 * budget between replying and posting" are NOT decided here: neither has a
 * safe, reversible automatic action in this codebase yet (see the Phase 6
 * progress log for why). "Move posting times toward measured peaks" needs
 * no decision here at all — `auto-posting.ts` already recomputes `bestTimes`
 * fresh every time it schedules.
 */

/** Once a week — same cadence pattern as auto-posting.ts's own gate. */
export const AUTO_TUNE_INTERVAL_DAYS = 7;
const INTERVAL_MS = AUTO_TUNE_INTERVAL_DAYS * 24 * 60 * 60 * 1000;

/** Cheap, local, no network — checked BEFORE fetching real target data, so a
 *  disabled or recently-run install never makes the request at all. */
export const isAutoTuneDue = (enabled: boolean, lastRunAt: string | null, now: number): boolean => {
  if (!enabled) return false;
  const last = lastRunAt ? Date.parse(lastRunAt) : NaN;
  return !Number.isFinite(last) || now - last >= INTERVAL_MS;
};

/** Bare handles to drop — always a subset of the stale targets passed in,
 *  never more than that (never a guess at what "not working" means beyond
 *  the same threshold the user can already see in the Growth tab). */
export const dropHandlesFor = (
  targets: readonly Pick<TargetPerformance, 'handle' | 'stale'>[],
): string[] => targets.filter((t) => t.stale).map((t) => t.handle);
