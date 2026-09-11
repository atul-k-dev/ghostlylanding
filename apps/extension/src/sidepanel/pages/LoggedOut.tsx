import { useEffect, useState } from 'react';
import { sendToBackground } from '../../lib/messages.js';
import { getPendingReset } from '../../lib/storage.js';
import { ForgotPassword } from './ForgotPassword.js';

type Mode = 'login' | 'signup';
type Status = 'idle' | 'submitting' | 'googling';

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const GOOGLE_CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

// Shared field styling — dark inset, hairline border, coral focus ring, room on
// the left for the leading icon.
export const fieldCls =
  'h-10 w-full rounded-lg border border-casper-border bg-casper-surface-2 pl-10 pr-4 text-sm text-casper-ink placeholder-casper-ink/30 transition focus:border-casper-coral focus:outline-none focus:ring-2 focus:ring-casper-coral/25 disabled:opacity-60';
export const labelCls = 'mb-1.5 block text-[13px] font-medium text-casper-ink';
export const leadingIconCls =
  'pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-casper-ink/40';
export const primaryBtnCls =
  'h-10 w-full rounded-lg bg-casper-coral text-sm font-semibold text-casper-on-coral transition hover:bg-casper-coral-bright disabled:opacity-50';

export const LoggedOut = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [view, setView] = useState<'auth' | 'forgot'>('auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resumeReset, setResumeReset] = useState(false);
  const [booted, setBooted] = useState(false);

  // If the popup was closed mid-reset (e.g. while fetching the OTP from email),
  // reopen straight at the code-entry step instead of the sign-in screen.
  useEffect(() => {
    void getPendingReset().then((p) => {
      if (p) {
        setEmail(p.email);
        setResumeReset(true);
        setView('forgot');
      }
      setBooted(true);
    });
  }, []);

  // Hold the first paint until the pending-reset check resolves, so we never
  // flash the sign-in form before flipping to the reset step.
  if (!booted) return <div className="w-[600px] min-h-[400px] bg-casper-bg" />;

  if (view === 'forgot') {
    return (
      <ForgotPassword
        initialEmail={email}
        resume={resumeReset}
        onBack={() => {
          setResumeReset(false);
          setView('auth');
        }}
      />
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError('That email doesn’t look right.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (mode === 'signup' && name.trim().length < 1) {
      setError('Please tell us your name.');
      return;
    }
    setStatus('submitting');
    try {
      const resp = await sendToBackground<{
        type: 'AUTH_RESULT';
        payload: { ok: boolean; error?: string };
      }>(
        mode === 'signup'
          ? { type: 'SIGNUP', payload: { name: name.trim(), email, password } }
          : { type: 'LOGIN', payload: { email, password } },
      );
      if (!resp.payload.ok) {
        setError(resp.payload.error ?? (mode === 'signup' ? 'Sign-up failed.' : 'Sign-in failed.'));
        setStatus('idle');
        return;
      }
      // Popup auto-flips via chrome.storage.onChanged listener
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setStatus('idle');
    }
  };

  const continueWithGoogle = async () => {
    setError(null);
    setStatus('googling');
    try {
      const resp = await sendToBackground<{
        type: 'AUTH_RESULT';
        payload: { ok: boolean; error?: string };
      }>({ type: 'GOOGLE_LOGIN', payload: {} });
      if (!resp.payload.ok) {
        setError(resp.payload.error ?? 'Google sign-in failed.');
        setStatus('idle');
        return;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setStatus('idle');
    }
  };

  const busy = status !== 'idle';

  return (
    <div className="flex w-[600px] min-h-[400px] bg-casper-bg">
      <BrandPanel
        title={mode === 'login' ? 'Welcome to Ghostly247' : 'Create your account'}
        subtitle={
          mode === 'login'
            ? 'Sign in to pick up where you left off.'
            : 'Free to start — no card needed.'
        }
        footer={
          <p className="font-mono text-[10px] tracking-[0.12em] text-casper-muted">
            v0.0.1 • RUNS IN YOUR BROWSER
          </p>
        }
      />

      {/* RIGHT — auth controls */}
      <div className="flex flex-1 flex-col justify-center px-7 py-6">
        {/* Underline tabs */}
        <div className="mb-5 flex border-b border-casper-border">
          {(['login', 'signup'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                if (!busy) {
                  setMode(m);
                  setError(null);
                }
              }}
              disabled={busy}
              className={`-mb-px flex-1 border-b-2 pb-2.5 text-center text-sm transition disabled:opacity-60 ${
                mode === m
                  ? 'border-casper-coral font-semibold text-casper-ink'
                  : 'border-transparent font-medium text-casper-muted hover:text-casper-ink'
              }`}
            >
              {m === 'login' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-3.5">
          {mode === 'signup' && (
            <div>
              <label htmlFor="name" className={labelCls}>
                Name
              </label>
              <div className="relative">
                <span className={leadingIconCls}>
                  <UserIcon />
                </span>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  disabled={busy}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                  className={fieldCls}
                />
              </div>
            </div>
          )}
          <div>
            <label htmlFor="email" className={labelCls}>
              Email
            </label>
            <div className="relative">
              <span className={leadingIconCls}>
                <MailIcon />
              </span>
              <input
                id="email"
                type="email"
                autoComplete={mode === 'signup' ? 'email' : 'username'}
                required
                disabled={busy}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={fieldCls}
              />
            </div>
          </div>
          <div>
            <label htmlFor="password" className={labelCls}>
              Password
            </label>
            <div className="relative">
              <span className={leadingIconCls}>
                <LockIcon />
              </span>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                required
                minLength={8}
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
                className={`${fieldCls} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={busy}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                tabIndex={-1}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-casper-ink/40 transition hover:text-casper-ink/80 disabled:opacity-50"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
            {mode === 'login' && (
              <div className="mt-1.5 text-right">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setError(null);
                    setView('forgot');
                  }}
                  className="text-sm font-medium text-casper-coral transition hover:text-casper-coral-bright disabled:opacity-50"
                >
                  Forgot password?
                </button>
              </div>
            )}
          </div>
          <button type="submit" disabled={busy} className={primaryBtnCls}>
            {status === 'submitting'
              ? mode === 'signup'
                ? 'Creating account…'
                : 'Signing in…'
              : mode === 'signup'
                ? 'Sign up'
                : 'Sign in'}
          </button>
          {error && <p className="text-sm text-rose-400">✗ {error}</p>}
        </form>

        {/* OR divider */}
        <div className="my-3.5 flex items-center gap-3">
          <div className="h-px flex-1 bg-casper-border" />
          <span className="text-xs font-medium tracking-wide text-casper-muted">OR</span>
          <div className="h-px flex-1 bg-casper-border" />
        </div>

        <button
          type="button"
          onClick={continueWithGoogle}
          disabled={busy || !GOOGLE_CONFIGURED}
          title={!GOOGLE_CONFIGURED ? 'VITE_GOOGLE_CLIENT_ID is not set' : undefined}
          className="flex h-10 w-full items-center justify-center gap-2.5 rounded-lg border border-casper-border bg-casper-surface text-sm font-semibold text-casper-ink transition hover:bg-white/5 disabled:opacity-50"
        >
          <GoogleIcon />
          {status === 'googling' ? 'Opening Google…' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
};

/**
 * Left brand panel — coral ghost, headline, and a nighttime scene (moon, hills,
 * pines, stars) rendered as inline SVG so it needs no image asset. Shared by the
 * sign-in and reset views.
 */
export const BrandPanel = ({
  title,
  subtitle,
  footer,
}: {
  title: string;
  subtitle: string;
  footer: React.ReactNode;
}) => (
  <aside
    className="relative w-[208px] flex-none overflow-hidden border-r border-casper-border"
    style={{ background: 'linear-gradient(165deg, #2c1117 0%, #1a0b10 46%, #0e0e0e 100%)' }}
  >
    <NightScene />
    <div className="relative z-10 flex h-full flex-col justify-between p-5">
      <div>
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-casper-coral shadow-lg shadow-casper-coral/30">
          <img
            src={chrome.runtime.getURL('ghostly247logo.png')}
            alt="Ghostly247"
            className="h-8 w-8 object-contain"
          />
        </div>
        <h1 className="text-xl font-bold leading-tight text-white">{title}</h1>
        <p className="mt-1.5 text-xs leading-relaxed text-casper-muted">{subtitle}</p>
      </div>
      {footer}
    </div>
  </aside>
);

/** Decorative nighttime scene for the brand panel. */
const NightScene = () => (
  <svg
    className="pointer-events-none absolute inset-0 h-full w-full"
    viewBox="0 0 224 520"
    preserveAspectRatio="xMidYMax slice"
    aria-hidden="true"
  >
    <defs>
      <radialGradient id="casper-moon" cx="50%" cy="42%" r="60%">
        <stop offset="0%" stopColor="#ffe2e5" />
        <stop offset="55%" stopColor="#f87f8a" />
        <stop offset="100%" stopColor="#f44d60" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* stars */}
    <g fill="#ffffff">
      <circle cx="150" cy="70" r="1.4" opacity="0.7" />
      <circle cx="188" cy="128" r="1" opacity="0.5" />
      <circle cx="58" cy="150" r="1" opacity="0.45" />
      <circle cx="120" cy="44" r="1.1" opacity="0.6" />
      <circle cx="196" cy="210" r="1" opacity="0.4" />
    </g>
    {/* sparkles */}
    <g fill="#f8b3ba" opacity="0.85">
      <path d="M172 96 l2 5.5 l5.5 2 l-5.5 2 l-2 5.5 l-2 -5.5 l-5.5 -2 l5.5 -2 z" />
      <path d="M96 120 l1.6 4.4 l4.4 1.6 l-4.4 1.6 l-1.6 4.4 l-1.6 -4.4 l-4.4 -1.6 l4.4 -1.6 z" />
    </g>
    {/* moon */}
    <circle cx="74" cy="362" r="36" fill="url(#casper-moon)" />
    {/* hills */}
    <path d="M0 404 Q56 362 122 392 T224 376 L224 520 L0 520 Z" fill="#7a2230" opacity="0.5" />
    <path d="M0 446 Q72 408 152 436 T224 428 L224 520 L0 520 Z" fill="#3f1219" opacity="0.96" />
    {/* pine trees */}
    <g fill="#23090e">
      <path d="M34 476 l10 -30 l10 30 z" />
      <path d="M50 476 l7 -20 l7 20 z" />
      <path d="M150 470 l9 -25 l9 25 z" />
    </g>
  </svg>
);

export const MailIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const LockIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="4.5" y="10.5" width="15" height="9.5" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const UserIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="12" cy="8" r="3.6" stroke="currentColor" strokeWidth="1.8" />
    <path d="M5 20a7 7 0 0 1 14 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

export const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

export const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M10.6 5.1A9.8 9.8 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-2.2 3.1M6.6 6.6A17 17 0 0 0 2 12s3.5 7 10 7a9.8 9.8 0 0 0 5.4-1.6M9.9 9.9a3 3 0 0 0 4.2 4.2"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path d="m3 3 18 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const GoogleIcon = () => (
  <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
    <path
      d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      fill="#4285F4"
    />
    <path
      d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z"
      fill="#34A853"
    />
    <path
      d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
      fill="#FBBC05"
    />
    <path
      d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
      fill="#EA4335"
    />
  </svg>
);
