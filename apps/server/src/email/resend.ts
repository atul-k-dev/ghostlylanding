/**
 * Thin Resend wrapper. When Resend isn't configured (no API key / from email)
 * we log the message instead of throwing — handy for local dev so password
 * reset still works end-to-end without an email provider.
 */
import { Resend } from 'resend';
import { config } from '../config.js';
import { logger } from '../logger.js';

let cached: Resend | null = null;

const getResend = (): Resend | null => {
  if (!config.resendApiKey || !config.resendFromEmail) return null;
  if (!cached) cached = new Resend(config.resendApiKey);
  return cached;
};

export const isEmailConfigured = (): boolean =>
  Boolean(config.resendApiKey && config.resendFromEmail);

interface SendArgs {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export const sendEmail = async ({ to, subject, html, text }: SendArgs): Promise<void> => {
  const resend = getResend();
  if (!resend) {
    // Dev fallback: surface the content in logs so the flow is testable.
    logger.warn({ to, subject, text }, '[email] Resend not configured — logging instead of sending');
    return;
  }
  const { error } = await resend.emails.send({
    from: config.resendFromEmail!,
    to,
    subject,
    html,
    text,
  });
  if (error) {
    throw new Error(`Resend send failed: ${error.message}`);
  }
};

/** Branded password-reset email carrying a short-lived 6-digit code. */
export const sendPasswordResetCode = async (
  to: string,
  code: string,
  ttlMinutes: number,
): Promise<void> => {
  const subject = 'Your Ghostly247 password reset code 👻';
  const text = `Your Ghostly247 password reset code is ${code}. It expires in ${ttlMinutes} minutes. If you didn't request this, you can safely ignore this email.`;
  const html = `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:440px;margin:0 auto;padding:24px;color:#1f2333">
    <div style="font-size:28px">👻</div>
    <h1 style="font-size:18px;margin:12px 0 8px">Reset your Ghostly247 password</h1>
    <p style="font-size:14px;color:#4b5066;line-height:1.5;margin:0 0 16px">
      Use this code to set a new password. It expires in ${ttlMinutes} minutes.
    </p>
    <div style="font-size:32px;font-weight:700;letter-spacing:8px;background:#fdecee;color:#f44d60;border-radius:12px;padding:16px;text-align:center">
      ${code}
    </div>
    <p style="font-size:12px;color:#8a8fa3;line-height:1.5;margin:16px 0 0">
      Didn't request this? You can safely ignore this email — your password won't change.
    </p>
  </div>`;
  await sendEmail({ to, subject, html, text });
};
