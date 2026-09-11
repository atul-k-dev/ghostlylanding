import type { ActionType, ActionTypeCounts, PlatformCaps } from '@casper/shared';
import { localDate } from '../../scheduler/timegate.js';
import { platformCapsForToday, searchCapsForToday } from '../../scheduler/quotas.js';
import type { EngineStatus } from '../useEngineStatus.js';
import type { Growth } from './useGrowth';

/**
 * Today's real numbers for Home.
 *
 * Two things the raw counter gets wrong on its own:
 *  · it only rolls over on the first action of a new day, so until then it
 *    still holds YESTERDAY — checked here against today's date in the user's
 *    timezone, exactly as the scheduler computes it;
 *  · topic feeds spend a separate budget (`searchByActionType` / `searchCap`),
 *    so the home-feed counts alone under-report both what was done and the
 *    real daily allowance.
 */
export interface ActionBudget {
  type: ActionType;
  done: number;
  cap: number;
}

export interface TodayNumbers {
  likes: number;
  replies: number;
  follows: number;
  used: number;
  allowance: number;
  /** 0–1 of today's allowance. */
  fraction: number;
  /** Per action, home feed + topic feeds together; only actions with a budget. */
  byType: ActionBudget[];
  /** Followers gained today; null until the server has two readings. */
  followersGained: number | null;
  /** Follower count at the latest reading; null before the first one. */
  followersTotal: number | null;
  growthLoading: boolean;
  /** Take a fresh profile reading (a minute or so), then reload the numbers. */
  refreshGrowth: () => Promise<void>;
}

const ORDER: ActionType[] = ['like', 'comment', 'follow', 'bookmark', 'repost', 'quote'];
const CAP_KEY: Record<ActionType, keyof PlatformCaps> = {
  like: 'likesPerDay',
  comment: 'commentsPerDay',
  follow: 'followsPerDay',
  bookmark: 'bookmarksPerDay',
  repost: 'repostsPerDay',
  quote: 'quotesPerDay',
};
const EMPTY: ActionTypeCounts = { like: 0, comment: 0, follow: 0, bookmark: 0, repost: 0, quote: 0 };

export const useTodayNumbers = (
  status: EngineStatus,
  growth: Pick<Growth, 'summary' | 'loading' | 'refreshing' | 'refresh'>,
): TodayNumbers => {
  const settings = status.settings;
  const counter = status.counters?.twitter ?? null;
  const today = settings ? localDate(new Date(), settings.timezone) : null;
  const fresh = counter && counter.date === today ? counter : null;

  const home = fresh?.byActionType ?? EMPTY;
  const search = fresh?.searchByActionType ?? EMPTY;
  let caps: PlatformCaps | null = fresh?.effectiveCap ?? null;
  if (!caps && settings && today) caps = platformCapsForToday(settings, 'twitter', today);
  const searchCaps = fresh?.searchCap ?? (caps ? searchCapsForToday(caps) : null);

  const byType = ORDER.map((type) => ({
    type,
    done: home[type] + search[type],
    cap: (caps?.[CAP_KEY[type]] ?? 0) + (searchCaps?.[CAP_KEY[type]] ?? 0),
  })).filter((b) => b.cap > 0 || b.done > 0);

  const used = byType.reduce((a, b) => a + b.done, 0);
  const allowance = byType.reduce((a, b) => a + b.cap, 0);

  return {
    likes: home.like + search.like,
    replies: home.comment + search.comment,
    follows: home.follow + search.follow,
    used,
    allowance,
    fraction: allowance > 0 ? Math.min(1, used / allowance) : 0,
    byType,
    followersGained: growth.summary?.deltas.day.change ?? null,
    followersTotal: growth.summary?.latest?.followers ?? null,
    growthLoading: growth.loading || growth.refreshing,
    refreshGrowth: growth.refresh,
  };
};
