export const PLATFORMS = ['twitter', 'linkedin'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const ACTION_TYPES = ['like', 'comment', 'follow', 'bookmark', 'repost', 'quote'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const TONE_PRESETS = ['friendly', 'professional', 'witty'] as const;
export type TonePreset = (typeof TONE_PRESETS)[number];
