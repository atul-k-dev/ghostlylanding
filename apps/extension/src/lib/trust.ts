/**
 * Graduated trust (updateplan 3.3).
 *
 * `replyApproval` was a switch: hold everything, or hold nothing. This turns it
 * into something the product earns. Every time the user approves a draft — a
 * reply or a post — **without changing a word**, the streak grows. At
 * `TRUST_THRESHOLD` we ask, once, whether we should just publish from now on.
 *
 * Three rules, and all three are the point:
 *
 *  1. **An edit resets the streak to zero.** An edit is the user saying "not
 *     quite" — the one signal that says we have not earned this yet.
 *  2. **Trust is never granted by this module.** `answerOffer` only records what
 *     the user said; the caller flips the settings. There is no code path where
 *     auto-publishing switches itself on.
 *  3. **Declining is not a snooze.** It resets the streak, so the next ask is
 *     another twenty clean approvals away, not tomorrow.
 *
 * Pure — no chrome, no React — so `scripts/trust-smoke.mts` can drive the whole
 * state machine in node.
 */

/** Consecutive edit-free approvals before we ask. */
export const TRUST_THRESHOLD = 20;

/** What the user was approving. Both count toward the same streak: the question
 *  being asked is "do you change what I write", and it has one answer. */
export type TrustSubject = 'reply' | 'post';

export interface TrustState {
  /** Consecutive approvals with zero edits. */
  streak: number;
  /** Highest streak ever reached, so the UI can show progress honestly. */
  best: number;
  /** ISO timestamp of the offer currently on screen, or null if none is. */
  offeredAt: string | null;
  /** ISO timestamp of the last "no". Kept so we never nag. */
  declinedAt: string | null;
  /** ISO timestamp of the user's explicit yes. Null means not granted. */
  grantedAt: string | null;
}

export const INITIAL_TRUST: TrustState = {
  streak: 0,
  best: 0,
  offeredAt: null,
  declinedAt: null,
  grantedAt: null,
};

/** Fill in a state persisted before this shape existed. */
export const normalizeTrust = (state: Partial<TrustState> | null | undefined): TrustState => ({
  ...INITIAL_TRUST,
  ...(state ?? {}),
});

/**
 * Record one approval.
 *
 * `edited` is the whole signal. It must be computed from the text actually
 * sent versus the text we generated — not from whether the textarea was
 * focused, and not from a whitespace difference.
 */
export const recordApproval = (
  state: TrustState,
  { edited, now = new Date() }: { edited: boolean; now?: Date },
): TrustState => {
  const s = normalizeTrust(state);
  if (edited) {
    // Reset, and take any live offer down with it: an offer that survived an
    // edit would be asking to publish unread the very thing just rewritten.
    return { ...s, streak: 0, offeredAt: null };
  }
  const streak = s.streak + 1;
  const next: TrustState = { ...s, streak, best: Math.max(s.best, streak) };
  if (s.grantedAt === null && s.offeredAt === null && streak >= TRUST_THRESHOLD) {
    return { ...next, offeredAt: now.toISOString() };
  }
  return next;
};

/** Is there an offer waiting for an answer? */
export const hasOpenOffer = (state: TrustState): boolean =>
  normalizeTrust(state).offeredAt !== null && normalizeTrust(state).grantedAt === null;

/**
 * The user's answer.
 *
 * "No" resets the streak deliberately: the alternative is asking again on the
 * next approval, forever, which is how a product teaches people to ignore it.
 */
export const answerOffer = (
  state: TrustState,
  { accept, now = new Date() }: { accept: boolean; now?: Date },
): TrustState => {
  const s = normalizeTrust(state);
  if (!s.offeredAt) return s;
  if (accept) return { ...s, offeredAt: null, grantedAt: now.toISOString() };
  return { ...s, offeredAt: null, streak: 0, declinedAt: now.toISOString() };
};

/** Hand the keys back. The streak starts again from nothing. */
export const revokeTrust = (state: TrustState): TrustState => ({
  ...normalizeTrust(state),
  grantedAt: null,
  offeredAt: null,
  streak: 0,
});

/** May we publish without the user reading it first? */
export const isTrusted = (state: TrustState | null | undefined): boolean =>
  normalizeTrust(state).grantedAt !== null;

/**
 * The offer, in the plan's own words. Fixed copy — it is asking for permission
 * to publish under someone's name, and every clause of it is doing work: what
 * they did, what changes, what does not, and how to undo it.
 *
 * The count is interpolated from `TRUST_THRESHOLD` rather than typed out, so
 * changing the threshold can never leave the sentence claiming a number the
 * code doesn't use.
 */
export const TRUST_OFFER = {
  title: `You've approved ${TRUST_THRESHOLD} in a row without changing a word.`,
  body: "Want me to just post them from now on? You'll still see everything, and you can undo any of it.",
  accept: 'Yes, post them',
  decline: 'No, keep showing me',
} as const;
