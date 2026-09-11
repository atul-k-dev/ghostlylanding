/**
 * Marks Ghostly's one working tab, so it stands out among every other x.com
 * tab (the tab driver also puts it in a blue "Ghostly" tab group):
 *
 *   · title    — "Ghostly · …", kept on as X changes the title per page
 *   · favicon  — Ghostly's icon instead of X's (the only icon — no emoji)
 *
 * Nothing is drawn on the page itself: the tab strip is where you look for it.
 *
 * Every x.com page asks the service worker "am I the worker?" on load; the
 * driver also pushes GHOSTLY_WORKER after it navigates the tab. Other tabs
 * learn a worker tab exists, so the floating panel can offer to show it.
 */
const TITLE_MARK = 'Ghostly · ';
/** The mark earlier builds used — stripped so a re-marked tab never shows both. */
const OLD_MARK = '👻 Ghostly · ';

let isWorker = false;
let workerExists = false;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export const workerState = () => ({ isWorker, workerExists });
export const onWorkerState = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};

const iconUrl = () => chrome.runtime.getURL('icons/icon-32.png');

const markTitle = () => {
  let t = document.title;
  while (t.startsWith(OLD_MARK)) t = t.slice(OLD_MARK.length);
  if (!t.startsWith(TITLE_MARK)) t = TITLE_MARK + t;
  if (t !== document.title) document.title = t;
};

const markFavicon = () => {
  const href = iconUrl();
  const links = document.head?.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]') ?? [];
  let mine = false;
  links.forEach((l) => {
    if (l.href === href) mine = true;
    else l.remove();
  });
  if (!mine && document.head) {
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = href;
    document.head.appendChild(link);
  }
};

let observer: MutationObserver | null = null;

const becomeWorker = () => {
  document.getElementById('ghostly247-worker-frame')?.remove();
  if (isWorker) return;
  isWorker = true;
  workerExists = true;
  markTitle();
  markFavicon();
  // X rewrites the title on every in-app navigation and swaps the favicon for
  // its notification count — put ours back each time.
  observer = new MutationObserver(() => {
    markTitle();
    const icon = document.head?.querySelector<HTMLLinkElement>('link[rel~="icon"]');
    if (!icon || icon.href !== iconUrl()) markFavicon();
  });
  if (document.head) observer.observe(document.head, { childList: true, subtree: true, characterData: true });
  notify();
};

export const installWorkerMark = () => {
  chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
    if ((message as { type?: string } | null)?.type !== 'GHOSTLY_WORKER') return false;
    becomeWorker();
    sendResponse({ ok: true });
    return false;
  });

  const ask = () =>
    chrome.runtime
      .sendMessage({ type: 'AM_I_WORKER', payload: {} })
      .then((r: { worker?: boolean; exists?: boolean } | undefined) => {
        if (r?.worker) becomeWorker();
        else if (Boolean(r?.exists) !== workerExists) {
          workerExists = Boolean(r?.exists);
          notify();
        }
      })
      .catch(() => {});
  void ask();
  // Other tabs keep an eye out, so "Ghostly works in its own tab" stays true.
  setInterval(() => !isWorker && void ask(), 60_000);
};
