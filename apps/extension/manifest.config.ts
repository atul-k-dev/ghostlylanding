import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Ghostly247',
  description:
    'The friendly little ghost that grows your Twitter/X presence while you sleep.',
  version: '0.0.1',
  icons: {
    16: 'icons/icon-16.png',
    32: 'icons/icon-32.png',
    48: 'icons/icon-48.png',
    128: 'icons/icon-128.png',
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
      // Add the production server origin here (and in host_permissions) on deploy.
      matches: ['http://localhost:4000/r/*'],
      js: ['src/content/checkout-return.ts'],
      run_at: 'document_start',
    },
  ],
  permissions: ['storage', 'alarms', 'scripting', 'activeTab', 'identity'],
  host_permissions: [
    'https://x.com/*',
    'https://twitter.com/*',
    'http://localhost:4000/*',
  ],
});
