/**
 * Service-worker-side tab driver.
 *
 * One dedicated tab does every task, all day: created once, then reused and
 * re-navigated for each like / reply / follow / scan. It used to be one
 * throwaway tab per task — created, driven, closed — which meant a tab
 * visibly popped open and shut on x.com every 8-45 seconds for as long as the
 * engine ran. That reads as a bot flailing, not a calm colleague, so now
 * there is exactly one tab, and it stays open. It is never made the active
 * tab, so it never steals focus from whatever the user is actually doing —
 * they can switch to it whenever they want (it's an ordinary tab, sitting in
 * the tab strip) to watch Spotlight live; nothing requires them to.
 *
 * Its id lives in `chrome.storage.session`, not a module variable, because
 * the service worker itself can be killed and restarted mid-day — session
 * storage survives that, and is naturally forgotten when the browser session
 * ends (at which point the tab is gone too, so there is nothing to reconcile).
 *
 * Every call is serialized through `withLock`. Two tasks must never navigate
 * the shared tab out from under each other — the mentions scan (Phase 4.1)
 * runs on its own alarm, independent of the main scheduler tick, so without
 * this a scan and an action really could collide.
 */
import type { ContentRequest, ContentResponse } from './content-messages.js';

const DEFAULT_LOAD_TIMEOUT_MS = 25_000;
const POST_LOAD_SETTLE_MS = 2_500;
const CONTENT_SCRIPT_RETRY_MS = 1_500;
const CONTENT_SCRIPT_MAX_ATTEMPTS = 4;
const WORKER_TAB_KEY = 'workerTabId';

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Every `driveTab` call runs one at a time, in the order it was made. */
let lock: Promise<unknown> = Promise.resolve();
const withLock = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = lock.then(fn, fn);
  lock = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
};

const waitForLoad = (tabId: number, timeoutMs: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('tab load timeout'));
    }, timeoutMs);

    const listener = (id: number, info: chrome.tabs.TabChangeInfo): void => {
      if (id !== tabId) return;
      if (info.status === 'complete') {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };

    chrome.tabs.onUpdated.addListener(listener);
  });

const sendWithRetry = async (
  tabId: number,
  message: ContentRequest,
): Promise<ContentResponse> => {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= CONTENT_SCRIPT_MAX_ATTEMPTS; attempt++) {
    try {
      const resp = (await chrome.tabs.sendMessage(tabId, message)) as ContentResponse | undefined;
      if (resp) return resp;
      lastError = new Error('content script returned empty response');
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
    if (attempt < CONTENT_SCRIPT_MAX_ATTEMPTS) {
      await sleep(CONTENT_SCRIPT_RETRY_MS);
    }
  }
  throw lastError ?? new Error('content script unreachable');
};

/** Reads the remembered tab id, confirming the tab still actually exists. */
const getWorkerTabId = async (): Promise<number | null> => {
  const stored = await chrome.storage.session.get(WORKER_TAB_KEY);
  const id = stored[WORKER_TAB_KEY];
  if (typeof id !== 'number') return null;
  try {
    await chrome.tabs.get(id);
    return id;
  } catch {
    // The user closed it, or the browser restarted since it was written.
    await chrome.storage.session.remove(WORKER_TAB_KEY);
    return null;
  }
};

const setWorkerTabId = (id: number): Promise<void> =>
  chrome.storage.session.set({ [WORKER_TAB_KEY]: id });

interface DriveOptions {
  loadTimeoutMs?: number;
  settleMs?: number;
  /**
   * Historically toggled whether the per-task tab was created active or not.
   * There is only one tab now and it is never made active, so this no longer
   * changes anything — kept only so existing call sites don't need to change.
   */
  forceBackground?: boolean;
}

export const driveTab = (
  url: string,
  message: ContentRequest,
  options: DriveOptions = {},
): Promise<ContentResponse> =>
  withLock(async () => {
    const timeoutMs = options.loadTimeoutMs ?? DEFAULT_LOAD_TIMEOUT_MS;
    const tabId = await getWorkerTabId();

    if (tabId === null) {
      const tab = await chrome.tabs.create({ url, active: false });
      if (typeof tab.id !== 'number') {
        throw new Error('tab created without id');
      }
      await setWorkerTabId(tab.id);
      await waitForLoad(tab.id, timeoutMs);
      await sleep(options.settleMs ?? POST_LOAD_SETTLE_MS);
      return sendWithRetry(tab.id, message);
    }

    // Chrome may have discarded the tab to save memory while it sat idle;
    // its url survives a discard but its content script does not, so a
    // discarded tab is re-navigated even when it's already "at" this url.
    const current = await chrome.tabs.get(tabId);
    if (current.discarded || current.url !== url) {
      const loaded = waitForLoad(tabId, timeoutMs);
      await chrome.tabs.update(tabId, { url });
      await loaded;
    }
    await sleep(options.settleMs ?? POST_LOAD_SETTLE_MS);
    return sendWithRetry(tabId, message);
  });
