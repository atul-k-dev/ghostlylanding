import type { Platform, TonePreset, CommentLength } from '@casper/shared';
import { getOpenAI } from './client.js';
import { buildCommentPrompt, commentMaxTokens } from './prompts.js';

// GPT-5.4-mini — fast + cheap, a big step up from gpt-4o-mini for short replies.
// (5.x API: `max_tokens` is rejected — use `max_completion_tokens`. This mini
// model does support a custom temperature, unlike gpt-5.5.)
const MODEL = 'gpt-5.4-mini';

interface GenerateArgs {
  platform: Platform;
  tone: TonePreset;
  length: CommentLength;
  postText: string;
}

export const generateCommentDraft = async ({
  platform,
  tone,
  length,
  postText,
}: GenerateArgs): Promise<string> => {
  const client = getOpenAI();
  const { system } = buildCommentPrompt({ platform, tone, length });
  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.7,
    max_completion_tokens: commentMaxTokens(length),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: postText.slice(0, 4_000) },
    ],
  });
  const text = completion.choices[0]?.message?.content?.trim() ?? '';
  return stripQuotes(text);
};

const stripQuotes = (s: string): string => {
  // Drop wrapping quotes models sometimes return
  const trimmed = s.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('“') && trimmed.endsWith('”'))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};
