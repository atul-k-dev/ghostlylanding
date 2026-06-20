import { OAuth2Client } from 'google-auth-library';
import { config } from '../config.js';

let cached: OAuth2Client | null = null;

const getClient = (): OAuth2Client => {
  if (cached) return cached;
  if (!config.googleClientId) {
    throw new Error('GOOGLE_CLIENT_ID is not set');
  }
  cached = new OAuth2Client(config.googleClientId);
  return cached;
};

export const hasGoogle = (): boolean => Boolean(config.googleClientId);

export interface VerifiedGoogleUser {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
}

/**
 * Verify a Google ID token (JWT) issued for our OAuth client. Throws on any
 * signature/audience/expiry mismatch.
 */
export const verifyGoogleIdToken = async (idToken: string): Promise<VerifiedGoogleUser> => {
  const ticket = await getClient().verifyIdToken({
    idToken,
    audience: config.googleClientId,
  });
  const payload = ticket.getPayload();
  if (!payload) throw new Error('google id token had no payload');
  if (!payload.sub) throw new Error('google id token missing sub');
  if (!payload.email) throw new Error('google id token missing email');
  return {
    googleId: payload.sub,
    email: payload.email.toLowerCase(),
    emailVerified: payload.email_verified === true,
    name: payload.name?.trim() || payload.email.split('@')[0] || 'Ghostly247 user',
  };
};
