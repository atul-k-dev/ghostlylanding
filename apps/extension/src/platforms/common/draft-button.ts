/**
 * Inject a small "✨ Draft" button into every visible post.
 * Idempotent — won't double-inject if the article already has one. A
 * MutationObserver re-runs the scan as the feed virtualizes new posts in.
 *
 * On click:
 *   1. Extract post text + URL from the local DOM
 *   2. sendMessage to the service worker (DRAFT_COMMENT)
 *   3. SW returns the generated draft (or an error)
 *   4. The button reflects the result inline ("Drafted ✓" / error)
 */
import type { Platform } from '@casper/shared';

const MARKER_ATTR = 'data-casper-draft';
const PROCESSED_ATTR = 'data-casper-decorated';

interface InjectorOptions {
  platform: Platform;
  postSelector: string;
  actionBarSelector: string;
  permalinkSelector: string;
  extractPostText: (article: HTMLElement) => string;
}

const findPermalink = (article: HTMLElement, sel: string): string => {
  const a = article.querySelector<HTMLAnchorElement>(sel);
  if (!a) return location.href;
  try {
    return new URL(a.getAttribute('href') ?? '', location.origin).toString();
  } catch {
    return location.href;
  }
};

type ButtonState = 'idle' | 'drafting' | 'drafted' | 'error';

const setButtonState = (
  btn: HTMLButtonElement,
  state: ButtonState,
  message?: string,
): void => {
  btn.dataset.state = state;
  const map: Record<ButtonState, { label: string; color: string }> = {
    idle: { label: '✨ Draft', color: '#7c5cff' },
    drafting: { label: 'Drafting…', color: '#7c5cff' },
    drafted: { label: '✓ Added to queue', color: '#10b981' },
    error: { label: message ? `✗ ${message.slice(0, 40)}` : '✗ Error', color: '#ef4444' },
  };
  const cfg = map[state];
  btn.textContent = cfg.label;
  btn.style.color = cfg.color;
  btn.style.borderColor = cfg.color;
  btn.disabled = state === 'drafting';
};

const createButton = (
  article: HTMLElement,
  opts: InjectorOptions,
): HTMLButtonElement => {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute(MARKER_ATTR, '1');
  btn.style.cssText = [
    'margin-left:8px',
    'padding:2px 10px',
    'font:600 11px system-ui,-apple-system,sans-serif',
    'background:transparent',
    'border:1px solid #7c5cff',
    'border-radius:9999px',
    'cursor:pointer',
    'line-height:1.4',
    'white-space:nowrap',
    'transition:background .15s',
  ].join(';');
  setButtonState(btn, 'idle');

  btn.addEventListener('mouseenter', () => {
    if (btn.dataset.state === 'idle') btn.style.background = 'rgba(124,92,255,0.08)';
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.background = 'transparent';
  });

  btn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setButtonState(btn, 'drafting');
    try {
      const postText = opts.extractPostText(article).trim();
      if (!postText) {
        setButtonState(btn, 'error', 'no post text');
        return;
      }
      const postUrl = findPermalink(article, opts.permalinkSelector);
      const resp = await chrome.runtime.sendMessage({
        type: 'DRAFT_COMMENT',
        payload: { platform: opts.platform, postText, postUrl },
      });
      if (resp && typeof resp === 'object' && resp.ok === false) {
        setButtonState(btn, 'error', resp.error?.message ?? 'failed');
        return;
      }
      setButtonState(btn, 'drafted');
    } catch (err) {
      setButtonState(btn, 'error', err instanceof Error ? err.message : 'failed');
    }
  });

  return btn;
};

const tryInjectInto = (article: HTMLElement, opts: InjectorOptions): void => {
  if (article.getAttribute(PROCESSED_ATTR) === '1') return;
  // Some scans pick up replies + ads — only operate on articles with permalinks
  if (!article.querySelector(opts.permalinkSelector)) return;
  const actionBar = article.querySelector<HTMLElement>(opts.actionBarSelector);
  const host: HTMLElement = actionBar ?? article;
  if (host.querySelector(`[${MARKER_ATTR}]`)) {
    article.setAttribute(PROCESSED_ATTR, '1');
    return;
  }
  const btn = createButton(article, opts);
  host.appendChild(btn);
  article.setAttribute(PROCESSED_ATTR, '1');
};

const scanAndInject = (opts: InjectorOptions): void => {
  const articles = document.querySelectorAll<HTMLElement>(opts.postSelector);
  for (const article of articles) tryInjectInto(article, opts);
};

export const installDraftButtonInjector = (opts: InjectorOptions): void => {
  scanAndInject(opts);
  let scheduled = false;
  const observer = new MutationObserver(() => {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      scanAndInject(opts);
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
};
