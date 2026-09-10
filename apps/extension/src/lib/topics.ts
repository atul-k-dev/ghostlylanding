import type { ScannedProfile } from '../platforms/common/content-messages.js';

/**
 * What this account is about, and who is worth watching — read off the account
 * itself rather than asked for in a form.
 *
 * `CONTEXT.md` §4 promised "niche templates" (Designer / Founder / Coach) and
 * they were never built. This supersedes them, and is better: a template asks
 * someone to file themselves under a label a marketer wrote, while their own
 * last thirty posts and their own following list already say what they care
 * about, in their words.
 *
 * Deliberately NOT a model call. It runs on every setup, the input is the
 * user's own text, and a keyword count is inspectable, instant and free — a
 * model here would spend tokens to look confident about a list the user is
 * about to correct anyway.
 */

/**
 * Words that carry no topic. English-only and unapologetic about it: the
 * fallback for a non-English account is that its own hashtags and repeated
 * phrases still rank, since they are not in this list.
 */
const STOPWORDS = new Set([
  'the','a','an','and','or','but','if','then','than','so','because','as','of','at','by','for',
  'with','about','against','between','into','through','during','before','after','above','below',
  'to','from','up','down','in','out','on','off','over','under','again','further','once','here',
  'there','when','where','why','how','all','any','both','each','few','more','most','other','some',
  'such','no','nor','not','only','own','same','too','very','can','will','just','should','now',
  'i','me','my','myself','we','our','ours','you','your','yours','he','him','his','she','her',
  'it','its','they','them','their','what','which','who','whom','this','that','these','those',
  'am','is','are','was','were','be','been','being','have','has','had','having','do','does','did',
  'doing','would','could','shall','may','might','must','im','ive','id','dont','doesnt','didnt',
  'thats','youre','youve','theyre','were','isnt','arent','wont','cant','got','get','gets','like',
  'really','think','know','make','made','want','need','one','two','new','good','great','best',
  'people','things','thing','way','time','today','day','week','year','lot','bit','much','many',
  'going','still','even','back','right','left','see','saw','say','says','said','look','looks',
  'why','yes','okay','ok','hey','oh','ah','lol','haha','rt','via','amp','http','https','www','com',
]);

const MIN_WORD = 3;

/** Strip the things that are never topics: urls, @mentions, punctuation runs. */
const normalise = (text: string): string =>
  text
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/@[a-z0-9_]+/g, ' ')
    .replace(/[^\p{L}\p{N}#\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const isCandidate = (word: string): boolean =>
  word.length >= MIN_WORD && !STOPWORDS.has(word) && !/^\d+$/.test(word);

/**
 * The topics this account writes about, most distinctive first.
 *
 * Hashtags count triple: someone who types #buildinpublic has told us the
 * subject outright, where a repeated common noun might just be their idiom.
 * Two-word phrases outrank their own halves, so "indie hacker" wins over
 * "indie" — a keyword the engine will match on should be as specific as the
 * user actually is.
 */
export const extractTopics = (posts: readonly string[], max = 6): string[] => {
  /**
   * Two numbers per term, and they do different jobs. `posts` is how many
   * DIFFERENT posts it appeared in, and is the only thing that decides whether
   * a term is a pattern at all — weighting alone would let a single two-word
   * phrase, worth 2 points on its own, look like something said twice. `score`
   * only orders the terms that already qualify.
   */
  const stats = new Map<string, { posts: number; score: number }>();
  const bump = (term: string, by: number) => {
    const at = stats.get(term) ?? { posts: 0, score: 0 };
    stats.set(term, { posts: at.posts + 1, score: at.score + by });
  };

  for (const post of posts) {
    const text = normalise(post);
    if (!text) continue;
    const words = text.split(' ');
    const seenInPost = new Set<string>();

    words.forEach((raw, i) => {
      if (raw.startsWith('#')) {
        const tag = raw.slice(1);
        if (isCandidate(tag) && !seenInPost.has(tag)) {
          seenInPost.add(tag);
          bump(tag, 3);
        }
        return;
      }
      if (!isCandidate(raw)) return;
      // Once per post: a word repeated six times in one rant is one topic, not six.
      if (!seenInPost.has(raw)) {
        seenInPost.add(raw);
        bump(raw, 1);
      }
      const next = words[i + 1];
      if (next && isCandidate(next) && !next.startsWith('#')) {
        const phrase = `${raw} ${next}`;
        if (!seenInPost.has(phrase)) {
          seenInPost.add(phrase);
          bump(phrase, 2);
        }
      }
    });
  }

  const ranked = [...stats.entries()]
    // Said once is not a pattern. Two different posts is the floor for
    // proposing a keyword the engine will then match on for weeks.
    .filter(([, v]) => v.posts >= 2)
    .sort(
      (a, b) =>
        b[1].score - a[1].score ||
        // On a tie the LONGER term wins, so "design system" outranks "design"
        // and then suppresses it below. Without this the vaguer word wins on
        // the alphabetical tie-break and takes the specific one down with it.
        b[0].split(' ').length - a[0].split(' ').length ||
        a[0].localeCompare(b[0]),
    )
    .map(([term]) => term);

  // A phrase already covers its own halves; keeping both would make the engine
  // match the vague one and never notice the specific one.
  const kept: string[] = [];
  for (const term of ranked) {
    if (kept.length >= max) break;
    const covered = kept.some(
      (k) => k === term || k.split(' ').includes(term) || term.split(' ').includes(k),
    );
    if (!covered) kept.push(term);
  }
  return kept;
};

export interface ProposedTarget {
  handle: string;
  name: string;
  /** Filled in later by a profile read; null when it could not be read. */
  followers: number | null;
  /** One line, in the user's terms, saying why this account is on the list. */
  reason: string;
}

/**
 * Rank the accounts this user already follows, best first.
 *
 * Every candidate is someone they chose to follow, so the ranking is only about
 * which of those to work first: the ones whose bio matches what the user
 * themselves writes about. Accounts with no bio sink but are not dropped — a
 * missing bio is missing evidence, not evidence of a bad target.
 */
export const rankTargets = (
  following: readonly ScannedProfile[],
  topics: readonly string[],
  max = 10,
): ProposedTarget[] => {
  const scored = following.map((p) => {
    const bio = normalise(p.bio);
    const hits = topics.filter((t) => bio.includes(t));
    return { profile: p, hits, score: hits.length * 2 + (bio ? 1 : 0) };
  });

  return scored
    .sort((a, b) => b.score - a.score || a.profile.handle.localeCompare(b.profile.handle))
    .slice(0, max)
    .map(({ profile, hits }) => ({
      handle: profile.handle,
      name: profile.name,
      followers: null,
      reason: hits.length
        ? `You follow them, and they post about ${hits.slice(0, 2).join(' and ')}`
        : 'You follow them already',
    }));
};
