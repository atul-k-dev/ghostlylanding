import type { Platform, TonePreset, CommentLength } from '@casper/shared';
import { getOpenAI } from './client.js';
import { buildCommentPrompt, commentMaxTokens } from './prompts.js';
import { humanizeReply } from './humanize.js';

// GPT-5.4-mini — fast + cheap, a big step up from gpt-4o-mini for short replies.
// (5.x API: `max_tokens` is rejected — use `max_completion_tokens`. This mini
// model does support a custom temperature, unlike gpt-5.5.)
const MODEL = 'gpt-5.4-mini';

interface GenerateArgs {
  platform: Platform;
  tone: TonePreset;
  length: CommentLength;
  postText: string;
  /** The user's learned style guide, when they've trained one. */
  voice?: string | null;
  /** The user's own post, for a reply-in-a-thread draft (updateplan 4.2). */
  threadContext?: string | null;
}

export const generateCommentDraft = async ({
  platform,
  tone,
  length,
  postText,
  voice,
  threadContext,
}: GenerateArgs): Promise<string> => {
  const client = getOpenAI();
  const { system } = buildCommentPrompt({ platform, tone, length, voice, threadContext });
  const completion = await client.chat.completions.create({
    model: MODEL,
    // High enough that replies don't collapse into the same few constructions
    // post after post — repetition is what makes a feed of replies read as bot.
    temperature: 0.9,
    max_completion_tokens: commentMaxTokens(length),
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: postText.slice(0, 4_000) },
    ],
  });
  const text = completion.choices[0]?.message?.content?.trim() ?? '';
  // Strip the punctuation tells (quote marks, curly apostrophes, em dashes)
  // the model slips in even when the prompt forbids them.
  return humanizeReply(text);
};

