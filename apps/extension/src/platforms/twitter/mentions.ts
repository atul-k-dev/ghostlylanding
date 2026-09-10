/**
 * Notifications/mentions scraping (Twitter/X, content-script side).
 *
 * The Mentions sub-tab renders exactly the same tweet cells the timeline does
 * (`article[data-testid="tweet"]`), which is why this reuses `readArticle`
 * rather than a second post-parser. What it adds is the CONTEXT a mention
 * needs that a feed post doesn't: is this a reply to one of your own posts, a
 * quote of one, or a cold mention — read the same way X's own UI shows it, as
 * text, not a guessed data-testid X has never shipped a stable one for.
 */
import { TWITTER_SELECTORS as S, MENTIONS_URL } from './selectors.js';
import { waitFor } from './dom.js';
import { readArticle, type PostMeta } from './autopilot.js';

export { MENTIONS_URL };

export interface RawMention extends PostMeta {
  /** Handles named in a "Replying to" line above the tweet, if X rendered one. */
  replyingToHandles: string[];
  /** Author of a tweet quoted inside this one, when there's a nested quote box. */
  quotedAuthorHandle: string | null;
  /**
   * The text of the post immediately above this one in the tab, when THAT post
   * belongs to the signed-in user and this one is a reply to them — the best
   * available proxy for "what you originally said" without a second page load.
   * Null whenever that adjacency doesn't hold; a mention still drafts fine
   * without it.
   */
  parentOwnText: string | null;
}

/**
 * "Replying to @a @b and others" — X renders this as a plain-text line above
 * the tweet body, with no stable data-testid across the versions this codebase
 * has already had to chase (see `selectors.ts`'s own header note). Matching on
 * the words themselves survives a class rename that a selector would not.
 */
const extractReplyingTo = (article: HTMLElement): string[] => {
  const lead = article.innerText.split('\n').slice(0, 4).join(' ');
  const m = lead.match(/Replying to((?:\s+@[A-Za-z0-9_]+)+)/i);
  if (!m?.[1]) return [];
  return Array.from(m[1].matchAll(/@[A-Za-z0-9_]+/g)).map((x) => x[0]);
};

/**
 * A quote-tweet embeds a second, smaller tweet cell inside the outer article —
 * so the outer article contains more than one status permalink. The quoted
 * one is whichever permalink does NOT point at the mention's own post id.
 */
const extractQuotedAuthor = (article: HTMLElement, ownPostId: string): string | null => {
  const links = Array.from(article.querySelectorAll<HTMLAnchorElement>(S.permalink));
  for (const link of links) {
    const href = link.getAttribute('href') ?? '';
    const m = href.match(/^\/([^/]+)\/status\/(\d+)/);
    if (m?.[1] && m[2] !== ownPostId) return m[1];
  }
  return null;
};

/**
 * Read up to `max` mentions off the CURRENT page (the caller has already
 * navigated to `MENTIONS_URL`). Order is whatever X renders — newest first, in
 * practice — and is preserved so the caller can still fall back to it if
 * nothing else distinguishes two candidates.
 */
export const scanMentions = async (max: number, ownHandle: string | null): Promise<RawMention[]> => {
  const found = await waitFor<HTMLElement>(S.postArticle, 10_000);
  if (!found) return [];

  const articles = Array.from(document.querySelectorAll<HTMLElement>(S.postArticle)).slice(0, max);
  const own = (ownHandle ?? '').replace(/^@/, '').toLowerCase();

  const metas = articles.map((article) => ({ article, meta: readArticle(article) }));
  const out: RawMention[] = [];

  for (let i = 0; i < metas.length; i++) {
    const { article, meta } = metas[i]!;
    if (!meta) continue;

    const replyingToHandles = extractReplyingTo(article);
    const isReplyToOwn = own !== '' && replyingToHandles.some((h) => h.replace(/^@/, '').toLowerCase() === own);

    let parentOwnText: string | null = null;
    if (isReplyToOwn) {
      const prev = metas[i - 1]?.meta;
      if (prev && prev.authorHandle?.toLowerCase() === own) {
        parentOwnText = prev.text;
      }
    }

    out.push({
      ...meta,
      replyingToHandles,
      quotedAuthorHandle: extractQuotedAuthor(article, meta.postId),
      parentOwnText,
    });
  }

  return out;
};
