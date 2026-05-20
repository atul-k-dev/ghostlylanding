/**
 * Twitter content-script router.
 * Handles SCAN_PROFILE, LIKE_POST, SUBMIT_COMMENT from the service worker;
 * also installs the Draft-button injector that decorates every visible post.
 */
import type {
  ContentRequest,
  ContentResponse,
} from '../common/content-messages.js';
import { scanProfile, likeCurrentPost } from './dom.js';
import { extractPostText, submitComment } from './comment.js';
import { scanFollowers, followCurrentProfile } from './follow.js';
import { installDraftButtonInjector } from '../common/draft-button.js';
import { TWITTER_SELECTORS } from './selectors.js';

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
          const resp: ContentResponse = { type: 'LIKE_RESULT', payload: result };
          sendResponse(resp);
          return;
        }
        if (req.type === 'SUBMIT_COMMENT') {
          const result = await submitComment(req.payload.commentText);
          const resp: ContentResponse = { type: 'COMMENT_RESULT', payload: result };
          sendResponse(resp);
          return;
        }
        if (req.type === 'SCAN_FOLLOWERS') {
          const followers = await scanFollowers(req.payload.max ?? 20);
          const resp: ContentResponse = {
            type: 'FOLLOWERS_RESULT',
            payload: { followers },
          };
          sendResponse(resp);
          return;
        }
        if (req.type === 'FOLLOW_HANDLE') {
          const result = await followCurrentProfile();
          const resp: ContentResponse = { type: 'FOLLOW_RESULT', payload: result };
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
    return true;
  });

  installDraftButtonInjector({
    platform: 'twitter',
    postSelector: TWITTER_SELECTORS.postArticle,
    actionBarSelector: TWITTER_SELECTORS.actionBarRow,
    permalinkSelector: TWITTER_SELECTORS.permalink,
    extractPostText,
  });

  console.log('[casper] twitter handler installed');
};
