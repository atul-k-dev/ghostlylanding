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
  jwtSecret: optional('JWT_SECRET'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '30d'),
  magicLinkTtlMinutes: Number(required('MAGIC_LINK_TTL_MINUTES', '15')),
  allowedOrigins: required('ALLOWED_ORIGINS', 'http://localhost:3000')
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
  stripeSecretKey: optional('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: optional('STRIPE_WEBHOOK_SECRET'),
  stripePrices: {
    monthly: optional('STRIPE_PRICE_MONTHLY'),
    quarterly: optional('STRIPE_PRICE_QUARTERLY'),
    annual: optional('STRIPE_PRICE_ANNUAL'),
  },
} as const;

export const isProd = config.env === 'production';
