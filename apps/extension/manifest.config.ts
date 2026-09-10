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
    version: '2.1.0',
    icons: {
      16: 'icons/icon-16.png',
      32: 'icons/icon-32.png',
      48: 'icons/icon-48.png',
      128: 'icons/icon-128.png',
    },
    // PHASE 2.5 SPIKE: the side panel ships ALONGSIDE the popup for now, so
    // nothing about the current UX changes while we answer the gesture question.
    // Phase 1.1 removes `default_popup` and makes the icon open the panel.
    side_panel: {
      default_path: 'src/sidepanel/index.html',
    },
    action: {
      default_popup: 'src/popup/index.html',
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
    // Minimal set: storage (settings/auth), alarms (scheduler tick),
    // identity (Google sign-in), sidePanel (the workspace mode). No
    // scripting/activeTab — actions run via the statically-declared x.com
    // content script.
    permissions: ['storage', 'alarms', 'identity', 'sidePanel'],
    host_permissions: ['https://x.com/*', 'https://twitter.com/*', `${apiOrigin}/*`],
  });
};
