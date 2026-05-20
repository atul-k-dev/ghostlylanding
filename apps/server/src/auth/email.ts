import { Resend } from 'resend';
import { config } from '../config.js';
import { logger } from '../logger.js';

const client = config.resendApiKey ? new Resend(config.resendApiKey) : null;

interface SendAuthCodeArgs {
  to: string;
  code: string;
  ttlMinutes: number;
}

export const sendAuthCodeEmail = async ({
  to,
  code,
  ttlMinutes,
}: SendAuthCodeArgs): Promise<{ delivered: boolean; via: 'resend' | 'console' }> => {
  if (!client || !config.resendFromEmail) {
    logger.warn(
      { to, code, ttlMinutes },
      '[dev] Resend not configured — sign-in code printed to console only',
    );
    return { delivered: true, via: 'console' };
  }

  const { error } = await client.emails.send({
    from: config.resendFromEmail,
    to,
    subject: `Your Casper sign-in code: ${code}`,
    html: buildHtml(code, ttlMinutes),
    text: buildText(code, ttlMinutes),
  });

  if (error) {
    logger.error({ error, to }, 'resend send failed');
    throw new Error(`Failed to send sign-in code: ${error.message}`);
  }

  return { delivered: true, via: 'resend' };
};

const buildHtml = (code: string, ttl: number): string => `
  <div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1a1a2e">
    <h1 style="font-size:24px;margin-bottom:8px">Welcome to Casper 👻</h1>
    <p style="font-size:14px;color:#555">Open the Casper extension and type this code in. It expires in ${ttl} minutes.</p>
    <p style="margin:24px 0;text-align:center;font-size:36px;letter-spacing:8px;font-weight:700;color:#7c5cff;font-family:ui-monospace,SFMono-Regular,monospace">
      ${code}
    </p>
    <p style="font-size:12px;color:#888;margin-top:24px">
      If you didn't request this, you can safely ignore it.
    </p>
  </div>
`;

const buildText = (code: string, ttl: number): string =>
  `Welcome to Casper.\n\nYour sign-in code: ${code}\n(Expires in ${ttl} minutes.)`;
