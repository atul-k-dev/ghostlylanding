/**
 * LinkedIn content script entrypoint.
 */
import { installLinkedInHandler } from '../platforms/linkedin/handler.js';

installLinkedInHandler();
console.log('[casper] linkedin content script loaded');

export {};
