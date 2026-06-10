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

const inputCls =
  'w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-3 py-1.5 text-sm text-casper-ink placeholder-casper-ink/30 focus:border-casper-violet focus:outline-none focus:ring-2 focus:ring-casper-violet/20';
const labelCls = 'mb-0.5 block text-[11px] font-medium text-casper-ink/70';

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

  return (
    <div className="flex min-h-[300px] w-full">
      {/* LEFT — brand panel */}
      <aside className="flex w-[150px] flex-none flex-col justify-between border-r border-casper-border bg-casper-violet/5 p-4">
        <div>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-casper-violet text-xl text-white">
            👻
          </div>
          <h1 className="text-base font-semibold leading-tight">Reset password</h1>
          <p className="mt-1 text-[11px] leading-relaxed text-casper-ink/60">
            {step === 'request'
              ? 'We’ll email you a reset code.'
              : 'Enter the code and your new password.'}
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          disabled={busy}
          className="text-left text-[11px] text-casper-violet hover:underline disabled:opacity-50"
        >
          ← Back to sign in
        </button>
      </aside>

      {/* RIGHT — reset form */}
      <div className="flex flex-1 flex-col justify-center p-4">
        {notice && (
          <div className="mb-3 rounded-lg bg-casper-violet/5 px-3 py-2 text-[11px] text-casper-ink/70">
            {notice}
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={requestCode} className="flex flex-col gap-2">
            <div>
              <label htmlFor="reset-email" className={labelCls}>
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
            </div>
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-casper-violet px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? 'Sending code…' : 'Send reset code'}
            </button>
            {error && <p className="text-xs text-rose-400">✗ {error}</p>}
          </form>
        ) : (
          <form onSubmit={submitReset} className="flex flex-col gap-2">
            <div>
              <label htmlFor="reset-code" className={labelCls}>
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
            </div>
            <div>
              <label htmlFor="reset-password" className={labelCls}>
                New password
              </label>
              <div className="relative">
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
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-casper-violet px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
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
              className="text-center text-[11px] text-casper-ink/50 hover:text-casper-ink disabled:opacity-50"
            >
              Didn’t get a code? Send again
            </button>
            {error && <p className="text-xs text-rose-400">✗ {error}</p>}
          </form>
        )}
      </div>
    </div>
  );
};
