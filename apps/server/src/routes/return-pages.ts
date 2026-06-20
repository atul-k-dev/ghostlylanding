import { Router } from 'express';

/**
 * Tiny HTML pages served by the server itself, used as Stripe Checkout
 * success_url and cancel_url. These live here (not on the landing site)
 * so the marketing/landing app has zero billing surface area.
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
      'AI comments and both platforms are unlocked. You can close this tab and return to the Ghostly247 extension — it updates automatically.',
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
