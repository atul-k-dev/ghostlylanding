import { Resend } from 'resend';
import { config } from '../config.js';
import { logger } from '../logger.js';

const client = config.resendApiKey ? new Resend(config.resendApiKey) : null;

interface SendMagicLinkArgs {
  to: string;
  verifyUrl: string;
  ttlMinutes: number;
}

export const sendMagicLinkEmail = async ({
  to,
  verifyUrl,
  ttlMinutes,
}: SendMagicLinkArgs): Promise<{ delivered: boolean; via: 'resend' | 'console' }> => {
  if (!client || !config.resendFromEmail) {
    logger.warn(
      { to, verifyUrl, ttlMinutes },
      '[dev] Resend not configured — magic link printed to console only',
    );
    return { delivered: true, via: 'console' };
  }

  const { error } = await client.emails.send({
    from: config.resendFromEmail,
    to,
    subject: 'Your Casper sign-in link 👻',
    html: buildHtml(verifyUrl, ttlMinutes),
    text: buildText(verifyUrl, ttlMinutes),
  });

  if (error) {
    logger.error({ error, to }, 'resend send failed');
    throw new Error(`Failed to send magic link: ${error.message}`);
  }

  return { delivered: true, via: 'resend' };
};

const buildHtml = (verifyUrl: string, ttl: number): string => `
  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a2e">
    <h1 style="font-size:24px;margin-bottom:8px">Welcome to Casper 👻</h1>
    <p style="font-size:14px;color:#555">Click below to sign in. This link expires in ${ttl} minutes.</p>
    <a href="${verifyUrl}"
       style="display:inline-block;margin-top:16px;background:#7c5cff;color:#fff;padding:12px 24px;
              border-radius:12px;text-decoration:none;font-weight:600">
      Sign in to Casper
    </a>
    <p style="font-size:12px;color:#888;margin-top:24px">
      If you didn't request this, you can safely ignore it.
    </p>
  </div>
`;

const buildText = (verifyUrl: string, ttl: number): string =>
  `Welcome to Casper.\n\nSign in: ${verifyUrl}\n(Link expires in ${ttl} minutes.)`;
