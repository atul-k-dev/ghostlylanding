/**
 * Single source of truth for "where the install button sends the user."
 * Set NEXT_PUBLIC_CHROME_WEB_STORE_URL when the extension is published; until
 * then we fall back to a #install anchor so the marketing page works locally.
 */
export const INSTALL_URL =
  process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL?.trim() || '#install';
