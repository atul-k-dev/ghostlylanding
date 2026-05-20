import { getOpenAI } from './client.js';

export interface ModerationResult {
  flagged: boolean;
  categories: string[];
}

/**
 * Run OpenAI moderation. Returns flagged=true if any category triggered.
 * Throws on API failure — caller decides whether to fail-closed (don't post)
 * or fail-open (skip moderation, e.g. for the post-text input pass).
 */
export const moderate = async (text: string): Promise<ModerationResult> => {
  const client = getOpenAI();
  const resp = await client.moderations.create({ input: text });
  const first = resp.results[0];
  if (!first) return { flagged: false, categories: [] };
  const cats = Object.entries(first.categories)
    .filter(([, v]) => v === true)
    .map(([k]) => k);
  return { flagged: first.flagged === true, categories: cats };
};
