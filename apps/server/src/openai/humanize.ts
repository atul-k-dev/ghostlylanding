/**
 * Post-processing that makes generated text read like a person typed it.
 *
 * Models reach for typographic punctuation a phone keyboard never produces —
 * curly quotes, em dashes, the ellipsis character — and they love wrapping a
 * phrase lifted from the original post in quotation marks ("the 'photograph the
 * problem' part is doing a lot of work here"). Both are instant AI tells, so we
 * strip them here as well as forbidding them in the prompt: the prompt handles
 * the phrasing, this handles the characters the model slips in anyway.
 */

/** Quote pairs a model wraps whole outputs in. */
const WRAPPING_PAIRS: readonly (readonly [string, string])[] = [
  ['"', '"'],
  ['“', '”'],
  ['‘', '’'],
  ['«', '»'],
];

/** Drop quote marks the model wrapped the ENTIRE output in (repeatedly, since
 *  it sometimes nests a curly pair inside a straight one). */
export const stripWrappingQuotes = (s: string): string => {
  let out = s.trim();
  for (;;) {
    const pair = WRAPPING_PAIRS.find(
      ([open, close]) => out.length > 1 && out.startsWith(open) && out.endsWith(close),
    );
    if (!pair) return out;
    out = out.slice(1, -1).trim();
  }
};

/** Tidy up whatever the substitutions below leave behind. */
const collapseWhitespace = (s: string): string =>
  s
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/[ \t]+([,.!?;:])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]+$/gm, '')
    .trim();

/**
 * Make a generated REPLY look hand-typed: no quotation marks at all (the
 * quote-the-post-back-at-them tic), straight apostrophes, no em/en dashes, no
 * ellipsis character.
 */
export const humanizeReply = (s: string): string =>
  collapseWhitespace(
    stripWrappingQuotes(s)
      // Quoting their own words back at them is the tell we most want gone.
      .replace(/["“”«»„]/g, '')
      // A keyboard produces a straight apostrophe, not a curly one.
      .replace(/[‘’‚]/g, "'")
      // Nobody types an em dash into the X composer.
      .replace(/\s*[—–]\s*/g, ' - ')
      .replace(/…/g, '...'),
  );
