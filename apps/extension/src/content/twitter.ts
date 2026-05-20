/**
 * Twitter / X content script entrypoint.
 * Runs on every x.com / twitter.com page; idle until the service worker
 * sends a SCAN_PROFILE or LIKE_POST message.
 */
import { installTwitterHandler } from '../platforms/twitter/handler.js';

installTwitterHandler();
console.log('[casper] twitter content script loaded');

export {};
