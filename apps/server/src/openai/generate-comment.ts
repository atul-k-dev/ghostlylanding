import type { Platform, TonePreset, CommentLength } from '@casper/shared';
import { getOpenAI } from './client.js';
import { buildCommentPrompt, commentMaxTokens } from './prompts.js';

const MODEL = 'gpt-4o-mini';

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
    max_tokens: commentMaxTokens(length),
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
