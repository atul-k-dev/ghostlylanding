import { useEffect, useState, type FormEvent } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight02Icon, LockPasswordIcon, Mail01Icon, UserIcon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { sendToBackground } from '../../lib/messages.js';
import { getPendingReset } from '../../lib/storage.js';
import { AuthCard, AuthShell, Divider, ErrorNote, Field, GoogleMark, PrimaryButton, StrengthMeter } from '../auth/kit';
import { ForgotPassword } from './ForgotPassword.js';

/**
 * Signed out: sign in, sign up, or reset a password — one column, sized for the
 * side panel. Google first (one tap, nothing to remember), email below it.
 * On success the background stores the session and the panel flips to Home by
 * itself through the auth storage listener in App.
 */
type Mode = 'login' | 'signup';
type Status = 'idle' | 'submitting' | 'googling';
type AuthResp = { type: 'AUTH_RESULT'; payload: { ok: boolean; error?: string } };

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const GOOGLE_CONFIGURED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

export const LoggedOut = () => {
  const [mode, setMode] = useState<Mode>('login');
  const [view, setView] = useState<'auth' | 'forgot'>('auth');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resumeReset, setResumeReset] = useState(false);
  const [booted, setBooted] = useState(false);

  // Closed mid-reset (e.g. to fetch the code from email)? Reopen at code entry.
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

  // Hold the first paint until that check resolves, so the sign-in form never flashes first.
  if (!booted) return <div className="h-full bg-canvas" />;

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

  const busy = status !== 'idle';
  const switchTo = (m: Mode) => {
    if (busy) return;
    setMode(m);
    setError(null);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (mode === 'signup' && !name.trim()) return setError('Tell us your name.');
    if (!isValidEmail(email)) return setError('That email doesn’t look right.');
    if (password.length < 8) return setError('Your password needs at least 8 characters.');
    setStatus('submitting');
    try {
      const resp = await sendToBackground<AuthResp>(
        mode === 'signup'
          ? { type: 'SIGNUP', payload: { name: name.trim(), email, password } }
          : { type: 'LOGIN', payload: { email, password } },
      );
      if (!resp.payload.ok) {
        setError(resp.payload.error ?? (mode === 'signup' ? 'Sign-up failed.' : 'Sign-in failed.'));
        setStatus('idle');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setStatus('idle');
    }
  };

  const google = async () => {
    setError(null);
    setStatus('googling');
    try {
      const resp = await sendToBackground<AuthResp>({ type: 'GOOGLE_LOGIN', payload: {} });
      if (!resp.payload.ok) {
        setError(resp.payload.error ?? 'Google sign-in failed.');
        setStatus('idle');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Google sign-in failed');
      setStatus('idle');
    }
  };

  return (
    <AuthShell
      title={mode === 'login' ? 'Welcome back' : 'Create your account'}
      subtitle={mode === 'login' ? 'Sign in and Ghostly picks up where it left off.' : 'Free to start — no card needed.'}
    >
      {/* Sign in / Sign up */}
      <div className="mb-4 grid grid-cols-2 rounded-full bg-card p-1 shadow-sm ring-1 ring-[color:var(--card-ring)]" role="tablist">
        {(['login', 'signup'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => switchTo(m)}
            className={cn(
              'h-10 cursor-pointer rounded-full text-sm font-semibold transition-colors',
              mode === m ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        ))}
      </div>

      <AuthCard>
        <button
          type="button"
          onClick={() => void google()}
          disabled={busy || !GOOGLE_CONFIGURED}
          title={!GOOGLE_CONFIGURED ? 'Google sign-in is not configured in this build' : undefined}
          className="flex h-12 w-full cursor-pointer items-center justify-center gap-2.5 rounded-2xl bg-background text-[15px] font-semibold ring-1 ring-foreground/12 transition hover:bg-muted active:scale-[0.99] disabled:cursor-default disabled:opacity-50"
        >
          <GoogleMark />
          {status === 'googling' ? 'Opening Google…' : 'Continue with Google'}
        </button>

        <Divider>or with email</Divider>

        <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
          {mode === 'signup' && (
            <Field
              label="Name"
              icon={UserIcon}
              autoComplete="name"
              placeholder="Your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={busy}
            />
          )}
          <Field
            label="Email"
            icon={Mail01Icon}
            type="email"
            autoComplete={mode === 'signup' ? 'email' : 'username'}
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
          />
          <Field
            label="Password"
            icon={LockPasswordIcon}
            password
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
            trailing={
              mode === 'login' ? (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setView('forgot');
                  }}
                  className="cursor-pointer text-xs font-semibold text-primary hover:underline"
                >
                  Forgot?
                </button>
              ) : undefined
            }
          />
          {mode === 'signup' && <StrengthMeter password={password} />}

          {error && <ErrorNote>{error}</ErrorNote>}

          <PrimaryButton busy={status === 'submitting'} disabled={busy}>
            {status === 'submitting' ? (mode === 'signup' ? 'Creating your account…' : 'Signing in…') : mode === 'signup' ? 'Create account' : 'Sign in'}
            {status !== 'submitting' && <HugeiconsIcon icon={ArrowRight02Icon} strokeWidth={2.2} className="size-5" />}
          </PrimaryButton>
        </form>
      </AuthCard>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        {mode === 'login' ? 'New to Ghostly? ' : 'Already have an account? '}
        <button type="button" onClick={() => switchTo(mode === 'login' ? 'signup' : 'login')} className="cursor-pointer font-semibold text-primary hover:underline">
          {mode === 'login' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </AuthShell>
  );
};
