import { useState } from 'react';
import { sendToBackground } from '../../lib/messages.js';

type Mode = 'login' | 'signup';
type Status = 'idle' | 'submitting' | 'googling';

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const GOOGLE_CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export const LoggedOut = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

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
    <div className="flex flex-col p-6 min-h-[480px]">
      <header className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-casper-violet text-white text-xl">
          👻
        </div>
        <div>
          <h1 className="text-lg font-semibold">Welcome to Casper</h1>
          <p className="text-xs text-casper-ink/60">
            {mode === 'login' ? 'Sign in to your account.' : 'Create your free account.'}
          </p>
        </div>
      </header>

      {/* Mode tabs */}
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-casper-ink/5 p-1">
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
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              mode === m
                ? 'bg-white text-casper-ink shadow-sm'
                : 'text-casper-ink/60 hover:text-casper-ink'
            }`}
          >
            {m === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-sm">
        {mode === 'signup' && (
          <>
            <label htmlFor="name" className="mb-1 block text-xs font-medium text-casper-ink/70">
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
              className="mb-3 w-full rounded-xl border border-casper-ink/10 bg-casper-cloud px-3 py-2 text-sm text-casper-ink placeholder-casper-ink/30 focus:border-casper-violet focus:outline-none focus:ring-2 focus:ring-casper-violet/20"
            />
          </>
        )}
        <label htmlFor="email" className="mb-1 block text-xs font-medium text-casper-ink/70">
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
          className="mb-3 w-full rounded-xl border border-casper-ink/10 bg-casper-cloud px-3 py-2 text-sm text-casper-ink placeholder-casper-ink/30 focus:border-casper-violet focus:outline-none focus:ring-2 focus:ring-casper-violet/20"
        />
        <label htmlFor="password" className="mb-1 block text-xs font-medium text-casper-ink/70">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          required
          minLength={8}
          disabled={busy}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
          className="mb-3 w-full rounded-xl border border-casper-ink/10 bg-casper-cloud px-3 py-2 text-sm text-casper-ink placeholder-casper-ink/30 focus:border-casper-violet focus:outline-none focus:ring-2 focus:ring-casper-violet/20"
        />
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-casper-violet px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {status === 'submitting'
            ? mode === 'signup'
              ? 'Creating account…'
              : 'Signing in…'
            : mode === 'signup'
              ? 'Create account'
              : 'Sign in'}
        </button>
        {error && <p className="mt-3 text-xs text-rose-600">✗ {error}</p>}
      </form>

      {/* OR divider */}
      <div className="my-4 flex items-center gap-3">
        <div className="h-px flex-1 bg-casper-ink/10" />
        <span className="text-[10px] uppercase tracking-wider text-casper-ink/40">or</span>
        <div className="h-px flex-1 bg-casper-ink/10" />
      </div>

      <button
        type="button"
        onClick={continueWithGoogle}
        disabled={busy || !GOOGLE_CONFIGURED}
        title={!GOOGLE_CONFIGURED ? 'VITE_GOOGLE_CLIENT_ID is not set' : undefined}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-casper-ink/10 bg-white px-3 py-2 text-sm font-medium text-casper-ink transition hover:bg-casper-cloud disabled:opacity-50"
      >
        <GoogleIcon />
        {status === 'googling' ? 'Opening Google…' : 'Continue with Google'}
      </button>

      <p className="mt-4 text-center text-[10px] leading-relaxed text-casper-ink/40">
        By continuing you agree to Casper’s terms. We never post without your say-so.
      </p>

      <footer className="mt-auto pt-4 text-center text-[10px] text-casper-ink/40">
        v0.0.1 · safe by default
      </footer>
    </div>
  );
};

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
