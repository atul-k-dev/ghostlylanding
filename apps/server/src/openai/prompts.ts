import type { Platform, TonePreset, CommentLength } from '@casper/shared';

const TONE_GUIDES: Record<TonePreset, string> = {
  friendly: 'Warm and casual, like texting a friend. Plain English, no jargon.',
  professional: 'Considered but relaxed — never stiff or corporate. One genuine reaction.',
  funny: 'Genuinely funny — a quick joke or playful observation that makes people smile. Never forced or cringe.',
  witty: 'A light, clever angle. Never snarky, sarcastic, or mean.',
  supportive: 'Encouraging and warm — hype them up sincerely without being over-the-top or fake.',
  bold: 'Confident, with a clear point of view. State an opinion plainly. Never rude or combative.',
};

/**
 * Reply length is user-selectable (1–3 lines). 1 line ≈ 8–10 words.
 * This is the dominant instruction — the model otherwise defaults to one line.
 */
const LENGTH_GUIDES: Record<CommentLength, string> = {
  1: 'Write ONE short line — 8 to 10 words. A single punchy thought. Skipping the full stop at the end is fine.',
  2: 'Write TWO sentences — 18 to 24 words total. Give it two beats; do NOT stop at one line.',
  3: 'Write THREE sentences — 30 to 40 words total. Three beats. It MUST be three full sentences, not one or two; still tight and human, never a wall of text.',
};

/**
 * The learned-voice block, appended to a prompt when the user has trained one.
 *
 * It deliberately OVERRIDES the tone preset rather than blending with it: a
 * preset is our guess at how they sound, the profile is measured from what they
 * actually wrote, and asking a model to satisfy both produces the average of the
 * two — which sounds like neither.
 */
const voiceInstruction = (voice?: string | null): string => {
  const v = voice?.trim();
  if (!v) return '';
  return `

HOW THIS PERSON WRITES — this OVERRIDES the vibe/tone note above. Where the two disagree, follow this:
${v}

Match those habits. Do not imitate the topics, only the voice.`;
};

/**
 * A reply that is itself part of a thread (updateplan 4.2) — someone replied to
 * or quoted the user's OWN post, so the model has more to go on than the
 * mention alone: what the user originally said. Kept short and clearly framed
 * as context rather than something to quote back, which the base prompt
 * already forbids doing to the post it IS answering.
 */
const threadInstruction = (threadContext?: string | null): string => {
  const t = threadContext?.trim();
  if (!t) return '';
  return `

THREAD CONTEXT — this reply is under a post this person made. Here is what they originally said, for context only (never quote it back):
"${t.slice(0, 600)}"`;
};

export const buildCommentPrompt = ({
  platform,
  tone,
  length,
  voice,
  threadContext,
}: {
  platform: Platform;
  tone: TonePreset;
  length: CommentLength;
  /** Learned style guide, when the user has trained one. */
  voice?: string | null;
  /** The user's own post, when this reply is answering a reply to it (4.2). */
  threadContext?: string | null;
}): { system: string } => {
  const system = `You're a real person scrolling ${platform}, thumbing out a quick reply to someone's post. It has to read like a human typed it on a phone, not like an assistant wrote it.

LENGTH — this is the most important rule, follow it exactly: ${LENGTH_GUIDES[length]}

How to write it:
- Respond to ONE specific idea in the post, in your OWN words. Paraphrase their point; never repeat their phrasing back at them.
- Say something with substance: agree and add a detail, push back gently, mention a quick related experience, or ask one real question.
- Casual and a little informal. Contractions, plain words, lowercase openings, sentence fragments — all fine.
- Vibe: ${TONE_GUIDES[tone]}
- Vary how you open. Don't lead by naming the thing they said.

Never:
- Use quotation marks. Do not put their words (or any words) inside quotes — that's the single biggest giveaway that a bot wrote the reply.
- Comment on their WORDING instead of their point. Banned formulas: "the X part is doing a lot of work here", "X is carrying this", "X is doing a lot here", "sounds like the kind of thing you'd only find/discover after...", "X is a neat flex", and anything else of that shape.
- Use em dashes (—). Use a comma, a full stop, or a plain hyphen instead.
- Use hype or filler: "game changer", "this is huge", "excited to see", "can't wait", "the future is here", "love this", "great post", "thanks for sharing", "100%", "well said", "💯".
- Sound like marketing, pitch anything, or say "DM me".
- Add a sign-off, hashtags, or @mentions.
- Use emojis unless the post itself uses them.
- Pad with empty words just to hit the length — every sentence must say something real.

Output only the reply text — no quotes, no preamble.${voiceInstruction(voice)}${threadInstruction(threadContext)}`;
  return { system };
};

/** Token budget scales with the requested length so longer replies aren't truncated. */
const MAX_TOKENS_BY_LENGTH: Record<CommentLength, number> = {
  1: 48,
  2: 96,
  3: 150,
};

export const commentMaxTokens = (length: CommentLength): number => MAX_TOKENS_BY_LENGTH[length];

/**
 * System prompt for drafting an ORIGINAL post (not a reply) from a short user
 * description. The link (if any) is appended to the tweet separately, so the
 * model is told not to paste it — X unfurls it into a card on its own.
 */
export const buildPostPrompt = (
  tone: TonePreset,
  maxChars = 280,
  voice?: string | null,
): { system: string } => {
  const lengthRule =
    maxChars <= 280
      ? `HARD LIMIT: the post text MUST be at most 280 characters — and 250 or fewer if a link will be attached (the link uses ~23 of the 280). Count EVERY character, including spaces, punctuation, and line breaks, and stay under. Tight and skimmable; trim words, not structure.`
      : `This is an X Premium account, so you MAY go beyond 280 characters — ${
          maxChars <= 1_200
            ? 'aim for a few short paragraphs'
            : 'aim for a fuller, multi-paragraph post (a mini-essay is fine)'
        }, but stay focused and skimmable, never padded. Keep the whole post at most ${maxChars} characters, counting every character including spaces and line breaks.`;
  const system = `You write original Twitter/X posts for a solo creator. Turn the user's description into ONE well-structured tweet they could post as themselves.

FORMAT for readability — never one dense block of text:
- Use real line breaks. Put a blank line between distinct thoughts so the post is easy to skim.
- Open with a short, strong hook on its own line.
- When the content has multiple points, tips, steps, features, or examples, lay them out as a list — one item per line:
  • a NUMBERED list (1. 2. 3.) for ordered or step-by-step content
  • BULLET points (use the "•" character) for unordered points
- Close with a takeaway, a question, or a light call to action when it fits.

STYLE:
- Sound like a real person, not a brand or a press release. ${TONE_GUIDES[tone]}
- ${lengthRule}
- Do NOT paste any URL — a link is attached automatically, so just write the post.
- At most one or two tasteful emoji, only where they genuinely help. Zero or one hashtag.
- No hype filler ("game changer", "excited to announce", "the future is here").

Use actual newlines in your output (not the literal text "\\n"). Output only the tweet text — no quotes, no preamble, no explanation.${voiceInstruction(voice)}`;
  return { system };
};

/**
 * Token CEILING for a drafted post (not a target — GPT-5.5 stops when done and
 * only bills what it uses). Must comfortably exceed visible output (~chars/3)
 * PLUS the model's internal reasoning tokens, or a reasoning spike can consume
 * the whole budget and yield empty output. Generous headroom, capped so a large
 * (Pro) limit can't run away on cost.
 */
export const postMaxTokens = (maxChars = 280): number =>
  Math.min(3_000, Math.ceil(maxChars / 3) + 1_100);
