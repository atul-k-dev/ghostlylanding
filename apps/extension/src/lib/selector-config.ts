/**
 * Remotely-updatable DOM selectors.
 *
 * X ships UI changes constantly, and when a `data-testid` moves, every user's
 * automation silently stops working. Shipping a fix in the bundle means waiting
 * days for a Chrome Web Store review; serving the map from our own server means
 * minutes.
 *
 * The bundled map in platforms/twitter/selectors.ts remains the fallback and the
 * floor: a remote config can only override keys that already exist, values are
 * validated as real CSS before use, and any failure anywhere leaves the bundled
 * selectors in place. A broken config must never be worse than no config.
 */
import { applySelectorOverrides } from '../platforms/twitter/selectors.js';
import {
  getStoredSelectorConfig,
  setSelectorConfig,
  appendDiagnostic,
  type SelectorConfig,
} from './storage.js';
import { apiFetch } from './api.js';

/** Re-fetch this often from the service worker (also on every SW boot). */
export const SELECTOR_REFRESH_MS = 6 * 60 * 60 * 1000;

/**
 * Fetch the server's selector map and cache it. Service-worker side.
 *
 * Returns the number of overrides the server sent (not how many a content script
 * will accept — that's decided per page, where the CSS can be validated).
 * Failure is normal and silent: the extension keeps using whatever it has.
 */
/** Numeric semver compare: -1 / 0 / 1. Non-numeric parts count as 0. */
export const compareVersions = (a: string, b: string): number => {
  const pa = a.split('.').map((n) => Number.parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => Number.parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
};

export const refreshSelectorConfig = async (): Promise<number> => {
  const resp = await apiFetch<{
    version: string;
    selectors: Record<string, string>;
    minExtensionVersion?: string;
  }>('/api/config/selectors');
  if (!resp.ok) return 0;

  const { version, selectors, minExtensionVersion } = resp.data;

  // Version handshake. If the server has moved past what this build speaks, say
  // so plainly — an out-of-date extension otherwise fails in ways that look like
  // random breakage to the user and to support.
  if (minExtensionVersion) {
    const mine = chrome.runtime.getManifest().version;
    if (compareVersions(mine, minExtensionVersion) < 0) {
      await appendDiagnostic({
        kind: 'network_error',
        context: 'extension:outdated',
        detail: `This version (${mine}) is older than the minimum supported (${minExtensionVersion}). Update Ghostly247 from the Chrome Web Store.`,
      });
    }
  }
  if (!selectors || typeof selectors !== 'object') return 0;

  // Keep only string values; the content script does the CSS validation, since
  // that needs a DOM the service worker doesn't have.
  const clean: Record<string, string> = {};
  for (const [key, value] of Object.entries(selectors)) {
    if (typeof value === 'string' && value.trim().length > 0) clean[key] = value;
  }

  const config: SelectorConfig = {
    version: typeof version === 'string' ? version : 'unknown',
    selectors: clean,
    fetchedAt: Date.now(),
  };
  await setSelectorConfig(config);
  console.log(
    `[casper] selector config ${config.version}: ${Object.keys(clean).length} override(s)`,
  );
  return Object.keys(clean).length;
};

/**
 * Content-script side: apply the cached overrides to the live selector map.
 *
 * Called before the first message is handled on a page. Never throws — a
 * failure here just means the page runs on the bundled selectors.
 */
export const hydrateSelectors = async (): Promise<void> => {
  try {
    const config = await getStoredSelectorConfig();
    if (!config) return;
    const applied = applySelectorOverrides(config.selectors);
    if (applied > 0) {
      console.log(`[casper] applied ${applied} remote selector override(s) (${config.version})`);
    }
  } catch {
    /* bundled selectors stand */
  }
};
