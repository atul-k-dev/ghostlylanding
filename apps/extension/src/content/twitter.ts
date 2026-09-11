/**
 * Twitter / X content script entrypoint.
 * Runs on every x.com / twitter.com page; idle until the service worker
 * sends a SCAN_PROFILE or LIKE_POST message.
 */
import { installTwitterHandler } from '../platforms/twitter/handler.js';
import { hydrateSelectors } from '../lib/selector-config.js';
import { mountFloatingPanel } from '../floating/mount.js';
import { installReplyForMe } from '../floating/reply-for-me.js';
import { installWorkerMark } from './worker-mark.js';

// Apply any remotely-served selector overrides BEFORE the handler can act on a
// message. The handler awaits this same promise, so a message arriving during
// hydration still runs against the up-to-date map rather than the bundled one.
export const selectorsReady = hydrateSelectors();

installTwitterHandler(selectorsReady);
// The product, on the page it works on (updateplan 2.1). Idempotent: X is an
// SPA and this script can run more than once per tab.
mountFloatingPanel();
// The 👻 button on every post's action bar (updateplan 2.4). One delegated
// listener, because X recycles timeline articles constantly.
installReplyForMe();
// Ghostly's own working tab marks itself; the others learn where it is.
installWorkerMark();
console.log('[casper] twitter content script loaded');

export {};
