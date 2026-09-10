import { matchesAny } from '../platforms/common/relevance.js';

/**
 * Bio-based follow quality filter (updateplan 6.5 — D9).
 *
 * "Follows have zero quality filter — follows whoever is next in a followers
 * list. Bio text is in the same DOM node and never read." This is the fix for
 * the bio half of that: pure, so it's testable without a DOM.
 *
 * Deliberately NOT a follower-count or recent-activity filter too, even
 * though the plan step names both. `runInlineFollowList`'s whole design is
 * following people IN PLACE off one list, in one tab, without opening a
 * profile per candidate ("No more per-candidate tabs" — its own docstring) —
 * and neither a follower count nor a last-active date is ever rendered on a
 * followers-list cell. Reading either would mean visiting every candidate's
 * profile, which is a bigger architectural change than a quality filter, not
 * a missing selector. Flagged in the Phase 6 progress log rather than built
 * against data a list cell doesn't have.
 */
export const passesFollowFilter = (
  bio: string,
  filter: { keywords: string[]; excludeKeywords: string[] },
): boolean => {
  if (filter.excludeKeywords.length > 0 && matchesAny(bio, filter.excludeKeywords)) return false;
  if (filter.keywords.length === 0) return true;
  return matchesAny(bio, filter.keywords);
};
