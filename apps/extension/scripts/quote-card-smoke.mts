/* eslint-disable no-console */
/**
 * Quote-card smoke (updateplan 3.6).
 *
 * The layout half of the card is pure, and it produces an image that goes out
 * attached to a public post — so the things pinned here are the ones that would
 * make it look broken rather than merely plain: text running off the edge, a
 * URL that refuses to break, and markup in a post turning into markup in the
 * SVG.
 *
 * The rasteriser needs a canvas and is not covered here; it returns null rather
 * than throwing when it can't draw, which is the behaviour the caller relies on.
 *
 * Run with: pnpm --filter @casper/extension quote-card-smoke
 */
import {
  wrapText,
  layoutQuote,
  quoteCardSvg,
  escapeXml,
  CARD_WIDTH,
  CARD_HEIGHT,
  MAX_QUOTE_CHARS,
} from '../src/lib/quote-card.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};

// --- escaping: a post is untrusted text ------------------------------------
assert(escapeXml('a & b') === 'a &amp; b', 'ampersands are escaped');
assert(
  escapeXml('<script>alert(1)</script>').includes('&lt;script&gt;'),
  'markup in a post cannot become markup in the card',
);
assert(!quoteCardSvg({ text: '</text><rect/>' }).includes('</text><rect/>'), 'and not via the SVG either');

// --- wrapping --------------------------------------------------------------
const short = wrapText('hello world', 64);
assert(short.length === 1, 'a short line is one line');
assert(short[0] === 'hello world', 'and is not mangled');

const long = wrapText('word '.repeat(60).trim(), 64);
assert(long.length > 1, 'a long paragraph wraps');
assert(
  long.every((l) => l.length * 64 * 0.52 <= CARD_WIDTH - 192 + 1),
  'no wrapped line is wider than the content box',
);
assert(long.join(' ').split(/\s+/).length === 60, 'wrapping loses no words');

// A single unbreakable token — a URL, or a hashtag someone got carried away
// with — is hard-split. An ugly break beats text hanging off the card.
const urlish = 'https://example.com/' + 'a'.repeat(300);
const wrappedUrl = wrapText(urlish, 48);
assert(wrappedUrl.length > 1, 'an over-long token is split rather than allowed to overflow');
assert(
  wrappedUrl.every((l) => l.length * 48 * 0.52 <= CARD_WIDTH - 192 + 1),
  'and every piece of it fits',
);
assert(wrappedUrl.join('') === urlish, 'the split loses no characters');

// Paragraph breaks in the post survive as line breaks in the card.
const paras = wrapText('first\n\nsecond', 48);
assert(paras.includes('first') && paras.includes('second'), 'both paragraphs are present');
assert(paras.length >= 3, 'the blank line between them is kept');

// --- sizing ----------------------------------------------------------------
const big = layoutQuote('Ship it.');
const small = layoutQuote('word '.repeat(70));
assert(big.fontSize > small.fontSize, 'a short quote is set larger than a long one');
assert(!big.trimmed && !small.trimmed, 'neither of those needs trimming');
assert(
  small.lines.length * small.fontSize * 1.32 <= CARD_HEIGHT,
  'the text block fits inside the card',
);

// Past the cap, the text is cut at a word boundary and says so.
const huge = layoutQuote('lorem ipsum dolor sit amet '.repeat(80));
assert(
  huge.lines.join(' ').length <= MAX_QUOTE_CHARS + 8,
  'a very long post is capped rather than set at 4pt',
);
assert(
  huge.lines[huge.lines.length - 1]?.endsWith('…') || !huge.trimmed,
  'a trimmed card ends with an ellipsis, not mid-word',
);

// --- the document itself ---------------------------------------------------
const svg = quoteCardSvg({ text: 'Replies get you seen. Posts get you followed.', handle: 'me' });
assert(svg.startsWith('<svg'), 'it is an SVG document');
assert(svg.includes(`width="${CARD_WIDTH}"`) && svg.includes(`height="${CARD_HEIGHT}"`), 'at the card size');
assert(svg.includes('@me'), 'the handle is attributed, with one @');
assert(!quoteCardSvg({ text: 'x', handle: '@me' }).includes('@@me'), 'and never two');
assert(!quoteCardSvg({ text: 'x' }).includes('<text x="96" y="587"'), 'no attribution row without a handle');
assert(svg.includes('#f44d60'), 'the coral rule is there — this is a Ghostly card');
assert(!/<image|xlink:href/.test(svg), 'no embedded imagery: typography and data, never generated art');

// ---------------------------------------------------------------------------
if (fails.length) {
  console.log(`\n❌ ${fails.length} assertion(s) failed`);
  for (const f of fails) console.log('   -', f);
  process.exit(1);
}
console.log('\n🎉 quote-card-smoke OK');
