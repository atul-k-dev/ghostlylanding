/**
 * Stripe checkout return page (server's `/r/success`) content script.
 *
 * Stripe can't redirect into the extension, only to a web page — so this tiny
 * script runs ON that page and tells the background worker we're done. The
 * worker then refreshes the (now Pro) user, closes this tab, and re-opens the
 * popup, landing the user back in Ghostly247. Messaging reliably wakes the
 * service worker even if Chrome evicted it during the (slow) checkout.
 */
if (location.pathname.startsWith('/r/success')) {
  const sessionId = new URLSearchParams(location.search).get('session_id') ?? undefined;
  try {
    chrome.runtime.sendMessage({ type: 'CHECKOUT_RETURN', payload: { sessionId } });
  } catch {
    /* extension reloading — the background onUpdated listener is the backup */
  }
}

export {};
