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
  const effectiveCap = platformCapsForToday(settings, platform, date);
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
      // `effectiveCap` used to be frozen the instant today's counter was first
      // created and never touched again — so a preset switch, or a same-day
      // fix to the ramp math (D17), silently had no effect until local
      // midnight. `platformCapsForToday` is now a pure function of the day
      // (the variance is seeded by the date, not `Math.random()`), so
      // recomputing it here is idempotent — same settings, same day, same
      // number — and only actually changes anything when settings or the code
      // computing them did. `byActionType`/`searchByActionType` (what's
      // actually been DONE today) are untouched either way.
      const effectiveCap = platformCapsForToday(settings, platform, today);
      return {
        ...existing,
        effectiveCap,
        searchByActionType: existing.searchByActionType ?? emptyByAction(),
        searchCap: searchCapsForToday(effectiveCap),
      };
    }
    return newDailyCounter(today, settings, platform);
  };

  const nextTwitter = reset(current.twitter, 'twitter');
  const nextLinkedin = reset(current.linkedin, 'linkedin');
  const next: CountersState = { twitter: nextTwitter, linkedin: nextLinkedin };

  // Persist whenever the date rolled over OR today's effectiveCap was
  // recomputed to something different than what's stored — a preset switch,
  // or a same-day fix to the ramp/age math, changes the cap without changing
  // the date, and the UI reads counters from storage directly (not through
  // this function's return value), so skipping the write here would leave it
  // showing yesterday's number under today's rules.
  const capsDiffer = (a: DailyCounter | null, b: DailyCounter): boolean =>
    !a || JSON.stringify(a.effectiveCap) !== JSON.stringify(b.effectiveCap);
  if (
    capsDiffer(current.twitter, nextTwitter) ||
    capsDiffer(current.linkedin, nextLinkedin) ||
    current.twitter?.date !== nextTwitter.date ||
    current.linkedin?.date !== nextLinkedin.date
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
