import { useState } from 'react';
import { sendToBackground } from '../../lib/messages.js';
import { ForgotPassword } from './ForgotPassword.js';

type Mode = 'login' | 'signup';
type Status = 'idle' | 'submitting' | 'googling';

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const GOOGLE_CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

const inputCls =
  'w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-3 py-1.5 text-sm text-casper-ink placeholder-casper-ink/30 focus:border-casper-violet focus:outline-none focus:ring-2 focus:ring-casper-violet/20';
const labelCls = 'mb-0.5 block text-[11px] font-medium text-casper-ink/70';

export const LoggedOut = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [view, setView] = useState<'auth' | 'forgot'>('auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  if (view === 'forgot') {
    return <ForgotPassword initialEmail={email} onBack={() => setView('auth')} />;
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
    <div className="flex min-h-[300px] w-full">
      {/* LEFT — brand panel */}
      <aside className="flex w-[150px] flex-none flex-col justify-between border-r border-casper-border bg-casper-violet/5 p-4">
        <div>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-casper-violet text-xl text-white">
            👻
          </div>
          <h1 className="text-base font-semibold leading-tight">
            {mode === 'login' ? 'Welcome to Casper' : 'Create your account'}
          </h1>
          <p className="mt-1 text-[11px] leading-relaxed text-casper-ink/60">
            {mode === 'login'
              ? 'Sign in to pick up where you left off.'
              : 'Free to start — no card needed.'}
          </p>
        </div>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
          v0.0.1 · safe by default
        </p>
      </aside>

      {/* RIGHT — auth controls */}
      <div className="flex flex-1 flex-col p-4">
        {/* Mode tabs */}
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-xl bg-casper-ink/5 p-1">
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
              className={`rounded-lg px-3 py-1 text-[11px] font-medium transition ${
                mode === m
                  ? 'bg-white/10 text-casper-ink'
                  : 'text-casper-ink/60 hover:text-casper-ink'
              }`}
            >
              {m === 'login' ? 'Sign in' : 'Sign up'}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="flex flex-col gap-2">
          {mode === 'signup' && (
            <div>
              <label htmlFor="name" className={labelCls}>
                Name
              </label>
              <input
                id="name"
                type="text"
                autoComplete="name"
                required
                disabled={busy}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className={inputCls}
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className={labelCls}>
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete={mode === 'signup' ? 'email' : 'username'}
              required
              disabled={busy}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="password" className={labelCls}>
              Password
            </label>
            <div className="relative">
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
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                disabled={busy}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-casper-ink/40 transition hover:text-casper-ink/70 disabled:opacity-50"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>
          </div>
          {mode === 'login' && (
            <div className="-mt-1 text-right">
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  setError(null);
                  setView('forgot');
                }}
                className="text-[11px] text-casper-violet hover:underline disabled:opacity-50"
              >
                Forgot password?
              </button>
            </div>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-casper-violet px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {status === 'submitting'
              ? mode === 'signup'
                ? 'Creating account…'
                : 'Signing in…'
              : mode === 'signup'
                ? 'Create account'
                : 'Sign in'}
          </button>
          {error && <p className="text-xs text-rose-400">✗ {error}</p>}
        </form>

        {/* OR divider */}
        <div className="my-2 flex items-center gap-3">
          <div className="h-px flex-1 bg-casper-ink/10" />
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
            or
          </span>
          <div className="h-px flex-1 bg-casper-ink/10" />
        </div>

        <button
          type="button"
          onClick={continueWithGoogle}
          disabled={busy || !GOOGLE_CONFIGURED}
          title={!GOOGLE_CONFIGURED ? 'VITE_GOOGLE_CLIENT_ID is not set' : undefined}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-casper-ink/10 bg-casper-surface px-3 py-2 text-sm font-medium text-casper-ink transition hover:bg-white/5 disabled:opacity-50"
        >
          <GoogleIcon />
          {status === 'googling' ? 'Opening Google…' : 'Continue with Google'}
        </button>
      </div>
    </div>
  );
};

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
