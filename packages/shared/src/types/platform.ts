export const PLATFORMS = ['twitter', 'linkedin'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const ACTION_TYPES = ['like', 'comment', 'follow', 'bookmark', 'repost', 'quote'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const TONE_PRESETS = [
  'friendly',
  'professional',
  'funny',
  'witty',
  'supportive',
  'bold',
] as const;
export type TonePreset = (typeof TONE_PRESETS)[number];

/**
 * How long an auto-generated reply should be, measured in short lines.
 * 1 line ≈ 8–10 words. Default is 1 (keep replies punchy).
 */
export const COMMENT_LENGTHS = [1, 2, 3] as const;
export type CommentLength = (typeof COMMENT_LENGTHS)[number];
