import type { TonePreset } from '@casper/shared';
import { TONE_PRESETS } from '@casper/shared';
import { apiFetch } from './api.js';
import { getSettings, tweetLimitFor } from './storage.js';

/**
 * Ask the server for post ideas, in the user's own voice.
 *
 * Extracted from `background/index.ts`'s `GENERATE_IDEAS` handler in updateplan
 * 3.2, because the auto-draft loop needs the same call and a second copy of it
 * would drift: `/api/posts/ideas` already reads the trained voice profile and
 * the user's best-performing posts server-side, and it moderates every idea
 * before returning it. Both callers must get all of that, always.
 */
export interface IdeaRequest {
  count: number;
}

export interface IdeaResult {
  ideas: string[];
  /** How many of the user's own winners the model was shown. 0 = topics only. */
  basedOnWinners: number;
}

/** Server-side cap: the endpoint takes 1–5. */
export const MAX_IDEAS = 5;

export const requestPostIdeas = async ({
  count,
}: IdeaRequest): Promise<
  { ok: true; data: IdeaResult } | { ok: false; error: { code: string; message: string } }
> => {
  const settings = await getSettings();
  const tone: TonePreset = TONE_PRESETS.includes(settings.tone) ? settings.tone : 'friendly';
  return await apiFetch<IdeaResult>('/api/posts/ideas', {
    method: 'POST',
    body: {
      topics: settings.contentTopics.slice(0, 10),
      count: Math.min(Math.max(count, 1), MAX_IDEAS),
      maxChars: tweetLimitFor(settings.xAccountPlan, settings.postLength),
      tone,
    },
  });
};
