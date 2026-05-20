import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'Casper AI',
  description:
    'The friendly little ghost that grows your Twitter & LinkedIn while you sleep.',
  version: '0.0.1',
  action: {
    default_popup: 'src/popup/index.html',
    default_title: 'Casper AI',
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
      matches: ['https://www.linkedin.com/*'],
      js: ['src/content/linkedin.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'alarms', 'scripting', 'activeTab', 'identity'],
  host_permissions: [
    'https://x.com/*',
    'https://twitter.com/*',
    'https://www.linkedin.com/*',
    'http://localhost:4000/*',
  ],
});
