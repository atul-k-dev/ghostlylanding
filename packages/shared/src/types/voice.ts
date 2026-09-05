/**
 * Voice training — teaching Ghostly to write like the user rather than like one
 * of six shared tone presets.
 *
 * The extension samples the user's own posts off their profile and the server
 * distils them into a short style guide. Only the DISTILLED guide is persisted:
 * the sampled posts are processed in memory and thrown away, the same way reply
 * generation keeps only a hash of the source post.
 */

export interface VoiceProfile {
  /** The extracted style guide, injected into reply and post prompts. */
  summary: string;
  /** How many of the user's posts it was distilled from. */
  sampleCount: number;
  /** ISO timestamp of the training run. */
  trainedAt: string;
}

export const VOICE_LIMITS = {
  /**
   * Below this the profile would be guesswork — better to keep the tone preset
   * and tell the user to post more.
   */
  minSamples: 8,
  /** Enough to capture habits; more just costs tokens. */
  maxSamples: 50,
  /** Per-post cap when uploading samples. */
  maxPostChars: 600,
  /** Hard ceiling on the stored guide, so a prompt can't grow unbounded. */
  maxSummaryChars: 1_200,
} as const;
