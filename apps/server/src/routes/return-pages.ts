import { Router } from 'express';
import { UserModel } from '../models/user.model.js';
import { verifyUnsubToken } from '../email/unsubscribe.js';

/**
 * Tiny HTML pages served by the server itself, used as Stripe Checkout
 * success_url and cancel_url (and the daily-recap email unsubscribe link).
 * These live here (not on the landing site) so the marketing/landing app has
 * zero billing surface area.
 */
export const returnPagesRouter = Router();

const page = (emoji: string, title: string, body: string, footer?: string): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>${title}</title>
  <style>
    html, body { margin: 0; padding: 0; background: #0e0e0e; color: #fff;
      font: 16px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
    main { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
    .card { width: 100%; max-width: 380px; padding: 32px; border-radius: 24px;
      background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1);
      text-align: center; backdrop-filter: blur(8px); }
    .emoji { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 20px; font-weight: 600; margin: 0 0 8px; }
    p { color: rgba(255,255,255,0.6); font-size: 14px; margin: 0; }
    .footer { margin-top: 24px; font-size: 11px; color: rgba(255,255,255,0.4); }
  </style>
</head>
<body>
  <main>
    <div class="card">
      <div class="emoji" aria-hidden="true">${emoji}</div>
      <h1>${title}</h1>
      <p>${body}</p>
      ${footer ? `<p class="footer">${footer}</p>` : ''}
    </div>
  </main>
</body>
</html>`;

returnPagesRouter.get('/success', (_req, res) => {
  res.type('html').send(
    page(
      '🎉',
      "You're Pro!",
      'Payment received — taking you back to Ghostly247. This tab will close on its own; if it doesn’t, you can close it and reopen the extension (it updates automatically).',
      'Need a receipt or want to change your subscription? Open the extension → Settings → Plan → Manage.',
    ),
  );
});

returnPagesRouter.get('/cancel', (_req, res) => {
  res.type('html').send(
    page(
      '👋',
      'No worries, take your time.',
      "Your free plan stays active. Whenever you're ready, open the extension and pick Upgrade again.",
    ),
  );
});

// One-click unsubscribe from a digest email (daily or weekly, updateplan 4.4).
// The link carries a signed token (HMAC of the user id) so only the real
// recipient can flip it, plus which digest to turn off — the same route for
// both rather than a second one, per the plan.
returnPagesRouter.get('/email/unsubscribe', (req, res) => {
  const u = typeof req.query.u === 'string' ? req.query.u : '';
  const t = typeof req.query.t === 'string' ? req.query.t : '';
  // Absent `k` means a link sent before 4.4 — those were always daily.
  const kind = req.query.k === 'weekly' ? 'weekly' : 'daily';
  if (!u || !t || !verifyUnsubToken(u, t)) {
    res
      .status(400)
      .type('html')
      .send(page('⚠️', 'Invalid link', 'This unsubscribe link is invalid or has expired.'));
    return;
  }
  const field = kind === 'weekly' ? 'preferences.weeklyDigest' : 'preferences.dailyDigest';
  const noun = kind === 'weekly' ? 'weekly recap' : 'daily recap';
  void UserModel.updateOne({ _id: u }, { $set: { [field]: false } })
    .then(() => {
      res.type('html').send(
        page(
          '✅',
          'Unsubscribed',
          `You won't get ${noun} emails anymore. You can turn them back on anytime from the extension settings.`,
        ),
      );
    })
    .catch(() => {
      res
        .status(500)
        .type('html')
        .send(page('⚠️', 'Something went wrong', 'Please try again in a moment, or contact support.'));
    });
});
