/**
 * Mentions — pure logic (updateplan 4.1/4.2).
 *
 * The notifications tab has always existed; nothing in this product has ever
 * read it (D15). This module is the decision-making half of fixing that:
 * classifying what shape a mention is, and deciding which ones are worth a
 * draft first when there are more than the scan's budget allows.
 *
 * Kept pure — no DOM, no chrome — on the same principle as `block-reason.ts`
 * and `topics.ts`: the DOM-scraping side (`platforms/twitter/mentions.ts`)
 * gathers plain data, and everything that decides anything happens here, where
 * `scripts/mentions-smoke.mts` can drive it in plain node.
 */

/**
 * The three shapes X renders on the Mentions tab, per the plan. Distinguished
 * because they prompt differently (4.2's "thread context") and because a reply
 * to your OWN post is a conversation you're already in, not a cold mention.
 */
export type MentionType = 'reply-to-your-post' | 'quote-of-your-post' | 'mention';

/** What the DOM-scraping side hands this module, before priority is scored. */
export interface MentionContext {
  text: string;
  ownHandle: string | null;
  /** Handles named in a "Replying to" line above the tweet, when the DOM had one. */
  replyingToHandles: string[];
  /** Author of a tweet quoted inside this one, when there's a quote box. */
  quotedAuthorHandle: string | null;
}

/**
 * Which shape a mention is.
 *
 * A reply-to-your-post always outranks a quote in ambiguous cases (checked
 * first) because a reply is more clearly a live conversation than a quote,
 * which is often just someone amplifying the post to their own audience.
 */
export const classifyMention = (ctx: MentionContext): MentionType => {
  const own = normalizeHandle(ctx.ownHandle);
  if (own && ctx.replyingToHandles.some((h) => normalizeHandle(h) === own)) {
    return 'reply-to-your-post';
  }
  if (own && ctx.quotedAuthorHandle && normalizeHandle(ctx.quotedAuthorHandle) === own) {
    return 'quote-of-your-post';
  }
  return 'mention';
};

const normalizeHandle = (h: string | null | undefined): string =>
  (h ?? '').replace(/^@/, '').toLowerCase();

/** One mention, ready to be ranked (and, if it wins a slot, drafted). */
export interface MentionCandidate {
  postId: string;
  postUrl: string;
  authorHandle: string | null;
  text: string;
  /** ISO timestamp, or null when the DOM's `<time>` didn't parse. */
  publishedAt: string | null;
  type: MentionType;
  /**
   * The author's follower count, when we've bothered to look it up (a real
   * profile visit) — null means unknown, not zero, and is scored conservatively
   * rather than assumed small.
   */
  authorFollowers: number | null;
}

/* -- priority ---------------------------------------------------------------
 *
 * "Prioritise by follower count and recency — a big account asking a question
 * decays fastest." Read literally: a big account's mention is worth more the
 * instant it lands, but that lead erodes faster than a small account's does —
 * a viral thread has moved on in twenty minutes; a quiet mention from a small
 * account is still worth answering hours later. So this is not "biggest
 * first": it's a HALF-LIFE that shrinks as the author's reach grows.
 * -------------------------------------------------------------------------- */

/** A brand-new mention from a small/unknown account stays worth answering for
 *  about this long before its priority has halved. */
const BASE_HALF_LIFE_MINUTES = 240;
/** However large the account, a mention's urgency never has a half-life
 *  shorter than this — otherwise a 10M-follower reply would already be "gone"
 *  by the time a scan (running every ~10 minutes) even sees it twice. */
const MIN_HALF_LIFE_MINUTES = 20;
/** How strongly follower count shrinks the half-life. Larger = faster decay
 *  for big accounts. Chosen so a ~40k-follower mention's half-life lands
 *  around an hour, matching "answer it within the hour or don't bother". */
const REACH_DECAY_STRENGTH = 0.6;

const followerWeight = (followers: number | null): number =>
  // Unknown is scored as a small account (0), not as average — an account we
  // haven't identified should never outrank one we know is worth answering,
  // it should just not be starved either: log10(10) = 1, a modest floor.
  Math.log10(Math.max(followers ?? 0, 0) + 10);

const halfLifeMinutes = (followers: number | null): number => {
  const reach = Math.log10(Math.max(followers ?? 0, 0) + 1);
  const halfLife = BASE_HALF_LIFE_MINUTES / (1 + reach * REACH_DECAY_STRENGTH);
  return Math.max(MIN_HALF_LIFE_MINUTES, halfLife);
};

/** Higher is more worth answering right now. */
export const mentionPriority = (
  candidate: Pick<MentionCandidate, 'authorFollowers' | 'publishedAt'>,
  now: number,
): number => {
  const publishedMs = candidate.publishedAt ? Date.parse(candidate.publishedAt) : NaN;
  const ageMinutes = Number.isNaN(publishedMs) ? 0 : Math.max(0, (now - publishedMs) / 60_000);
  const weight = followerWeight(candidate.authorFollowers);
  const decay = 0.5 ** (ageMinutes / halfLifeMinutes(candidate.authorFollowers));
  return weight * decay;
};

/** Highest priority first; ties broken by the newer mention. */
export const rankMentions = (
  candidates: readonly MentionCandidate[],
  now: number,
): MentionCandidate[] =>
  [...candidates].sort((a, b) => {
    const diff = mentionPriority(b, now) - mentionPriority(a, now);
    if (diff !== 0) return diff;
    const at = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bt = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return bt - at;
  });

/**
 * Drop mentions already drafted (or already answered) — "never drafted
 * twice". The actual dedupe store is `isAlreadyDrafted`/`isAlreadyCommented`
 * (the same ones the home feed already uses); this is the pure shape of the
 * check so it can be pinned without touching `chrome.storage`.
 */
export const dedupeMentions = (
  candidates: readonly MentionCandidate[],
  handledPostIds: ReadonlySet<string>,
): MentionCandidate[] => candidates.filter((c) => !handledPostIds.has(c.postId));
