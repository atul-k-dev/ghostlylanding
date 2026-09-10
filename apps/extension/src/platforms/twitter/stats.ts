/**
 * Growth scoreboard scraping (Twitter/X, content-script side).
 *
 * Two reads, both off pages the user can already see:
 *   - readProfileStats()      on x.com/<handle>              → follower counters
 *   - collectOwnPostOutcomes() on x.com/<handle>/with_replies → per-post results
 *
 * Nothing here clicks, follows, or posts — it only looks. That keeps the daily
 * growth scan outside the action caps entirely (it costs the user no quota).
 */
import { TWITTER_SELECTORS as S } from './selectors.js';
import { waitFor, smoothScrollBy, wait } from './dom.js';

export interface ProfileStats {
  followers: number;
  following: number;
  posts: number | null;
  /**
   * The profile's bio, when it has one. Added for setup (1.4), which reads the
   * signed-in account to propose topics, and reads candidate targets to explain
   * why each one is worth watching. Optional so the growth scrape, which has
   * never needed it, is unaffected.
   */
  bio?: string | null;
}

export interface ScrapedOutcome {
  tweetId: string;
  url: string;
  text: string;
  isReply: boolean;
  likes: number;
  replies: number;
  reposts: number;
  views: number | null;
  publishedAt: string | null;
}

/**
 * Parse a count the way X writes it: "1,234", "12.5K", "1.2M", "3 456" (some
 * locales space-separate). Returns null when there's no number to read.
 */
export const parseCount = (raw: string | null | undefined): number | null => {
  if (!raw) return null;
  const m = raw
    .replace(/ /g, ' ')
    .match(/([\d][\d.,\s]*)\s*([KMB])?/i);
  if (!m?.[1]) return null;
  const suffix = m[2]?.toUpperCase();
  // With a K/M/B suffix the separator is a DECIMAL point ("12.5K"); without one
  // it's a thousands separator ("12,500" / "12 500"), so strip it entirely.
  const digits = suffix
    ? m[1].replace(/[,\s]/g, '')
    : m[1].replace(/[.,\s]/g, '');
  const n = Number.parseFloat(digits);
  if (Number.isNaN(n)) return null;
  const factor = suffix === 'K' ? 1_000 : suffix === 'M' ? 1_000_000 : suffix === 'B' ? 1_000_000_000 : 1;
  return Math.round(n * factor);
};

/**
 * Read a counter from the profile header links. X renders these as
 * `<a href="/handle/followers">1,234 Followers</a>` — the exact figure sits in a
 * `title` attribute on rounded counts ("12.5K" ⇢ title="12543"), so prefer that.
 *
 * Takes the LARGEST match across the given selectors on purpose. Premium
 * accounts point their Followers link at /verified_followers, everyone else at
 * /followers — and when a page happens to render both, total followers is by
 * definition the bigger of the two, never the verified subset.
 */
const readCounterLink = (selectors: string[]): number | null => {
  let best: number | null = null;
  for (const selector of selectors) {
    for (const link of Array.from(document.querySelectorAll<HTMLAnchorElement>(selector))) {
      const titled = link.querySelector<HTMLElement>('[title]')?.getAttribute('title');
      const value = parseCount(titled) ?? parseCount(link.textContent);
      if (value !== null && (best === null || value > best)) best = value;
    }
  }
  return best;
};

/**
 * Follower/following/post counters from the user's own profile page. Returns
 * null when the header never rendered (not signed in, or X changed the DOM) —
 * the caller reports that as a selector miss rather than writing a bogus point.
 */
export const readProfileStats = async (): Promise<ProfileStats | null> => {
  // The counter links are part of the header, which renders before the timeline.
  const ready = await waitFor(`${S.followersLink}, ${S.followingLink}`, 15_000);
  if (!ready) return null;
  // Give the virtualised header a beat to swap placeholders for real numbers.
  await wait(800);

  const followers = readCounterLink([S.followersLink, S.verifiedFollowersLink]);
  const following = readCounterLink([S.followingLink]);
  if (followers === null || following === null) return null;

  // "1,234 posts" lives in the nav header above the profile, not in a link.
  const header = document.querySelector<HTMLElement>(S.primaryColumn);
  const postsMatch = (header?.textContent ?? '').match(/([\d][\d.,\s]*[KMB]?)\s*posts?\b/i);
  const posts = postsMatch ? parseCount(postsMatch[1]) : null;

  const bio =
    document.querySelector<HTMLElement>(`${S.primaryColumn} ${S.userDescription}`)?.innerText.trim() ??
    null;

  return { followers, following, posts, bio: bio || null };
};

/** The status id + author handle encoded in a permalink href. */
const parsePermalink = (href: string): { handle: string; id: string } | null => {
  const m = href.match(/^\/([^/]+)\/status\/(\d+)/);
  if (!m?.[1] || !m[2]) return null;
  return { handle: m[1], id: m[2] };
};

/**
 * Engagement counts for one post.
 *
 * X puts the whole summary in the action row's aria-label — "4 replies, 2
 * reposts, 27 likes, 1 bookmark, 1234 views" — as plain integers, which is far
 * more reliable than reading the abbreviated ("1.2K") text in the buttons. We
 * fall back to per-button labels when the row label is missing, and to 0 when
 * X renders no number at all (which is what it does for a zero count).
 */
const readEngagement = (
  article: HTMLElement,
): { likes: number; replies: number; reposts: number; views: number | null } => {
  const row = article.querySelector<HTMLElement>(`${S.actionBarRow}[aria-label]`);
  const label = row?.getAttribute('aria-label') ?? '';
  const fromLabel = (word: string): number | null => {
    const m = label.match(new RegExp(`([\\d][\\d.,]*[KMB]?)\\s+${word}`, 'i'));
    return m ? parseCount(m[1]) : null;
  };
  const fromButton = (testid: string): number | null => {
    const btn = article.querySelector<HTMLElement>(`[data-testid="${testid}"]`);
    return parseCount(btn?.getAttribute('aria-label') ?? btn?.textContent);
  };

  return {
    likes: fromLabel('likes?') ?? fromButton('like') ?? fromButton('unlike') ?? 0,
    replies: fromLabel('repl(?:y|ies)') ?? fromButton('reply') ?? 0,
    reposts: fromLabel('reposts?') ?? fromButton('retweet') ?? fromButton('unretweet') ?? 0,
    views: fromLabel('views?'),
  };
};

/**
 * Structural reply detection (updateplan 6.8 — D10).
 *
 * X renders a "Replying to @someone" context line between the author's
 * User-Name block and the tweet body — but only the WORDS are translated for
 * a non-English UI, never the link underneath them. Verified live against
 * x.com: that line is one or more `role="link"` anchors whose `href` is a
 * bare handle (`/handle`, never `/handle/status/…`), sitting strictly between
 * `S.userCell`'s User-Name element and `S.postText` in document order — and
 * on six confirmed standalone (non-reply) posts, zero such anchors appear in
 * that span. Handles are ASCII on every X UI regardless of language, so the
 * href shape itself never varies.
 */
const BARE_HANDLE_HREF = /^\/[A-Za-z0-9_]{1,20}\/?$/;

const looksLikeReplyStructural = (article: HTMLElement): boolean => {
  const userName = article.querySelector<HTMLElement>('[data-testid="User-Name"]');
  const tweetText = article.querySelector<HTMLElement>(S.postText);
  if (!userName) return false;
  const anchors = Array.from(article.querySelectorAll<HTMLAnchorElement>('a[role="link"][href]'));
  return anchors.some((a) => {
    if (userName.contains(a)) return false;
    const afterUserName = Boolean(
      userName.compareDocumentPosition(a) & Node.DOCUMENT_POSITION_FOLLOWING,
    );
    const beforeTweetText = tweetText
      ? Boolean(a.compareDocumentPosition(tweetText) & Node.DOCUMENT_POSITION_FOLLOWING)
      : true;
    return afterUserName && beforeTweetText && BARE_HANDLE_HREF.test(a.getAttribute('href') ?? '');
  });
};

/**
 * True when this article is a reply rather than a standalone post.
 *
 * Structural detection first (works on any UI language); the old English text
 * match stays as a fallback for the one confirmed gap — a reply whose body is
 * ALSO a quote-tweet, where the quoted card's own nested anchors can shadow
 * the outer reply-context line. Only widens coverage: it can never turn a
 * structural true positive into a false negative, and it never fired on any
 * of six confirmed standalone posts in the same live check.
 */
export const looksLikeReply = (article: HTMLElement): boolean => {
  if (looksLikeReplyStructural(article)) return true;
  const candidates = Array.from(article.querySelectorAll<HTMLElement>('div[dir], span')).slice(0, 40);
  return candidates.some((el) => /^replying to\b/i.test((el.textContent ?? '').trim()));
};

/**
 * Scroll the user's own "Posts & replies" timeline and read how each of their
 * recent posts performed.
 *
 * Only articles whose permalink belongs to `ownHandle` are kept — the
 * with_replies timeline also renders the parent posts your replies hang off,
 * and those are somebody else's numbers.
 */
export const collectOwnPostOutcomes = async (
  ownHandle: string,
  max = 40,
): Promise<ScrapedOutcome[]> => {
  const mine = ownHandle.replace(/^@/, '').toLowerCase();
  if (!(await waitFor(S.postArticle, 15_000))) return [];

  const collected = new Map<string, ScrapedOutcome>();

  const sweep = (): void => {
    for (const article of Array.from(document.querySelectorAll<HTMLElement>(S.postArticle))) {
      const time = article.querySelector<HTMLTimeElement>(S.timestamp);
      const link =
        time?.closest<HTMLAnchorElement>(S.permalink) ??
        article.querySelector<HTMLAnchorElement>(S.permalink);
      const parsed = parsePermalink(link?.getAttribute('href') ?? '');
      if (!parsed || parsed.handle.toLowerCase() !== mine) continue;
      if (collected.has(parsed.id)) continue;

      const engagement = readEngagement(article);
      collected.set(parsed.id, {
        tweetId: parsed.id,
        url: `https://x.com/${parsed.handle}/status/${parsed.id}`,
        text: (article.querySelector<HTMLElement>(S.postText)?.textContent ?? '').trim().slice(0, 500),
        isReply: looksLikeReply(article),
        publishedAt: time?.getAttribute('datetime') ?? null,
        ...engagement,
      });
    }
  };

  // Scroll in the same unhurried way the autopilot does — this tab looks like
  // someone scrolling their own profile, because that's all it is.
  for (let i = 0; i < 12 && collected.size < max; i++) {
    sweep();
    await smoothScrollBy(900);
    await wait(700);
  }
  sweep();

  // Newest first (that's the order they rendered in), capped.
  return Array.from(collected.values()).slice(0, max);
};
