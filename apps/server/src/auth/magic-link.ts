import { randomInt, createHash } from 'node:crypto';
import { MagicLinkModel } from '../models/magic-link.model.js';
import { config } from '../config.js';

const MAX_ATTEMPTS = 5;

export const hashToken = (raw: string): string =>
  createHash('sha256').update(raw).digest('hex');

const generateSixDigitCode = (): string =>
  // 100000..999999 — uniform across all 6-digit codes
  String(randomInt(100_000, 1_000_000));

/**
 * Generate a 6-digit sign-in code, store its hash, return the raw code so the
 * caller can email it. Multiple unused codes per email are fine — verify picks
 * the most recent.
 */
export const generateAuthCode = async (
  email: string,
): Promise<{ code: string; expiresAt: Date }> => {
  const code = generateSixDigitCode();
  const tokenHash = hashToken(code);
  const expiresAt = new Date(Date.now() + config.magicLinkTtlMinutes * 60 * 1000);
  await MagicLinkModel.create({
    email: email.toLowerCase(),
    tokenHash,
    expiresAt,
    attempts: 0,
  });
  return { code, expiresAt };
};

/**
 * Verify a user-typed code against the latest unused doc for an email.
 * Increments the attempt counter on mismatch; locks the doc after MAX_ATTEMPTS.
 */
export const consumeAuthCode = async (
  email: string,
  code: string,
): Promise<{ ok: true } | { ok: false; reason: 'expired' | 'invalid' | 'locked' }> => {
  const normalized = email.toLowerCase();
  const tokenHash = hashToken(code);

  const doc = await MagicLinkModel.findOne({ email: normalized, usedAt: null })
    .sort({ createdAt: -1 })
    .exec();
  if (!doc) return { ok: false, reason: 'invalid' };

  if (doc.expiresAt.getTime() < Date.now()) {
    return { ok: false, reason: 'expired' };
  }
  if ((doc.attempts ?? 0) >= MAX_ATTEMPTS) {
    return { ok: false, reason: 'locked' };
  }

  if (doc.tokenHash !== tokenHash) {
    doc.attempts = (doc.attempts ?? 0) + 1;
    await doc.save();
    return { ok: false, reason: 'invalid' };
  }

  doc.usedAt = new Date();
  await doc.save();
  return { ok: true };
};
