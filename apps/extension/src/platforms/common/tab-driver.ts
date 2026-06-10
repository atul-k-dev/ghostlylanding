/**
 * Service-worker-side tab driver.
 *
 * One Casper task at a time opens a background tab, gives the page a chance to
 * settle, sends a single message to the content script, awaits the reply, then
 * closes the tab. Errors are normalized so the executor sees structured failures.
 */
import type { ContentRequest, ContentResponse } from './content-messages.js';
import { getSettings } from '../../lib/storage.js';

const DEFAULT_LOAD_TIMEOUT_MS = 25_000;
const POST_LOAD_SETTLE_MS = 2_500;
const CONTENT_SCRIPT_RETRY_MS = 1_500;
const CONTENT_SCRIPT_MAX_ATTEMPTS = 4;

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

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

interface DriveOptions {
  loadTimeoutMs?: number;
  settleMs?: number;
}

export const driveTab = async (
  url: string,
  message: ContentRequest,
  options: DriveOptions = {},
): Promise<ContentResponse> => {
  // In visible mode the tab opens in the foreground so the user can watch the
  // scrolling / liking / commenting / following happen.
  const { visibleMode } = await getSettings();
  const tab = await chrome.tabs.create({ url, active: visibleMode !== false });
  const tabId = tab.id;
  if (typeof tabId !== 'number') {
    throw new Error('tab created without id');
  }
  try {
    await waitForLoad(tabId, options.loadTimeoutMs ?? DEFAULT_LOAD_TIMEOUT_MS);
    await sleep(options.settleMs ?? POST_LOAD_SETTLE_MS);
    return await sendWithRetry(tabId, message);
  } finally {
    try {
      await chrome.tabs.remove(tabId);
    } catch {
      /* tab may already be gone */
    }
  }
};
