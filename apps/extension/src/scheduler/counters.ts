import type {
  ActionType,
  CountersState,
  DailyCounter,
  ExtensionSettings,
  Platform,
} from '@casper/shared';
import { getCounters, setCounters } from '../lib/storage.js';
import { localDate } from './timegate.js';
import { platformCapsForToday, searchCapsForToday } from './quotas.js';
import { recordActed } from './rate-limit.js';

const emptyByAction = (): DailyCounter['byActionType'] => ({
  like: 0,
  comment: 0,
  follow: 0,
  bookmark: 0,
  repost: 0,
  quote: 0,
});

const newDailyCounter = (
  date: string,
  settings: ExtensionSettings,
  platform: Platform,
): DailyCounter => {
  const effectiveCap = platformCapsForToday(settings, platform);
  return {
    date,
    byActionType: emptyByAction(),
    effectiveCap,
    searchByActionType: emptyByAction(),
    searchCap: searchCapsForToday(effectiveCap),
  };
};

/**
 * Ensure today's counter exists and reset stale ones at user-local midnight.
 * Returns the resulting state and (mutates) persisted storage.
 */
export const ensureToday = async (settings: ExtensionSettings): Promise<CountersState> => {
  const current = await getCounters();
  const today = localDate(new Date(), settings.timezone);

  const reset = (existing: DailyCounter | null, platform: Platform): DailyCounter => {
    if (existing && existing.date === today) {
      // Backfill the search-budget fields (updateplan 6.7) for a counter that
      // was persisted by an older build earlier today, before an upgrade —
      // without this, `existing` would be returned as-is and every search
      // action would throw on a missing `searchByActionType`.
      if (existing.searchByActionType && existing.searchCap) return existing;
      return {
        ...existing,
        searchByActionType: existing.searchByActionType ?? emptyByAction(),
        searchCap: existing.searchCap ?? searchCapsForToday(existing.effectiveCap),
      };
    }
    return newDailyCounter(today, settings, platform);
  };

  const next: CountersState = {
    twitter: reset(current.twitter, 'twitter'),
    linkedin: reset(current.linkedin, 'linkedin'),
  };

  // Persist only if changed
  if (
    !current.twitter ||
    !current.linkedin ||
    current.twitter.date !== next.twitter?.date ||
    current.linkedin.date !== next.linkedin?.date
  ) {
    await setCounters(next);
  }
  return next;
};

const capForAction = (counter: DailyCounter, action: ActionType): number => {
  switch (action) {
    case 'like':
      return counter.effectiveCap.likesPerDay;
    case 'comment':
      return counter.effectiveCap.commentsPerDay;
    case 'follow':
      return counter.effectiveCap.followsPerDay;
    case 'bookmark':
      return counter.effectiveCap.bookmarksPerDay;
    case 'repost':
      return counter.effectiveCap.repostsPerDay;
    case 'quote':
      return counter.effectiveCap.quotesPerDay;
  }
};

export const isUnderCap = (
  counters: CountersState,
  platform: Platform,
  action: ActionType,
): boolean => {
  const c = counters[platform];
  if (!c) return false;
  return c.byActionType[action] < capForAction(c, action);
};

const capForSearchAction = (counter: DailyCounter, action: ActionType): number => {
  switch (action) {
    case 'like':
      return counter.searchCap.likesPerDay;
    case 'comment':
      return counter.searchCap.commentsPerDay;
    case 'follow':
      return counter.searchCap.followsPerDay;
    case 'bookmark':
      return counter.searchCap.bookmarksPerDay;
    case 'repost':
      return counter.searchCap.repostsPerDay;
    case 'quote':
      return counter.searchCap.quotesPerDay;
  }
};

/** Search feeds' own cap check (updateplan 6.7 — D8) — deliberately a
 *  separate function rather than a flag on `isUnderCap`, so a call site has
 *  to choose explicitly which budget it means. */
export const isUnderSearchCap = (
  counters: CountersState,
  platform: Platform,
  action: ActionType,
): boolean => {
  const c = counters[platform];
  if (!c) return false;
  return c.searchByActionType[action] < capForSearchAction(c, action);
};

export const incrementCounter = async (
  settings: ExtensionSettings,
  platform: Platform,
  action: ActionType,
): Promise<void> => {
  const counters = await ensureToday(settings);
  const c = counters[platform];
  if (!c) return;
  c.byActionType[action] += 1;
  await setCounters(counters);
  // Every platform-visible action passes through here — the in-session path
  // (RECORD_ACTION) and the queued-task path both — which makes this the one
  // place the rolling hourly window can be fed without missing anything.
  await recordActed();
};

/** Search feeds' own counter increment (updateplan 6.7 — D8). Still feeds the
 *  same rolling hourly window as `incrementCounter` — that ceiling is about
 *  how fast X sees actions arrive, not which feed asked for them. */
export const incrementSearchCounter = async (
  settings: ExtensionSettings,
  platform: Platform,
  action: ActionType,
): Promise<void> => {
  const counters = await ensureToday(settings);
  const c = counters[platform];
  if (!c) return;
  c.searchByActionType[action] += 1;
  await setCounters(counters);
  await recordActed();
};
