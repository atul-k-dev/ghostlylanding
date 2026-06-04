import { useState } from 'react';
import { sendToBackground } from '../../lib/messages.js';
import { EyeIcon, EyeOffIcon } from './LoggedOut.js';

type Step = 'request' | 'reset';
type Status = 'idle' | 'submitting';

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

interface Props {
  initialEmail?: string;
  onBack: () => void;
}

/**
 * In-extension password reset. Step 1 requests a 6-digit code by email; step 2
 * sets a new password with that code. On success the backend auto-logs the user
 * in (auth is stored), so the popup flips to the dashboard via the storage
 * listener in Popup.tsx — no extra navigation needed here.
 */
export const ForgotPassword = ({ initialEmail = '', onBack }: Props) => {
  const [step, setStep] = useState<Step>('request');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const busy = status !== 'idle';

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError('That email doesn’t look right.');
      return;
    }
    setStatus('submitting');
    try {
      const resp = await sendToBackground<{
        type: 'RESET_RESULT';
        payload: { ok: boolean; error?: string; ttlMinutes?: number };
      }>({ type: 'FORGOT_PASSWORD', payload: { email } });
      if (!resp.payload.ok) {
        setError(resp.payload.error ?? 'Could not send a code. Try again.');
        setStatus('idle');
        return;
      }
      const mins = resp.payload.ttlMinutes ?? 15;
      setNotice(`If an account exists for ${email}, we sent a 6-digit code. It expires in ${mins} minutes.`);
      setStep('reset');
      setStatus('idle');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setStatus('idle');
    }
  };

  const submitReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^\d{6}$/.test(code.trim())) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setStatus('submitting');
    try {
      const resp = await sendToBackground<{
        type: 'AUTH_RESULT';
        payload: { ok: boolean; error?: string };
      }>({ type: 'RESET_PASSWORD', payload: { email, code: code.trim(), password } });
      if (!resp.payload.ok) {
        setError(resp.payload.error ?? 'Could not reset your password.');
        setStatus('idle');
        return;
      }
      // Success → auth stored → Popup auto-flips to dashboard.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setStatus('idle');
    }
  };

  const inputCls =
    'mb-3 w-full rounded-xl border border-casper-ink/10 bg-casper-cloud px-3 py-2 text-sm text-casper-ink placeholder-casper-ink/30 focus:border-casper-violet focus:outline-none focus:ring-2 focus:ring-casper-violet/20';

  return (
    <div className="flex flex-col p-6 min-h-[480px]">
      <header className="mb-5 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-casper-violet text-white text-xl">
          👻
        </div>
        <div>
          <h1 className="text-lg font-semibold">Reset password</h1>
          <p className="text-xs text-casper-ink/60">
            {step === 'request'
              ? 'We’ll email you a reset code.'
              : 'Enter the code and your new password.'}
          </p>
        </div>
      </header>

      {notice && (
        <div className="mb-4 rounded-xl bg-casper-violet/5 px-3 py-2 text-[11px] text-casper-ink/70">
          {notice}
        </div>
      )}

      {step === 'request' ? (
        <form onSubmit={requestCode} className="rounded-2xl bg-white p-5 shadow-sm">
          <label htmlFor="reset-email" className="mb-1 block text-xs font-medium text-casper-ink/70">
            Email
          </label>
          <input
            id="reset-email"
            type="email"
            autoComplete="email"
            required
            disabled={busy}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className={inputCls}
          />
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-casper-violet px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Sending code…' : 'Send reset code'}
          </button>
          {error && <p className="mt-3 text-xs text-rose-600">✗ {error}</p>}
        </form>
      ) : (
        <form onSubmit={submitReset} className="rounded-2xl bg-white p-5 shadow-sm">
          <label htmlFor="reset-code" className="mb-1 block text-xs font-medium text-casper-ink/70">
            Reset code
          </label>
          <input
            id="reset-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            required
            disabled={busy}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="123456"
            className={`${inputCls} tracking-[0.4em]`}
          />
          <label
            htmlFor="reset-password"
            className="mb-1 block text-xs font-medium text-casper-ink/70"
          >
            New password
          </label>
          <div className="relative mb-3">
            <input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              disabled={busy}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-xl border border-casper-ink/10 bg-casper-cloud px-3 py-2 pr-10 text-sm text-casper-ink placeholder-casper-ink/30 focus:border-casper-violet focus:outline-none focus:ring-2 focus:ring-casper-violet/20"
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
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-xl bg-casper-violet px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? 'Resetting…' : 'Reset password & sign in'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setStep('request');
              setError(null);
              setNotice(null);
            }}
            className="mt-2 w-full text-center text-[11px] text-casper-ink/50 hover:text-casper-ink disabled:opacity-50"
          >
            Didn’t get a code? Send again
          </button>
          {error && <p className="mt-3 text-xs text-rose-600">✗ {error}</p>}
        </form>
      )}

      <button
        type="button"
        onClick={onBack}
        disabled={busy}
        className="mt-4 text-center text-xs text-casper-violet hover:underline disabled:opacity-50"
      >
        ← Back to sign in
      </button>
    </div>
  );
};
