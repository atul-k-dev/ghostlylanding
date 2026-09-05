/* eslint-disable no-console */
/**
 * Voice-injection smoke — checks the learned style guide actually reaches the
 * prompts, and that an untrained user's prompt is byte-for-byte unchanged.
 * No OpenAI call, no DB. Run with:
 *   pnpm --filter @casper/server voice-smoke
 */
import { buildCommentPrompt, buildPostPrompt } from '../src/openai/prompts.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

const VOICE = 'You write in lowercase, rarely end with a full stop, and favour short two-clause sentences.';

// --- replies ----------------------------------------------------------------
const plain = buildCommentPrompt({ platform: 'twitter', tone: 'witty', length: 1 }).system;
const trained = buildCommentPrompt({
  platform: 'twitter',
  tone: 'witty',
  length: 1,
  voice: VOICE,
}).system;

assert(!plain.includes('HOW THIS PERSON WRITES'), 'untrained reply prompt has no voice block');
assert(trained.includes('HOW THIS PERSON WRITES'), 'trained reply prompt gains the voice block');
assert(trained.includes(VOICE), 'the style guide itself is injected verbatim');
assert(trained.startsWith(plain), 'the voice block is APPENDED — base prompt is untouched');
assert(
  trained.includes('OVERRIDES'),
  'the voice block states it overrides the tone preset (not blends with it)',
);

// The length rule is the prompt's most important instruction; the voice block
// must not displace it.
assert(trained.includes('LENGTH'), 'length rule survives voice injection');

// --- empty / whitespace voice is treated as no voice -------------------------
for (const empty of [null, undefined, '', '   ', '\n\t ']) {
  const p = buildCommentPrompt({
    platform: 'twitter',
    tone: 'witty',
    length: 1,
    voice: empty,
  }).system;
  assert(p === plain, `voice=${JSON.stringify(empty)} produces the untrained prompt`);
}

// --- posts ------------------------------------------------------------------
const plainPost = buildPostPrompt('friendly', 280).system;
const trainedPost = buildPostPrompt('friendly', 280, VOICE).system;
assert(!plainPost.includes('HOW THIS PERSON WRITES'), 'untrained post prompt has no voice block');
assert(trainedPost.includes(VOICE), 'post prompt gets the style guide too');
assert(trainedPost.startsWith(plainPost), 'post voice block is appended, base untouched');
assert(
  buildPostPrompt('friendly', 280, '   ').system === plainPost,
  'blank voice leaves the post prompt alone',
);

// The character limit is a hard constraint; injection must not drop it.
assert(trainedPost.includes('280'), 'character limit survives voice injection');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 voice-smoke OK');
