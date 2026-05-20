/**
 * Casper background service worker.
 * Owns the action queue, scheduling engine, and message routing (M3+).
 * In M0 it only proves the popup → SW → API → SW → popup roundtrip.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[casper] installed', details.reason);
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
    sendResponse({ ok: false, error: 'invalid_message' });
    return false;
  }

  if (message.type === 'GET_API_URL') {
    sendResponse({ type: 'API_URL', payload: { apiUrl: API_BASE_URL } });
    return false;
  }

  if (message.type === 'PING') {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/health`);
        const body = (await res.json()) as { ok: boolean; data?: { timestamp: string } };
        const timestamp = body.ok && body.data ? body.data.timestamp : new Date().toISOString();
        sendResponse({
          type: 'PONG',
          payload: { apiOk: body.ok === true, timestamp },
        });
      } catch (error) {
        sendResponse({
          type: 'PONG',
          payload: {
            apiOk: false,
            timestamp: new Date().toISOString(),
            error: error instanceof Error ? error.message : String(error),
          },
        });
      }
    })();
    return true; // keep channel open for async sendResponse
  }

  sendResponse({ ok: false, error: 'unknown_message_type' });
  return false;
});

export {};
