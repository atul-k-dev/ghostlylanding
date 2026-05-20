import type { Platform, TonePreset } from '@casper/shared';

const TONE_GUIDES: Record<TonePreset, string> = {
  friendly: 'Warm, conversational, like talking to a peer. Plain English, no jargon.',
  professional:
    'Thoughtful and considered, but never stiff or corporate. One genuine observation.',
  witty: 'Light wordplay or an observational angle. Never snarky, sarcastic, or mean.',
};

const LENGTH_GUIDES: Record<Platform, string> = {
  twitter: '1 short sentence. Maximum 200 characters total. No emojis unless the post uses them.',
  linkedin:
    '1 to 2 sentences. Maximum 400 characters total. No emojis unless the post uses them.',
};

export const buildCommentPrompt = ({
  platform,
  tone,
}: {
  platform: Platform;
  tone: TonePreset;
}): { system: string } => {
  const system = `You help a ${platform} user write a single reply to someone else's post.

The reply must:
- Reference something specific from the post (a phrase, idea, or example)
- Sound human and unforced — never AI-template-y
- Avoid generic openers: "great post", "thanks for sharing", "love this", "100%", "💯"
- Avoid pitches, self-promotion, or asking to DM
- Avoid questions unless they're naturally curious follow-ups
- Use the user's tone: ${TONE_GUIDES[tone]}
- ${LENGTH_GUIDES[platform]}

Reply with only the comment text. No quotes, no preamble, no sign-off.`;
  return { system };
};

export const COMMENT_MAX_TOKENS: Record<Platform, number> = {
  twitter: 80,
  linkedin: 160,
};
