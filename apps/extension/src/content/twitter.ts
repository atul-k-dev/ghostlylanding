/**
 * Twitter / X content script entrypoint.
 * Runs on every x.com / twitter.com page; idle until the service worker
 * sends a SCAN_PROFILE or LIKE_POST message.
 */
import { installTwitterHandler } from '../platforms/twitter/handler.js';
import { hydrateSelectors } from '../lib/selector-config.js';

// Apply any remotely-served selector overrides BEFORE the handler can act on a
// message. The handler awaits this same promise, so a message arriving during
// hydration still runs against the up-to-date map rather than the bundled one.
export const selectorsReady = hydrateSelectors();

installTwitterHandler(selectorsReady);
console.log('[casper] twitter content script loaded');

export {};
