import { useEffect, useState, type FormEvent } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { CheckmarkCircle02Icon, LockPasswordIcon, Mail01Icon } from '@hugeicons/core-free-icons';
import { sendToBackground } from '../../lib/messages.js';
import { clearPendingReset, setPendingReset } from '../../lib/storage.js';
import { AuthCard, AuthShell, CodeInput, ErrorNote, Field, PrimaryButton, StrengthMeter } from '../auth/kit';

/**
 * Password reset, in two steps: email a 6-digit code, then set a new password
 * with it. On success the backend signs the user in (auth is stored) and the
 * panel flips to Home through App's storage listener.
 *
 * The pending reset is persisted (setPendingReset), so leaving to read the
 * email and coming back resumes at code entry instead of starting over.
 */
type Step = 'request' | 'reset';
const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
const RESEND_AFTER_S = 30;

export const ForgotPassword = ({
  initialEmail = '',
  resume = false,
  onBack,
}: {
  initialEmail?: string;
  /** Reopening into an in-progress reset — jump straight to code entry. */
  resume?: boolean;
  onBack: () => void;
}) => {
  const [step, setStep] = useState<Step>(resume ? 'reset' : 'request');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expires, setExpires] = useState<number | null>(null);
  const [cooldown, setCooldown] = useState(resume ? 0 : RESEND_AFTER_S);

  useEffect(() => {
    if (step !== 'reset' || cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [step, cooldown]);

  const back = async () => {
    await clearPendingReset();
    onBack();
  };

  const requestCode = async (e?: FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!isValidEmail(email)) return setError('That email doesn’t look right.');
    setBusy(true);
    try {
      const resp = await sendToBackground<{ type: 'RESET_RESULT'; payload: { ok: boolean; error?: string; ttlMinutes?: number } }>({
        type: 'FORGOT_PASSWORD',
        payload: { email },
      });
      if (!resp.payload.ok) return setError(resp.payload.error ?? 'Could not send a code. Try again.');
      const mins = resp.payload.ttlMinutes ?? 15;
      await setPendingReset(email, mins);
      setExpires(mins);
      setCode('');
      setCooldown(RESEND_AFTER_S);
      setStep('reset');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code)) return setError('Enter the 6-digit code from your email.');
    if (password.length < 8) return setError('Your new password needs at least 8 characters.');
    setBusy(true);
    try {
      const resp = await sendToBackground<{ type: 'AUTH_RESULT'; payload: { ok: boolean; error?: string } }>({
        type: 'RESET_PASSWORD',
        payload: { email, code, password },
      });
      if (!resp.payload.ok) {
        setError(resp.payload.error ?? 'Could not reset your password.');
        return;
      }
      // Signed in; clear the pending reset so a later open doesn't resume a finished flow.
      await clearPendingReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setBusy(false);
    }
  };

  if (step === 'request') {
    return (
      <AuthShell title="Reset your password" subtitle="Enter your email and we’ll send you a 6-digit code." onBack={() => void back()}>
        <AuthCard>
          <form onSubmit={(e) => void requestCode(e)} className="flex flex-col gap-4" noValidate>
            <Field
              label="Email"
              icon={Mail01Icon}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              autoFocus
            />
            {error && <ErrorNote>{error}</ErrorNote>}
            <PrimaryButton busy={busy}>{busy ? 'Sending code…' : 'Send code'}</PrimaryButton>
          </form>
        </AuthCard>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Check your email"
      subtitle={
        <>
          We sent a code to <span className="font-semibold text-foreground">{email}</span>
          {expires ? ` — it expires in ${expires} minutes.` : '.'}
        </>
      }
      onBack={() => {
        setStep('request');
        setError(null);
      }}
    >
      <AuthCard>
        <form onSubmit={(e) => void submitReset(e)} className="flex flex-col gap-4" noValidate>
          <div className="flex flex-col gap-1.5">
            <span className="px-1 text-[13px] font-semibold">Code</span>
            <CodeInput value={code} onChange={setCode} disabled={busy} />
          </div>
          <Field
            label="New password"
            icon={LockPasswordIcon}
            password
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={busy}
          />
          <StrengthMeter password={password} />
          {error && <ErrorNote>{error}</ErrorNote>}
          <PrimaryButton busy={busy} disabled={code.length < 6}>
            {busy ? 'Saving…' : 'Reset & sign in'}
            {!busy && code.length === 6 && <HugeiconsIcon icon={CheckmarkCircle02Icon} strokeWidth={2} className="size-5" />}
          </PrimaryButton>
        </form>
      </AuthCard>

      <p className="mt-5 text-center text-sm text-muted-foreground">
        Didn’t get it?{' '}
        {cooldown > 0 ? (
          <span className="tabular-nums">Send again in {cooldown}s</span>
        ) : (
          <button type="button" disabled={busy} onClick={() => void requestCode()} className="cursor-pointer font-semibold text-primary hover:underline disabled:opacity-50">
            Send a new code
          </button>
        )}
      </p>
    </AuthShell>
  );
};
