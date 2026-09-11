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
 * It is also MARKED, so nobody has to guess which tab is Ghostly's: it sits
 * in a blue tab group titled "Ghostly", and the page carries a title prefix
 * and the Ghostly favicon (content/worker-mark.ts). The
 * group doubles as a memory: after an extension reload or a browser restart
 * — both of which forget the id — the tab is re-adopted from its group rather
 * than a second one being opened, and any duplicates are closed.
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
/** The tab group Ghostly's tab lives in — its label in the tab strip. */
export const WORKER_GROUP_TITLE = 'Ghostly';
/** The prefix the content script gives the worker tab's title. */
export const WORKER_TITLE_MARK = 'Ghostly · ';
/** What earlier builds used — still recognised, so their tabs get adopted too. */
const OLD_GROUP_TITLE = '👻 Ghostly';
const OLD_TITLE_MARK = '👻 Ghostly · ';
const X_TABS = ['https://x.com/*', 'https://twitter.com/*'];

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

/**
 * Tabs Ghostly opened and then lost track of: anything in its tab group, or
 * still wearing its title mark. Only ever tabs Ghostly itself marked — a tab
 * the user opened is never in this list.
 */
const findOwnTabs = async (): Promise<number[]> => {
  const ids = new Set<number>();
  try {
    const groups = [
      ...(await chrome.tabGroups.query({ title: WORKER_GROUP_TITLE })),
      ...(await chrome.tabGroups.query({ title: OLD_GROUP_TITLE })),
    ];
    for (const g of groups) {
      for (const t of await chrome.tabs.query({ groupId: g.id })) if (typeof t.id === 'number') ids.add(t.id);
    }
  } catch {
    /* no tab groups in this browser — the title mark still finds it */
  }
  for (const t of await chrome.tabs.query({ url: X_TABS })) {
    if (typeof t.id === 'number' && (t.title?.startsWith(WORKER_TITLE_MARK) || t.title?.startsWith(OLD_TITLE_MARK))) ids.add(t.id);
  }
  return [...ids];
};

/** Keep one of Ghostly's own tabs and close the rest. */
const adoptOwnTab = async (): Promise<number | null> => {
  const [keep, ...extra] = await findOwnTabs();
  if (keep === undefined) return null;
  if (extra.length > 0) await chrome.tabs.remove(extra).catch(() => {});
  await setWorkerTabId(keep);
  return keep;
};

/** Reads the remembered tab id, confirming the tab still actually exists. */
export const getWorkerTabId = async (): Promise<number | null> => {
  const stored = await chrome.storage.session.get(WORKER_TAB_KEY);
  const id = stored[WORKER_TAB_KEY];
  if (typeof id === 'number') {
    try {
      await chrome.tabs.get(id);
      return id;
    } catch {
      // The user closed it, or the browser restarted since it was written.
      await chrome.storage.session.remove(WORKER_TAB_KEY);
    }
  }
  // Forgotten (extension reload / browser restart), not gone: re-adopt it.
  return adoptOwnTab();
};

/**
 * Put the tab in Ghostly's blue group and tell its page to mark itself. A tab
 * the user moved into one of THEIR groups is left where they put it.
 */
const markWorkerTab = async (tabId: number): Promise<void> => {
  try {
    const tab = await chrome.tabs.get(tabId);
    if (tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) {
      const groupId = await chrome.tabs.group({ tabIds: [tabId], createProperties: { windowId: tab.windowId } });
      await chrome.tabGroups.update(groupId, { title: WORKER_GROUP_TITLE, color: groupColor, collapsed: false });
    } else {
      // Rename a group an earlier build labelled with the emoji.
      const group = await chrome.tabGroups.get(tab.groupId);
      if (group.title === OLD_GROUP_TITLE) await chrome.tabGroups.update(group.id, { title: WORKER_GROUP_TITLE });
    }
  } catch {
    /* tab groups unavailable — the page's own mark still shows */
  }
  // Fire-and-forget: the page answers if its content script is up; if not,
  // it asks for itself on load (AM_I_WORKER).
  chrome.tabs.sendMessage(tabId, { type: 'GHOSTLY_WORKER' }).catch(() => {});
};

/**
 * The group's colour says whether Ghostly is working: blue while it is, amber
 * (Chrome's "yellow") while it's stopped, on a break, or outside its hours.
 * Remembered, so the scheduler's 30-second tick doesn't re-paint for nothing.
 */
let groupColor: 'blue' | 'yellow' = 'blue';
let paintedColor: string | null = null;
export const setWorkerTabWorking = async (working: boolean): Promise<void> => {
  groupColor = working ? 'blue' : 'yellow';
  try {
    const id = await getWorkerTabId();
    if (id === null) return;
    const tab = await chrome.tabs.get(id);
    if (tab.groupId === chrome.tabGroups.TAB_GROUP_ID_NONE) return;
    const group = await chrome.tabGroups.get(tab.groupId);
    if (group.title !== WORKER_GROUP_TITLE && group.title !== OLD_GROUP_TITLE) return; // the user's own group
    if (paintedColor === `${group.id}:${groupColor}` && group.color === groupColor) return;
    await chrome.tabGroups.update(group.id, { color: groupColor });
    paintedColor = `${group.id}:${groupColor}`;
  } catch {
    /* no tab or no groups — nothing to colour */
  }
};

/** Bring Ghostly's tab to the front — "show me where you're working". */
export const focusWorkerTab = async (): Promise<boolean> => {
  const id = await getWorkerTabId();
  if (id === null) return false;
  const tab = await chrome.tabs.update(id, { active: true });
  if (tab?.windowId !== undefined) await chrome.windows.update(tab.windowId, { focused: true }).catch(() => {});
  return true;
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
      await markWorkerTab(tab.id);
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
    await markWorkerTab(tabId);
    await sleep(options.settleMs ?? POST_LOAD_SETTLE_MS);
    return sendWithRetry(tabId, message);
  });
