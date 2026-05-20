import type { CasperMessage } from '@casper/shared';

type AnyMessage = CasperMessage | { type: string; payload: unknown };

/**
 * Send a message to the service worker and await its response.
 * Throws on chrome.runtime.lastError.
 */
export const sendToBackground = <Resp = unknown>(message: AnyMessage): Promise<Resp> =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message ?? 'unknown error'));
        return;
      }
      resolve(response as Resp);
    });
  });
