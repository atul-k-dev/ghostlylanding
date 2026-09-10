/**
 * Quote cards (updateplan 3.6).
 *
 * A post's own words, set properly, as an image. Typography and data — **not**
 * a generated illustration. That is the whole design constraint, and it is not
 * an aesthetic preference: glossy AI art reads as "bot" on X and would undo
 * everything `humanize.ts` does to the text underneath it.
 *
 * The layout half is PURE (a string in, an SVG string out) so the wrapping and
 * sizing rules can be tested in node. The rasterising half needs a DOM and is
 * kept separate, at the bottom, behind one function.
 */

/** X renders link previews at 2:1; a card at 1200×675 (16:9) sits well in the
 *  timeline without being cropped. */
export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 675;

const PADDING = 96;
const CONTENT_WIDTH = CARD_WIDTH - PADDING * 2;

/**
 * Rough advance width per character at 1px font size, for the stack below.
 * Measuring properly needs a canvas; this is deliberately a slight
 * over-estimate, so a line breaks early rather than running off the card.
 */
const CHAR_WIDTH_RATIO = 0.52;

/** Type scale, largest first. The first size whose text fits is the one used —
 *  a short line deserves to be big, and a long one has to be readable. */
const FONT_STEPS = [64, 56, 48, 42, 36, 32, 28] as const;

const LINE_HEIGHT = 1.32;

/** Longest post we will set. Past this a card is a wall, not a quote. */
export const MAX_QUOTE_CHARS = 400;

/** `&`, `<`, `>` and quotes, so a post containing markup can't produce markup. */
export const escapeXml = (s: string): string =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Greedy word wrap at a given font size. Words longer than a whole line (a URL,
 * a hashtag someone got carried away with) are hard-split rather than allowed
 * to overflow — a card with text hanging off the edge looks broken, which is
 * worse than an ugly break.
 */
export const wrapText = (text: string, fontSize: number, maxWidth = CONTENT_WIDTH): string[] => {
  const perChar = fontSize * CHAR_WIDTH_RATIO;
  const maxChars = Math.max(8, Math.floor(maxWidth / perChar));
  const lines: string[] = [];

  for (const paragraph of text.split('\n')) {
    if (paragraph.trim() === '') {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      let w = word;
      // A single word longer than the line: chop it into line-sized pieces.
      while (w.length > maxChars) {
        if (line) {
          lines.push(line);
          line = '';
        }
        lines.push(w.slice(0, maxChars));
        w = w.slice(maxChars);
      }
      const candidate = line ? `${line} ${w}` : w;
      if (candidate.length <= maxChars) {
        line = candidate;
      } else {
        if (line) lines.push(line);
        line = w;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
};

export interface QuoteCardLayout {
  fontSize: number;
  lines: string[];
  /** True when the text had to be trimmed to fit even at the smallest size. */
  trimmed: boolean;
}

/**
 * Pick the largest size the text fits at, and wrap it there.
 *
 * If even the smallest step overflows the card, the text is cut at a word
 * boundary with an ellipsis: a card is a quote, not the whole post, and half a
 * sentence sliding under the bottom edge is the one outcome nobody wants.
 */
export const layoutQuote = (text: string): QuoteCardLayout => {
  const clean = text.trim().slice(0, MAX_QUOTE_CHARS);
  const usableHeight = CARD_HEIGHT - PADDING * 2 - 64; // 64 = the attribution row
  let last: QuoteCardLayout = { fontSize: FONT_STEPS[FONT_STEPS.length - 1] ?? 28, lines: [], trimmed: false };

  for (const fontSize of FONT_STEPS) {
    const lines = wrapText(clean, fontSize);
    const height = lines.length * fontSize * LINE_HEIGHT;
    last = { fontSize, lines, trimmed: false };
    if (height <= usableHeight) return last;
  }

  // Smallest size and still too tall: keep as many lines as fit and mark it.
  const { fontSize, lines } = last;
  const maxLines = Math.max(1, Math.floor(usableHeight / (fontSize * LINE_HEIGHT)));
  const kept = lines.slice(0, maxLines);
  const lastLine = kept[kept.length - 1];
  if (lastLine !== undefined) kept[kept.length - 1] = `${lastLine.replace(/[,.;:]$/, '')}…`;
  return { fontSize, lines: kept, trimmed: true };
};

export interface QuoteCardOptions {
  text: string;
  /** Shown bottom-left, with an @ if it doesn't already have one. */
  handle?: string | null;
}

/**
 * The card, as an SVG document.
 *
 * Ghostly's own dark ground and coral rule (`docs`/§3 tokens), hard-coded here
 * rather than read from CSS variables: this string is rasterised outside the
 * page, where no stylesheet of ours exists.
 */
export const quoteCardSvg = ({ text, handle }: QuoteCardOptions): string => {
  const { fontSize, lines } = layoutQuote(text);
  const lineHeight = fontSize * LINE_HEIGHT;
  const blockHeight = lines.length * lineHeight;
  // Optically centred: the attribution row sits below, so the text block is
  // centred in the space above it rather than in the whole card.
  const top = (CARD_HEIGHT - 64 - blockHeight) / 2 + fontSize * 0.8;

  const body = lines
    .map(
      (line, i) =>
        `<text x="${PADDING}" y="${(top + i * lineHeight).toFixed(1)}" fill="#f4f4f5" ` +
        `font-size="${fontSize}" font-weight="600">${escapeXml(line)}</text>`,
    )
    .join('\n    ');

  const who = handle ? `@${handle.replace(/^@/, '')}` : '';
  const attribution = who
    ? `<text x="${PADDING}" y="${CARD_HEIGHT - PADDING + 8}" fill="#a1a1aa" font-size="26">${escapeXml(
        who,
      )}</text>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="#0e0e0e"/>
  <rect x="0" y="0" width="8" height="${CARD_HEIGHT}" fill="#f44d60"/>
  <g font-family="Georgia, 'Times New Roman', serif">
    ${body}
    ${attribution}
  </g>
</svg>`;
};

/**
 * Rasterise a card to a PNG data URL.
 *
 * Browser-only — it needs an Image and a canvas — and returns null rather than
 * throwing if either is unavailable, because a quote card is a nicety and the
 * post it decorates is not. The SVG is passed as a data URL, so nothing is
 * fetched and the canvas never becomes tainted.
 */
export const renderQuoteCardPng = async (options: QuoteCardOptions): Promise<string | null> => {
  if (typeof document === 'undefined' || typeof Image === 'undefined') return null;
  const svg = quoteCardSvg(options);
  const source = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  const image = await new Promise<HTMLImageElement | null>((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = source;
  });
  if (!image) return null;

  const canvas = document.createElement('canvas');
  canvas.width = CARD_WIDTH;
  canvas.height = CARD_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(image, 0, 0, CARD_WIDTH, CARD_HEIGHT);
  try {
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
};
