/**
 * Follow-back attribution (updateplan 5.1/5.2).
 *
 * The only per-account follower figure X's UI honestly allows: of a sample of
 * the user's own recent followers, how many are accounts Ghostly followed
 * FIRST. Everything else in the Growth tab's attribution (targets, topics,
 * engagement sources) is a count of ACTIONS or ENGAGEMENT, never a follower
 * count, because there is no other honest way to link an individual new
 * follower to an individual past action.
 *
 * Extracted from `executor.ts`'s `executeGrowthScan` so the maths is testable
 * without a browser.
 */
export interface FollowedBackResult {
  followedBack: number;
  followedBackSample: number;
}

/**
 * Null when there's no sample to compute from — a scan that didn't sample
 * the followers list, or a genuinely empty one — rather than a guessed zero.
 * A zero SAMPLE and a zero FOLLOWED-BACK mean different things, and only one
 * of them is "we don't know".
 */
export const computeFollowedBack = (
  sample: readonly { handle: string }[],
  followedHandles: ReadonlySet<string>,
): FollowedBackResult | null => {
  if (sample.length === 0) return null;
  const followedBack = sample.filter((f) =>
    followedHandles.has(f.handle.replace(/^@/, '').toLowerCase()),
  ).length;
  return { followedBack, followedBackSample: sample.length };
};
