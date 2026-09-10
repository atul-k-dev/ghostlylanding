/**
 * Voice tuning from edits (updateplan 6.3).
 *
 * "Edit & post stores (generated, corrected) pairs" (3.5) and "an edit says
 * 'this instead', which is the only signal that carries the user's actual
 * voice" (2.4) — both already collect the pairs this feeds on. This module
 * is just the gate: WHEN is it worth spending a retrain on what's
 * accumulated. The retrain itself reuses `/api/voice/train` unchanged (same
 * reasoning as 3.1's best-times model: no new server surface for a feature
 * that can be built entirely from data already flowing through the client).
 */

export const VOICE_TUNE_INTERVAL_DAYS = 7;
/** Below this many NEW corrections since the last tune, retraining would be
 *  reacting to noise (one or two edits) rather than a real pattern. */
export const MIN_NEW_CORRECTIONS = 5;

export interface VoiceTuneState {
  lastTunedAt: string | null;
  /** How many corrected drafts existed at the last tune — so "new since
   *  then" is a real count, not "corrected.length" which only ever grows. */
  lastCorrectionCount: number;
}

export const decideVoiceTune = (state: VoiceTuneState, now: number, correctedCount: number): boolean => {
  const last = state.lastTunedAt ? Date.parse(state.lastTunedAt) : NaN;
  const dueByTime =
    !Number.isFinite(last) || now - last >= VOICE_TUNE_INTERVAL_DAYS * 24 * 60 * 60 * 1000;
  if (!dueByTime) return false;
  const newCorrections = correctedCount - state.lastCorrectionCount;
  return newCorrections >= MIN_NEW_CORRECTIONS;
};
