import type OpenAI from 'openai';
import type { TonePreset } from '@casper/shared';
import { getOpenAI } from './client.js';
import { buildPostPrompt, postMaxTokens } from './prompts.js';

/**
 * X counts an attached link as 23 chars (t.co) and the publisher joins it with
 * "\n\n" (2 chars), so a link costs 25 characters of the limit regardless of URL.
 */
const LINK_CHAR_COST = 25;

/**
 * Guarantee the text fits within `budget` characters. Cuts at the last word or
 * line boundary so it never ends mid-word, and trims trailing space. Counts
 * every character (spaces, punctuation, newlines) via String length.
 */
const hardTrim = (s: string, budget: number): string => {
  if (s.length <= budget) return s;
  const slice = s.slice(0, budget);
  const lastBreak = Math.max(slice.lastIndexOf(' '), slice.lastIndexOf('\n'));
  const cut = lastBreak > budget * 0.6 ? slice.slice(0, lastBreak) : slice;
  return cut.trimEnd();
};

// GPT-5.5 — strongest writing/structure model on the account; post quality
// benefits most from it. NOTE (5.x API): `max_tokens` is rejected (use
// `max_completion_tokens`) and only the default temperature is allowed, so we
// send neither `temperature` here. It also spends some completion tokens on
// internal reasoning, which the token budget accounts for.
const MODEL = 'gpt-5.5';

interface GenerateArgs {
  tone: TonePreset;
  description: string;
  link?: string;
  /** Character limit for the post (280 for free X accounts, larger for Premium). */
  maxChars?: number;
}

/**
 * Draft an original tweet from a short description (used by the scheduled-posts
 * flow), via GPT-5.5. The link, if provided, is given as context but the model
 * is told not to paste it — the extension appends it to the tweet so X unfurls
 * it into a card.
 */
export const generatePostText = async ({
  tone,
  description,
  link,
  maxChars = 280,
}: GenerateArgs): Promise<string> => {
  const client = getOpenAI();
  // The link is appended at post time and counts toward the limit, so the
  // generated TEXT must fit the limit minus the link's cost.
  const textBudget = Math.max(50, maxChars - (link && link.trim() ? LINK_CHAR_COST : 0));
  const { system } = buildPostPrompt(tone, maxChars);
  const user = link
    ? `${description.slice(0, 2_000)}\n\n(For context only — a link about "${link.slice(0, 400)}" will be attached automatically; do not write the URL.)`
    : description.slice(0, 2_000);

  const complete = async (
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  ): Promise<string> => {
    const c = await client.chat.completions.create({
      model: MODEL,
      max_completion_tokens: postMaxTokens(maxChars),
      // Short posts don't need deep reasoning; 'low' keeps GPT-5.5 fast and cheap
      // and stops internal reasoning from starving the visible output.
      reasoning_effort: 'low',
      messages,
    });
    return stripQuotes(c.choices[0]?.message?.content?.trim() ?? '');
  };

  let text = await complete([
    { role: 'system', content: system },
    { role: 'user', content: user },
  ]);

  // The prompt asks the model to stay within the limit, but LLMs don't count
  // characters perfectly. If it overshot, ask once to shorten (best quality),
  // then hard-trim as a last resort — so a draft can NEVER exceed the limit.
  if (text.length > textBudget) {
    text = await complete([
      { role: 'system', content: system },
      { role: 'user', content: user },
      { role: 'assistant', content: text },
      {
        role: 'user',
        content: `That draft is ${text.length} characters — too long. Rewrite it to fit within ${textBudget} characters total, counting every character including spaces and line breaks. Keep the meaning and structure; just make it shorter. Output only the post.`,
      },
    ]);
  }
  if (text.length > textBudget) {
    text = hardTrim(text, textBudget);
  }
  return text;
};

const stripQuotes = (s: string): string => {
  const trimmed = s.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith('“') && trimmed.endsWith('”'))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
};
