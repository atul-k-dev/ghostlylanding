import type {
  ContentRequest,
  ContentResponse,
} from '../common/content-messages.js';
import { scanProfile, likeCurrentPost } from './dom.js';
import { extractPostText, submitComment } from './comment.js';
import { installDraftButtonInjector } from '../common/draft-button.js';
import { LINKEDIN_SELECTORS } from './selectors.js';

export const installLinkedInHandler = (): void => {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const req = message as ContentRequest | undefined;
    if (!req || typeof req !== 'object' || typeof req.type !== 'string') {
      return false;
    }
    (async () => {
      try {
        if (req.type === 'SCAN_PROFILE') {
          const posts = await scanProfile(15);
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
    platform: 'linkedin',
    postSelector: LINKEDIN_SELECTORS.postArticle,
    actionBarSelector: '.feed-shared-social-action-bar, .feed-shared-social-actions',
    permalinkSelector: LINKEDIN_SELECTORS.permalink,
    extractPostText,
  });

  console.log('[casper] linkedin handler installed');
};
