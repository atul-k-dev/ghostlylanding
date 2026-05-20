/**
 * Auth handoff content script.
 * Registered only on the web app's /auth/verify page.
 *
 * Flow:
 *   1. Verify page calls API → receives { token, user } JWT
 *   2. Verify page does window.postMessage({ type: CASPER_AUTH_HANDOFF, payload }, origin)
 *   3. This script listens, validates origin, forwards to service worker
 *   4. SW stores in chrome.storage.local
 *
 * Security note (MVP): another extension's content script on the same page could
 * theoretically also receive the postMessage. We accept this risk for v1; M7 will
 * add a nonce handshake.
 */
import { WEB_AUTH_MESSAGE_TYPE } from '@casper/shared';

const ALLOWED_ORIGINS = ['http://localhost:3000'];

window.addEventListener('message', (event: MessageEvent) => {
  if (!ALLOWED_ORIGINS.includes(event.origin)) return;
  const data = event.data as { type?: unknown; payload?: unknown } | null;
  if (!data || typeof data !== 'object') return;
  if (data.type !== WEB_AUTH_MESSAGE_TYPE) return;
  const payload = data.payload as { token?: unknown; user?: unknown };
  if (typeof payload?.token !== 'string' || typeof payload?.user !== 'object') return;

  chrome.runtime.sendMessage(
    { type: 'AUTH_FROM_WEB', payload: { token: payload.token, user: payload.user } },
    () => {
      if (chrome.runtime.lastError) {
        console.error('[casper] auth handoff failed:', chrome.runtime.lastError.message);
      }
    },
  );
});

console.log('[casper] auth handoff listening');
export {};
