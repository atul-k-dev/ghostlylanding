import { defineManifest } from '@crxjs/vite-plugin';

/**
 * The API's origin, taken from VITE_API_BASE_URL. Everything that has to name
 * the backend derives from this, so pointing the build at a different server is
 * a one-line .env change: the host permission (needed both for apiFetch and for
 * tabs.onUpdated to reveal the checkout URL) and the checkout-return content
 * script move with it, instead of silently still matching production.
 */
const apiOriginOf = (baseUrl: string): string => {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return 'http://localhost:4000';
  }
};

export const buildManifest = (apiBaseUrl: string) => {
  const apiOrigin = apiOriginOf(apiBaseUrl);
  return defineManifest({
    manifest_version: 3,
    name: 'Ghostly247 — Twitter/X Growth Autopilot',
    description:
      'Twitter/X growth autopilot — auto-like, AI reply, follow, repost & quote, plus AI create & schedule posts and a daily recap email.',
    version: '3.0.0',
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    // The side panel IS the product now (updateplan 1.1). Clicking the toolbar
    // icon opens it: there is no `default_popup`, and `setPanelBehavior({
    // openPanelOnActionClick: true })` in background/index.ts is what turns the
    // action click into an open. `src/popup/` stays on disk until 1.6 ports the
    // last of its pages, but nothing routes to it any more.
    side_panel: {
      default_path: 'src/sidepanel/index.html',
    },
    action: {
      default_title: 'Ghostly247',
      default_icon: {
        16: 'icons/icon-16.png',
        32: 'icons/icon-32.png',
        48: 'icons/icon-48.png',
        128: 'icons/icon-128.png',
      },
    },
    background: {
      service_worker: 'src/background/index.ts',
      type: 'module',
    },
    /**
     * The documented fallback for updateplan 2.5. Opening the side panel needs a
     * user gesture; a keyboard command is unambiguously one, so if a
     * content-script click ever stops carrying the gesture through the message
     * hop, Alt+G still opens the panel and the ⤢ button says so.
     */
    commands: {
      'open-side-panel': {
        suggested_key: { default: 'Alt+G' },
        description: 'Open the Ghostly247 panel',
      },
    },
    content_scripts: [
      {
        matches: ['https://x.com/*', 'https://twitter.com/*'],
        js: ['src/content/twitter.ts'],
        run_at: 'document_idle',
      },
      {
        // Stripe checkout return page — closes the tab and returns to the popup.
        matches: [`${apiOrigin}/r/*`],
        js: ['src/content/checkout-return.ts'],
        run_at: 'document_start',
      },
    ],
    // The floating card on x.com shows the logo, so the page must be allowed to load it.
    web_accessible_resources: [
      {
        resources: ['icons/icon-128.png', 'icons/icon-32.png'],
        matches: ['https://x.com/*', 'https://twitter.com/*'],
      },
    ],
    // Minimal set: storage (settings/auth), alarms (scheduler tick),
    // identity (Google sign-in), sidePanel (the workspace mode), notifications
    // (4.3's capped, decaying-moment alerts). No scripting/activeTab — actions
    // run via the statically-declared x.com content script.
    // tabGroups: Ghostly's one working tab sits in a labelled "👻 Ghostly"
    // group, so it stands out in the tab strip (and can be re-found after a
    // reload instead of a second tab being opened).
    permissions: ['storage', 'alarms', 'identity', 'sidePanel', 'notifications', 'tabGroups'],
    host_permissions: ['https://x.com/*', 'https://twitter.com/*', `${apiOrigin}/*`],
  });
};
