/**
 * Spotlight (updateplan 2.3) — point at the work.
 *
 * The engine has always done its work in a real tab, in front of the user, and
 * been completely invisible while doing it: a post gets liked somewhere down the
 * timeline and nothing says which one or why. Spotlight outlines the post the
 * engine is about to act on, on the real page, and names it in the panel.
 *
 * Two halves, deliberately: the OUTLINE is drawn on X's own article element (the
 * one thing that cannot live inside our shadow root), and the LABEL is published
 * to a tiny subscribable store the floating panel reads. Both are driven from
 * `autopilot.ts`, which is the only code that knows what it is about to do.
 *
 * Rules this module exists to keep:
 *   · never leave a stray outline — not on completion, not on navigation, not
 *     when the element is virtualised out from under us
 *   · never outline a post nobody can see (the `isInViewport` predicate)
 *   · no pulse when the user asked for no motion
 */
import { getSettings, STORAGE_KEYS } from '../lib/storage.js';
import { isInViewport } from './state.js';

/** What the engine is doing to the post it is pointing at. */
export type SpotlightAction = 'like' | 'reply' | 'follow' | 'bookmark' | 'repost' | 'quote';

export interface SpotlightTarget {
  action: SpotlightAction;
  authorHandle: string | null;
  postUrl: string;
  /** Trimmed post text, so the panel can say WHICH post, not just "a post". */
  text: string;
}

/**
 * The line the panel shows. The plan fixes the reply wording; the rest follow
 * it exactly rather than inventing a second voice for the same moment.
 */
export const SPOTLIGHT_LABEL: Record<SpotlightAction, string> = {
  reply: 'Ghostly is replying to this',
  like: 'Ghostly is liking this',
  follow: 'Ghostly is following them',
  bookmark: 'Ghostly is bookmarking this',
  repost: 'Ghostly is reposting this',
  quote: 'Ghostly is quoting this',
};

/* -- the store -------------------------------------------------------------- */

type Listener = (target: SpotlightTarget | null) => void;

const listeners = new Set<Listener>();
let current: SpotlightTarget | null = null;

export const getSpotlight = (): SpotlightTarget | null => current;

export const subscribeSpotlight = (fn: Listener): (() => void) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

const publish = (target: SpotlightTarget | null): void => {
  current = target;
  for (const fn of listeners) fn(target);
};

/* -- the outline ------------------------------------------------------------ */

const STYLE_ID = 'ghostly247-spotlight-style';
const MARK_CLASS = 'ghostly247-spotlight';

/**
 * The one stylesheet we put on X's own page, and the reason the shadow root
 * can't do it: the element being outlined belongs to X.
 *
 * `!important` on the outline only — X's resets clear outlines on focus, and an
 * outline that silently loses to a reset is a feature that silently does
 * nothing. The pulse sits inside `prefers-reduced-motion: no-preference`, so a
 * user who asked for stillness gets a static outline rather than no Spotlight.
 */
const SPOTLIGHT_CSS = `
.${MARK_CLASS} {
  outline: 2px solid #f44d60 !important;
  outline-offset: 2px !important;
  background-color: rgba(244, 77, 96, 0.06);
  border-radius: 8px;
  transition: background-color 160ms ease-out;
}
@media (prefers-reduced-motion: no-preference) {
  .${MARK_CLASS} { animation: ghostly247-spotlight-pulse 1.8s ease-in-out infinite; }
  @keyframes ghostly247-spotlight-pulse {
    0%, 100% { background-color: rgba(244, 77, 96, 0.06); }
    50% { background-color: rgba(244, 77, 96, 0.12); }
  }
}
`;

const ensureStyle = (): void => {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = SPOTLIGHT_CSS;
  document.head.appendChild(style);
};

/* -- the setting ------------------------------------------------------------ */

let enabled = true;
let settingLoaded = false;

const loadSetting = async (): Promise<boolean> => {
  if (settingLoaded) return enabled;
  try {
    enabled = (await getSettings()).spotlight !== false;
  } catch {
    enabled = true;
  }
  settingLoaded = true;
  return enabled;
};

// Turning Spotlight off should clear the outline that is on screen RIGHT NOW,
// not the next one — otherwise the switch appears not to work.
try {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !(STORAGE_KEYS.settings in changes)) return;
    const next = changes[STORAGE_KEYS.settings]?.newValue as { spotlight?: boolean } | undefined;
    enabled = next?.spotlight !== false;
    settingLoaded = true;
    if (!enabled) clearSpotlight();
  });
} catch {
  /* not in an extension context (the smoke suite) — the setting stays default */
}

/* -- lifecycle -------------------------------------------------------------- */

let marked: HTMLElement | null = null;
let watchdog: ReturnType<typeof setInterval> | null = null;
let markedPath = '';

/**
 * Clear the outline and the label. Safe to call any number of times, from
 * anywhere — every path out of an action ends here.
 */
export const clearSpotlight = (): void => {
  if (watchdog !== null) {
    clearInterval(watchdog);
    watchdog = null;
  }
  marked?.classList.remove(MARK_CLASS);
  marked = null;
  markedPath = '';
  if (current !== null) publish(null);
};

/**
 * Point at a post.
 *
 * Returns false without doing anything when Spotlight is off or the post is not
 * really on screen — an outline below the fold is decoration, not a way to watch
 * something happen.
 */
export const spotlightOn = async (
  article: HTMLElement,
  target: SpotlightTarget,
): Promise<boolean> => {
  if (!(await loadSetting())) return false;
  if (!article.isConnected) return false;

  const rect = article.getBoundingClientRect();
  if (!isInViewport(rect, { width: window.innerWidth, height: window.innerHeight })) return false;

  clearSpotlight();
  ensureStyle();
  article.classList.add(MARK_CLASS);
  marked = article;
  markedPath = location.pathname;
  publish(target);

  // The watchdog is the promise that there is never a stray outline. X
  // virtualises its timeline, so the element we marked can be removed without
  // anyone telling us, and the reply flow navigates off the feed entirely.
  watchdog = setInterval(() => {
    if (!marked) return;
    if (!marked.isConnected || location.pathname !== markedPath) clearSpotlight();
  }, 1_000);

  return true;
};

// Whatever else happens, an outline never survives the page.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', clearSpotlight);
}
