/**
 * Single source of truth for "where the install button sends the user."
 * Defaults to the published Chrome Web Store listing. Override with
 * NEXT_PUBLIC_CHROME_WEB_STORE_URL for staging/testing.
 */
export const CHROME_WEB_STORE_URL =
  'https://chromewebstore.google.com/detail/ghostly247-%E2%80%94-twitterx-gro/olfnjmpoacjchlklmdlaimpckblmokga';

export const INSTALL_URL =
  process.env.NEXT_PUBLIC_CHROME_WEB_STORE_URL?.trim() || CHROME_WEB_STORE_URL;
