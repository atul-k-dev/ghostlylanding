/**
 * Distil a user's own posts into a short style guide.
 *
 * Runs ONCE per training request, not per reply — so it can afford the strongest
 * model. The sampled posts are held in memory for this call only; nothing but
 * the resulting guide is returned to the caller (and therefore stored).
 */
import { VOICE_LIMITS } from '@casper/shared';
import { getOpenAI } from './client.js';

// GPT-5.5 — this is a one-off analysis where quality compounds across every
// future reply, so it's the one place worth the strongest model. JSON mode keeps
// the output parseable. (5.x API: `max_tokens` is rejected; only the default
// temperature is allowed.)
const MODEL = 'gpt-5.5';

const SYSTEM = `You analyse how one person writes on Twitter/X and produce a style guide another writer could follow to sound exactly like them.

You will be given a numbered sample of their posts. Work out what is CONSISTENT about the writing, not what any single post happens to be about. Pay attention to:
- Sentence length and rhythm. Do they write fragments? Long run-ons? One line?
- Capitalisation habits — do they start sentences lowercase? ALL CAPS for emphasis?
- Punctuation: do they use full stops at the end? Ellipses? Exclamation marks? Dashes?
- Contractions, slang, filler words, and any phrases they reach for repeatedly.
- Emoji: never, rarely, or often — and which ones.
- Their stance: blunt, hedging, self-deprecating, enthusiastic, dry, analytical.
- How they open a thought, and how they close one.

Ignore: the topics themselves, links, @mentions, and hashtags. You are describing the VOICE, not the subject matter.

Return JSON of exactly this shape:
{"summary": "<the style guide, written as direct instructions to the writer, second person ('You write...'), 120 words maximum>"}

Be concrete and specific. "Writes in lowercase, rarely ends with a full stop, favours short two-clause sentences joined by a comma" is useful. "Casual and engaging" is useless — never write anything that vague.`;

/**
 * Returns the style-guide text, or null when the model gave us nothing usable.
 * Never throws for a bad response shape — the caller turns null into a 502.
 */
export const trainVoiceProfile = async (posts: string[]): Promise<string | null> => {
  const client = getOpenAI();
  const numbered = posts
    .slice(0, VOICE_LIMITS.maxSamples)
    .map((p, i) => `${i + 1}. ${p.slice(0, VOICE_LIMITS.maxPostChars)}`)
    .join('\n\n');

  const completion = await client.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 1_600,
    reasoning_effort: 'low',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: `Here are ${posts.length} of their posts:\n\n${numbered}` },
    ],
  });

  const raw = completion.choices[0]?.message?.content?.trim();
  if (!raw) return null;

  let summary: unknown;
  try {
    summary = (JSON.parse(raw) as { summary?: unknown }).summary;
  } catch {
    return null;
  }
  if (typeof summary !== 'string') return null;

  const trimmed = summary.trim().slice(0, VOICE_LIMITS.maxSummaryChars);
  // A one-word "guide" would poison every prompt it's injected into.
  return trimmed.length >= 40 ? trimmed : null;
};
