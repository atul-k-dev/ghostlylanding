/**
 * Run the Google OAuth implicit flow inside the extension via
 * chrome.identity.launchWebAuthFlow. Returns the raw id_token (a JWT) which
 * the backend then verifies against the same audience.
 *
 * Requires:
 *   - "identity" permission in the manifest
 *   - VITE_GOOGLE_CLIENT_ID set
 *   - The OAuth client's authorized redirect URI configured to:
 *       https://<extension-id>.chromiumapp.org/
 */

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

const randomNonce = (): string => {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

export const isGoogleSignInConfigured = (): boolean => Boolean(GOOGLE_CLIENT_ID);

export const fetchGoogleIdToken = async (): Promise<string> => {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID is not set in the extension build');
  }
  const redirectUri = chrome.identity.getRedirectURL();
  const state = randomNonce();
  const nonce = randomNonce();

  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set('client_id', GOOGLE_CLIENT_ID);
  url.searchParams.set('response_type', 'id_token');
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  url.searchParams.set('nonce', nonce);
  url.searchParams.set('prompt', 'select_account');

  const redirected = await chrome.identity.launchWebAuthFlow({
    url: url.toString(),
    interactive: true,
  });
  if (!redirected) throw new Error('Google sign-in was cancelled');

  // Google returns params in the fragment (#access_token=…&id_token=…&state=…)
  const hashIdx = redirected.indexOf('#');
  if (hashIdx === -1) throw new Error('Google did not return a token');
  const params = new URLSearchParams(redirected.slice(hashIdx + 1));
  if (params.get('state') !== state) {
    throw new Error('Google sign-in state mismatch');
  }
  const idToken = params.get('id_token');
  if (!idToken) throw new Error('Google did not return an id_token');
  return idToken;
};
