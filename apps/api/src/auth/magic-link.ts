import { randomBytes, createHash } from 'node:crypto';
import { MagicLinkModel } from '../models/magic-link.model.js';
import { config } from '../config.js';

const TOKEN_BYTES = 32;

export const hashToken = (raw: string): string =>
  createHash('sha256').update(raw).digest('hex');

export const generateMagicLink = async (
  email: string,
): Promise<{ rawToken: string; verifyUrl: string; expiresAt: Date }> => {
  const rawToken = randomBytes(TOKEN_BYTES).toString('base64url');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + config.magicLinkTtlMinutes * 60 * 1000);

  await MagicLinkModel.create({ email: email.toLowerCase(), tokenHash, expiresAt });

  const verifyUrl = `${config.webBaseUrl}/auth/verify?token=${encodeURIComponent(rawToken)}`;
  return { rawToken, verifyUrl, expiresAt };
};

export const consumeMagicLink = async (
  rawToken: string,
): Promise<{ email: string } | null> => {
  const tokenHash = hashToken(rawToken);
  const doc = await MagicLinkModel.findOne({ tokenHash });
  if (!doc) return null;
  if (doc.usedAt) return null;
  if (doc.expiresAt.getTime() < Date.now()) return null;

  doc.usedAt = new Date();
  await doc.save();

  return { email: doc.email };
};
