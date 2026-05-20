/**
 * Twitter content-script message router.
 * Registers a single chrome.runtime.onMessage listener that dispatches
 * SCAN_PROFILE and LIKE_POST requests to DOM helpers.
 */
import type {
  ContentRequest,
  ContentResponse,
} from '../common/content-messages.js';
import { scanProfile, likeCurrentPost } from './dom.js';

export const installTwitterHandler = (): void => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const req = message as ContentRequest | undefined;
    if (!req || typeof req !== 'object' || typeof req.type !== 'string') {
      return false;
    }
    (async () => {
      try {
        if (req.type === 'SCAN_PROFILE') {
          const posts = await scanProfile(20);
          const resp: ContentResponse = { type: 'SCAN_RESULT', payload: { posts } };
          sendResponse(resp);
          return;
        }
        if (req.type === 'LIKE_POST') {
          const result = await likeCurrentPost();
          const resp: ContentResponse = {
            type: 'LIKE_RESULT',
            payload: result,
          };
          sendResponse(resp);
          return;
        }
      } catch (err) {
        const resp: ContentResponse = {
          type: 'ERROR',
          payload: { message: err instanceof Error ? err.message : String(err) },
        };
        sendResponse(resp);
      }
    })();
    return true; // async
  });
  console.log('[casper] twitter handler installed');
};
