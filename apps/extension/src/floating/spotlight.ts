/**
 * Spotlight (updateplan 2.3) — point at the work, and keep pointing.
 *
 * The engine works in a real tab, and without this you can't tell which post
 * it's on. Spotlight outlines the post it's reading or acting on, on X's own
 * page, with a small label saying what it's doing ("Liking this…" → "Liked").
 *
 * It STAYS: the outline moves to the next post when the engine does, rather
 * than vanishing the moment an action ends — so you can always see where
 * Ghostly is (or last was). Only the Spotlight setting turns it off.
 *
 * It FOLLOWS: X virtualises its timeline (the element can be swapped out at
 * any time) and the reply flow opens the post on its own page. A watchdog
 * finds the same post again by its permalink and re-marks it.
 *
 * Two parts: the outline is a class on X's article (the one thing that can't
 * live in our shadow root), the label is a fixed overlay we own, placed over
 * the post's top edge — nothing is inserted into X's own DOM tree.
 */
import { getSettings, STORAGE_KEYS } from '../lib/storage.js';

/**
 * What the engine is doing to the post it points at. `reading` is every post
 * it dwells on while deciding — most of them — so the considering is visible
 * too, in a calmer (dashed) register than a real action.
 */
export type SpotlightAction = 'like' | 'reply' | 'follow' | 'bookmark' | 'repost' | 'quote' | 'reading';

export interface SpotlightTarget {
  action: SpotlightAction;
  authorHandle: string | null;
  postUrl: string;
  /** Trimmed post text, so a panel can say WHICH post. */
  text: string;
  /** Set once the action finished: what came of it. */
  outcome?: 'done' | 'drafted' | 'skipped';
}

export const SPOTLIGHT_LABEL: Record<SpotlightAction, string> = {
  reply: 'Replying to this…',
  like: 'Liking this…',
  follow: 'Following them…',
  bookmark: 'Bookmarking this…',
  repost: 'Reposting this…',
  quote: 'Quoting this…',
  reading: 'Reading this',
};

const DONE_LABEL: Record<SpotlightAction, string> = {
  reply: 'Replied',
  like: 'Liked',
  follow: 'Followed',
  bookmark: 'Bookmarked',
  repost: 'Reposted',
  quote: 'Quoted',
  reading: 'Read — not for you',
};

export const labelFor = (t: SpotlightTarget): string =>
  t.outcome === 'drafted'
    ? 'Reply drafted — waiting for your OK'
    : t.outcome === 'skipped'
      ? 'Skipped this one'
      : t.outcome === 'done'
        ? DONE_LABEL[t.action]
        : SPOTLIGHT_LABEL[t.action];

export const isReadingOnly = (action: SpotlightAction): boolean => action === 'reading';

/* -- the store (for anything that wants to show the same line) --------------- */

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
  renderBadge();
};

/* -- the outline ------------------------------------------------------------- */

const STYLE_ID = 'ghostly247-spotlight-style';
const MARK_CLASS = 'ghostly247-spotlight';
const READING_CLASS = 'ghostly247-spotlight-reading';
const DONE_CLASS = 'ghostly247-spotlight-done';

/** The theme colour, handed to the page by mount.ts; Twitter blue otherwise. */
const ACCENT = 'var(--ghostly-accent, #1d9bf0)';

/**
 * The one stylesheet on X's own page. `!important` on the outline only — X's
 * resets clear outlines on focus. The pulse only runs for users who haven't
 * asked for reduced motion.
 */
const SPOTLIGHT_CSS = `
.${MARK_CLASS} {
  outline: 2.5px solid ${ACCENT} !important;
  outline-offset: 3px !important;
  background-color: color-mix(in oklch, ${ACCENT} 9%, transparent) !important;
  border-radius: 12px;
  transition: background-color 200ms ease-out, outline-color 200ms ease-out;
}
.${MARK_CLASS}.${READING_CLASS} {
  outline-style: dashed !important;
  outline-color: color-mix(in oklch, ${ACCENT} 60%, #a1a1aa) !important;
  background-color: color-mix(in oklch, ${ACCENT} 4%, transparent) !important;
}
.${MARK_CLASS}.${DONE_CLASS} { background-color: color-mix(in oklch, ${ACCENT} 5%, transparent) !important; }
@media (prefers-reduced-motion: no-preference) {
  .${MARK_CLASS}:not(.${READING_CLASS}):not(.${DONE_CLASS}) { animation: ghostly247-spotlight-pulse 1.6s ease-in-out infinite; }
  @keyframes ghostly247-spotlight-pulse {
    0%, 100% { background-color: color-mix(in oklch, ${ACCENT} 8%, transparent); }
    50% { background-color: color-mix(in oklch, ${ACCENT} 16%, transparent); }
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

/* -- the label ----------------------------------------------------------------- */

const BADGE_ID = 'ghostly247-spotlight-badge';
let badge: HTMLDivElement | null = null;
let raf = 0;

const ensureBadge = (): HTMLDivElement => {
  if (badge?.isConnected) return badge;
  badge = document.createElement('div');
  badge.id = BADGE_ID;
  badge.setAttribute('role', 'status');
  badge.style.cssText = [
    'all: initial',
    'position: fixed',
    'z-index: 2147483645',
    'display: none',
    'align-items: center',
    'gap: 6px',
    'max-width: 320px',
    'padding: 3px 11px 3px 4px',
    'border-radius: 9999px',
    `background: ${ACCENT}`,
    'color: #0f1419',
    'font: 600 12px/1.35 TwitterChirp, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    'box-shadow: 0 4px 14px rgba(0,0,0,0.25)',
    'white-space: nowrap',
    'pointer-events: none',
    'transition: top 120ms ease-out, left 120ms ease-out',
  ].join(';');
  const icon = document.createElement('img');
  icon.src = chrome.runtime.getURL('icons/icon-32.png');
  icon.alt = '';
  icon.style.cssText = 'all: initial; width: 18px; height: 18px; border-radius: 9999px; background: #fff;';
  const text = document.createElement('span');
  text.style.cssText = 'all: initial; font: inherit; color: inherit; overflow: hidden; text-overflow: ellipsis;';
  badge.append(icon, text);
  document.body.appendChild(badge);
  return badge;
};

/** Sit the label on the outlined post's top edge; hide it while the post is off-screen. */
const placeBadge = (): void => {
  if (!badge) return;
  if (!marked?.isConnected || !current) {
    badge.style.display = 'none';
    return;
  }
  const r = marked.getBoundingClientRect();
  const onScreen = r.bottom > 24 && r.top < window.innerHeight - 24;
  badge.style.display = onScreen ? 'flex' : 'none';
  badge.style.top = `${Math.max(6, r.top - 13)}px`;
  badge.style.left = `${Math.max(6, r.left + 14)}px`;
};

const renderBadge = (): void => {
  if (!current || !enabled) {
    if (badge) badge.style.display = 'none';
    return;
  }
  const b = ensureBadge();
  const text = b.lastChild as HTMLSpanElement;
  text.textContent = labelFor(current);
  placeBadge();
};

const onViewportChange = (): void => {
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(placeBadge);
};
if (typeof window !== 'undefined') {
  window.addEventListener('scroll', onViewportChange, { capture: true, passive: true });
  window.addEventListener('resize', onViewportChange, { passive: true });
}

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

// Turning Spotlight off clears what's on screen NOW, not the next one.
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

const unmark = (): void => {
  marked?.classList.remove(MARK_CLASS, READING_CLASS, DONE_CLASS);
  marked = null;
};

const applyClasses = (el: HTMLElement): void => {
  el.classList.add(MARK_CLASS);
  el.classList.toggle(READING_CLASS, current?.action === 'reading' && !current.outcome);
  el.classList.toggle(DONE_CLASS, Boolean(current?.outcome));
};

/** The post's status path ("/handle/status/123"), for finding it again. */
const statusPath = (postUrl: string): string | null => {
  try {
    const m = new URL(postUrl, location.origin).pathname.match(/\/status\/\d+/);
    return m ? m[0] : null;
  } catch {
    return null;
  }
};

/** Find the post again after X re-rendered it or navigated to its own page. */
const refind = (): HTMLElement | null => {
  const path = current ? statusPath(current.postUrl) : null;
  if (!path) return null;
  for (const a of document.querySelectorAll<HTMLAnchorElement>(`article a[href*="${path}"]`)) {
    const article = a.closest('article');
    if (article instanceof HTMLElement) return article;
  }
  return null;
};

const startWatchdog = (): void => {
  if (watchdog !== null) return;
  watchdog = setInterval(() => {
    if (!current) return;
    if (!marked?.isConnected) {
      const again = refind();
      if (again) {
        marked = again;
        applyClasses(again);
      }
    }
    placeBadge();
  }, 700);
};

/** Take the outline and label down. Only for turning Spotlight off and leaving the page. */
export const clearSpotlight = (): void => {
  if (watchdog !== null) {
    clearInterval(watchdog);
    watchdog = null;
  }
  unmark();
  if (current !== null) publish(null);
};

/**
 * Point at a post. The previous outline moves here — there is always at most
 * one, and it stays until the next.
 */
export const spotlightOn = async (article: HTMLElement, target: SpotlightTarget): Promise<boolean> => {
  if (!(await loadSetting())) return false;
  if (!article.isConnected) return false;
  ensureStyle();
  if (marked && marked !== article) unmark();
  marked = article;
  current = { ...target, outcome: undefined };
  applyClasses(article);
  publish(current);
  startWatchdog();
  return true;
};

/** The action on the spotlighted post finished — say how, and keep pointing. */
export const spotlightDone = (outcome: NonNullable<SpotlightTarget['outcome']>): void => {
  if (!current || !enabled) return;
  current = { ...current, outcome };
  if (marked?.isConnected) applyClasses(marked);
  publish(current);
};

// Whatever else happens, an outline never survives the page.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', clearSpotlight);
}
