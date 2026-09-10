import { driveTab } from '../platforms/common/tab-driver.js';
import type { DryRunCandidate } from '../platforms/common/content-messages.js';
import { getSettings, getCommentedPosts, getDraftedPosts } from '../lib/storage.js';
import { FRESH_WINDOW_HOURS } from '../platforms/common/freshness.js';

/**
 * The dry run — setup step 3.
 *
 * Ten posts it would engage, with the reply it would actually have written for
 * each, having done none of it. The value is entirely in it being the SAME
 * decision path: `RUN_HOME` with `dryRun: true` walks the identical freshness,
 * own-post, reply, relevance and exclusion filters in `autopilot.ts` and stops
 * the moment before it would touch the page. A separate "preview" routine would
 * have been easier and worthless, because it would slowly stop agreeing with
 * what the engine really does.
 *
 * Nothing here spends anything: no counters, no daily caps, no hourly window,
 * no action log. It does spend model calls on the drafts, which is the point —
 * a previewed reply nobody generated would misrepresent the product.
 */

/** Posts to collect. The plan's number, and about a screenful of cards. */
export const DRY_RUN_POSTS = 10;

/** Enough to scroll a quiet feed and draft ten replies; not enough to sit forever. */
const DRY_RUN_MAX_MS = 4 * 60_000;

const HOME_URL = 'https://x.com/home';

export type DryRunOutcome =
  | { ok: true; candidates: DryRunCandidate[]; scanned: number }
  | { ok: false; error: string };

export const runDryRun = async (max = DRY_RUN_POSTS): Promise<DryRunOutcome> => {
  const settings = await getSettings();
  const hf = settings.homeFeed;

  const prefix = 'twitter:';
  const stripPrefix = (map: Record<string, number>): string[] =>
    Object.keys(map)
      .filter((k) => k.startsWith(prefix))
      .map((k) => k.slice(prefix.length))
      .slice(0, 500);
  // A post already replied to, or already sitting in the review queue, would
  // not be engaged again — so previewing it would be a lie by omission.
  const skipCommentIds = [
    ...new Set([...stripPrefix(await getCommentedPosts()), ...stripPrefix(await getDraftedPosts())]),
  ].slice(0, 500);

  let resp;
  try {
    resp = await driveTab(
      HOME_URL,
      {
        type: 'RUN_HOME',
        payload: {
          platform: 'twitter',
          // Mirror what the engine is actually configured to do, so the preview
          // is of THIS user's setup rather than of a default one. Publishing
          // actions stay off: a dry run is about what it would say and who it
          // would talk to, not about reposting.
          like: hf.like,
          comment: hf.comment,
          follow: hf.follow,
          bookmark: false,
          repost: false,
          quote: false,
          keywords: hf.keywords,
          excludeKeywords: hf.excludeKeywords,
          interactive: false,
          replyApproval: true,
          skipReplies: settings.skipReplies !== false,
          freshnessHours: FRESH_WINDOW_HOURS,
          // Budgets are deliberately NOT the daily caps: a dry run spends none
          // of them, and someone whose caps are spent for the day still needs to
          // be able to see what tomorrow looks like.
          maxLikes: max,
          maxComments: max,
          maxFollows: max,
          maxBookmarks: 0,
          maxReposts: 0,
          maxQuotes: 0,
          totalBudget: max * 3,
          maxRunMs: DRY_RUN_MAX_MS,
          stopAfterStaleRun: 0,
          skipCommentIds,
          skipQuoteIds: [],
          // Unused in a dry run (nothing waits between actions it never takes),
          // but the contract requires them and a zero here would be a lie about
          // the pacing if the flag were ever dropped.
          minDelayMs: 8_000,
          maxDelayMs: 45_000,
          dryRun: true,
          dryRunMax: max,
        },
      },
      { settleMs: 3_500 },
    );
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not open your feed' };
  }

  if (resp.type !== 'HOME_AUTOPILOT_RESULT') {
    return {
      ok: false,
      error: resp.type === 'ERROR' ? resp.payload.message : 'Could not read your feed',
    };
  }

  return {
    ok: true,
    candidates: resp.payload.wouldEngage ?? [],
    scanned: resp.payload.scanned,
  };
};
