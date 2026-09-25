import { useEffect, useState, type FormEvent } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ArrowRight02Icon, GiftIcon, LockPasswordIcon, Mail01Icon, UserIcon } from '@hugeicons/core-free-icons';
import { normalizeReferralCode, type ReferralLookup } from '@casper/shared';
import { cn } from '@/lib/utils';
import { sendToBackground } from '../../lib/messages.js';
import { STORAGE_KEYS, getPendingReferral, getPendingReset } from '../../lib/storage.js';
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
  const [referralCode, setReferralCode] = useState('');
  /** The invite field starts folded away behind "Have an invite code?" —
   *  unless the website handed us a code, which is shown filled in. */
  const [showCode, setShowCode] = useState(false);
  /** Who the code in the field belongs to, once looked up. */
  const [invite, setInvite] = useState<ReferralLookup | null>(null);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [resumeReset, setResumeReset] = useState(false);
  const [booted, setBooted] = useState(false);

  // Closed mid-reset (e.g. to fetch the code from email)? Reopen at code entry.
  // Arrived from an invite link? Open on Sign up with the code filled in —
  // someone holding an invite is almost certainly new.
  useEffect(() => {
    const applyPending = (code: string | null) => {
      if (!code) return;
      setReferralCode(code);
      setShowCode(true);
      setMode('signup');
    };
    // The welcome page can hand the code over while this screen is already
    // open, so keep listening rather than reading it once.
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: chrome.storage.AreaName) => {
      if (area === 'local' && STORAGE_KEYS.pendingReferral in changes) void getPendingReferral().then(applyPending);
    };
    chrome.storage.onChanged.addListener(listener);
    void Promise.all([getPendingReset(), getPendingReferral()]).then(([p, pendingCode]) => {
      applyPending(pendingCode);
      if (p) {
        setEmail(p.email);
        setResumeReset(true);
        setView('forgot');
      }
      setBooted(true);
    });
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  // Look up whoever owns the code in the field — for the "<Name> invited you"
  // banner. A code that doesn't check out just shows no banner: sign-up still
  // goes ahead, and the server ignores it.
  const normalizedCode = normalizeReferralCode(referralCode);
  useEffect(() => {
    setInvite(null);
    if (!normalizedCode) return;
    let cancelled = false;
    void sendToBackground<{ ok: true; data: ReferralLookup } | { ok: false }>({
      type: 'LOOKUP_REFERRAL',
      payload: { code: normalizedCode },
    })
      .then((resp) => {
        if (!cancelled && resp.ok && resp.data.valid) setInvite(resp.data);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [normalizedCode]);

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
          ? { type: 'SIGNUP', payload: { name: name.trim(), email, password, referralCode: referralCode.trim() } }
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
      // On Sign up the invite field is visible, so its value (even empty) is
      // what counts; on Sign in the background falls back to a parked code.
      const resp = await sendToBackground<AuthResp>({
        type: 'GOOGLE_LOGIN',
        payload: mode === 'signup' ? { referralCode: referralCode.trim() } : {},
      });
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
      {invite && mode === 'signup' && (
        <div className="mb-4 flex items-center gap-3 rounded-2xl bg-primary/10 px-4 py-3 text-sm ring-1 ring-primary/20">
          <HugeiconsIcon icon={GiftIcon} strokeWidth={1.8} className="size-6 shrink-0 text-primary" />
          <span className="leading-snug">
            <span className="font-semibold">{invite.inviterName ?? 'A friend'} invited you</span>
            <span className="block text-muted-foreground">You’ll get +{invite.bonusCredits} bonus credits when you sign up.</span>
          </span>
        </div>
      )}

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
          {mode === 'signup' &&
            (showCode ? (
              <Field
                label="Invite code"
                icon={GiftIcon}
                autoComplete="off"
                placeholder="Optional"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                disabled={busy}
                maxLength={16}
                trailing={
                  invite ? (
                    <span className="text-xs font-medium text-primary">+{invite.bonusCredits} bonus credits</span>
                  ) : undefined
                }
              />
            ) : (
              <button
                type="button"
                onClick={() => setShowCode(true)}
                className="-mt-1 cursor-pointer self-start px-1 text-xs font-semibold text-primary hover:underline"
              >
                Have an invite code?
              </button>
            ))}

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
