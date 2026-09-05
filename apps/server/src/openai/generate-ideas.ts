/**
 * Draft several post ideas at once.
 *
 * This is where the three features meet: the user's trained VOICE decides how it
 * reads, their TOPICS decide what it's about, and their best-performing past
 * posts — measured by the growth scan — show the model what actually landed with
 * their audience. Without that last part it's just a topic generator.
 */
import type { TonePreset } from '@casper/shared';
import { getOpenAI } from './client.js';
import { buildPostPrompt } from './prompts.js';
import { stripWrappingQuotes } from './humanize.js';

// GPT-5.5 for the same reason drafting a single post uses it: this is writing
// the user will publish under their own name.
const MODEL = 'gpt-5.5';

export interface IdeaArgs {
  tone: TonePreset;
  topics: string[];
  /** The user's own posts that performed best, newest-first-ish. */
  winners: { text: string; likes: number }[];
  count: number;
  maxChars: number;
  voice?: string | null;
}

/**
 * Token ceiling for the whole batch. Generous: GPT-5.5 spends some of its
 * completion budget on internal reasoning, and starving it yields empty output.
 */
const budgetFor = (count: number, maxChars: number): number =>
  Math.min(8_000, count * Math.ceil(maxChars / 3) + 1_500);

export const generatePostIdeas = async ({
  tone,
  topics,
  winners,
  count,
  maxChars,
  voice,
}: IdeaArgs): Promise<string[]> => {
  const client = getOpenAI();
  // Reuse the single-post rules verbatim so an idea and a hand-drafted post obey
  // the same format, length and style constraints — including the voice block.
  const { system } = buildPostPrompt(tone, maxChars, voice);

  const winnerBlock =
    winners.length > 0
      ? `\n\nPosts of theirs that did BEST with their audience — match what makes these work (the angle and shape, never the wording):\n${winners
          .map((w, i) => `${i + 1}. (${w.likes} likes) ${w.text.slice(0, 400)}`)
          .join('\n\n')}`
      : '';

  const topicBlock =
    topics.length > 0
      ? `They post about: ${topics.join(', ')}.`
      : 'They have not named their topics, so draw on the subjects of their best posts below.';

  const completion = await client.chat.completions.create({
    model: MODEL,
    max_completion_tokens: budgetFor(count, maxChars),
    reasoning_effort: 'low',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `${system}

You are drafting SEVERAL posts at once. Return JSON: {"posts": ["<post 1>", "<post 2>", ...]}.
Every post must stand alone and be about something DIFFERENT — different angle, different opening, different shape. Do not write variations of one idea.`,
      },
      {
        role: 'user',
        content: `Write ${count} post ideas. ${topicBlock}${winnerBlock}`,
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) return [];

  let posts: unknown;
  try {
    posts = (JSON.parse(raw) as { posts?: unknown }).posts;
  } catch {
    return [];
  }
  if (!Array.isArray(posts)) return [];

  return posts
    .filter((p): p is string => typeof p === 'string')
    .map((p) => stripWrappingQuotes(p.trim()))
    .filter((p) => p.length >= 10)
    // The prompt states the limit, but models don't count characters reliably
    // and a post over the limit simply can't be published.
    .filter((p) => p.length <= maxChars)
    .slice(0, count);
};
