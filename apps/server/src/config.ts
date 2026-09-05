import 'dotenv/config';

const required = (name: string, fallback?: string): string => {
  const v = process.env[name] ?? fallback;
  if (v === undefined || v === '') {
    throw new Error(`Missing env var: ${name}`);
  }
  return v;
};

const optional = (name: string): string | undefined => {
  const v = process.env[name];
  return v === '' ? undefined : v;
};

export const config = {
  env: required('NODE_ENV', 'development'),
  port: Number(required('PORT', '4000')),
  logLevel: required('LOG_LEVEL', 'debug'),
  mongoUri: optional('MONGODB_URI'),
  // 10, not 50: on a shared Atlas cluster the ~500-connection ceiling is split
  // across every app pointed at it. A handful of projects each claiming 50 is
  // how you exhaust it — and then EVERY project on the cluster starts failing
  // to connect, including this one. This workload is short HTTP requests; 10 is
  // ample. Raise it only on a dedicated cluster.
  mongoMaxPool: Number(required('MONGO_MAX_POOL_SIZE', '10')),
  mongoMinPool: Number(required('MONGO_MIN_POOL_SIZE', '2')),
  jwtSecret: optional('JWT_SECRET'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '30d'),
  bcryptRounds: Number(required('BCRYPT_ROUNDS', '12')),
  googleClientId: optional('GOOGLE_CLIENT_ID'),
  // Dev default allows the landing page (3000) and the admin panel (3100).
  // In production set ALLOWED_ORIGINS to the deployed origins explicitly.
  allowedOrigins: required('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3100')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  openaiApiKey: optional('OPENAI_API_KEY'),
  resendApiKey: optional('RESEND_API_KEY'),
  resendFromEmail: optional('RESEND_FROM_EMAIL'),
  // Landing page base URL — used for the magic-link verify redirect.
  landingBaseUrl: required(
    'LANDING_BASE_URL',
    process.env.WEB_BASE_URL ?? 'http://localhost:3000',
  ),
  // Server's own public base URL — Stripe redirects to /r/* here.
  serverBaseUrl: required('SERVER_BASE_URL', `http://localhost:${process.env.PORT ?? '4000'}`),
  // Public origin that serves branded email assets (the logo). Defaults to the
  // live marketing site so images resolve in real inboxes without extra setup.
  emailAssetBaseUrl: required('EMAIL_ASSET_BASE_URL', 'https://ghostly247.com'),
  stripeSecretKey: optional('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: optional('STRIPE_WEBHOOK_SECRET'),
  stripePrices: {
    weekly: optional('STRIPE_PRICE_WEEKLY'),
    monthly: optional('STRIPE_PRICE_MONTHLY'),
  },
} as const;

export const isProd = config.env === 'production';
