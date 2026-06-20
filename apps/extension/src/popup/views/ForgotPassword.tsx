import { useState } from 'react';
import { sendToBackground } from '../../lib/messages.js';
import { clearPendingReset, setPendingReset } from '../../lib/storage.js';
import {
  BrandPanel,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  fieldCls,
  labelCls,
  leadingIconCls,
  primaryBtnCls,
} from './LoggedOut.js';

type Step = 'request' | 'reset';
type Status = 'idle' | 'submitting';

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

interface Props {
  initialEmail?: string;
  /** True when reopening into an in-progress reset (popup was closed while the
   *  user fetched the OTP) — jump straight to code entry. */
  resume?: boolean;
  onBack: () => void;
}

/**
 * In-extension password reset. Step 1 requests a 6-digit code by email; step 2
 * sets a new password with that code. On success the backend auto-logs the user
 * in (auth is stored), so the popup flips to the dashboard via the storage
 * listener in Popup.tsx — no extra navigation needed here.
 *
 * Because the popup closes when it loses focus, the pending reset is persisted
 * (see setPendingReset) so reopening resumes at code entry rather than losing it.
 */
export const ForgotPassword = ({ initialEmail = '', resume = false, onBack }: Props) => {
  const [step, setStep] = useState<Step>(resume ? 'reset' : 'request');
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(
    resume ? `Enter the 6-digit code we emailed to ${initialEmail}.` : null,
  );

  const busy = status !== 'idle';

  const goBack = async () => {
    await clearPendingReset();
    onBack();
  };

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
      // Persist so reopening the popup (after the user leaves to grab the OTP)
      // resumes here at code entry instead of dropping back to sign-in.
      await setPendingReset(email, mins);
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
      // Success → auth stored → Popup auto-flips to dashboard. Clear the pending
      // reset so a future popup open doesn't resume this finished flow.
      await clearPendingReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setStatus('idle');
    }
  };

  return (
    <div className="flex w-[600px] min-h-[400px] bg-casper-bg">
      <BrandPanel
        title="Reset password"
        subtitle={
          step === 'request'
            ? 'We’ll email you a reset code.'
            : 'Enter the code and your new password.'
        }
        footer={
          <button
            type="button"
            onClick={goBack}
            disabled={busy}
            className="text-left text-sm font-medium text-casper-coral transition hover:text-casper-coral-bright disabled:opacity-50"
          >
            ← Back to sign in
          </button>
        }
      />

      {/* RIGHT — reset form */}
      <div className="flex flex-1 flex-col justify-center px-7 py-6">
        {notice && (
          <div className="mb-4 rounded-lg border border-casper-coral/20 bg-casper-coral/5 px-3.5 py-2.5 text-xs leading-relaxed text-casper-ink/80">
            {notice}
          </div>
        )}

        {step === 'request' ? (
          <form onSubmit={requestCode} className="flex flex-col gap-3.5">
            <div>
              <label htmlFor="reset-email" className={labelCls}>
                Email
              </label>
              <div className="relative">
                <span className={leadingIconCls}>
                  <MailIcon />
                </span>
                <input
                  id="reset-email"
                  type="email"
                  autoComplete="email"
                  required
                  disabled={busy}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={fieldCls}
                />
              </div>
            </div>
            <button type="submit" disabled={busy} className={primaryBtnCls}>
              {busy ? 'Sending code…' : 'Send reset code'}
            </button>
            {error && <p className="text-sm text-rose-400">✗ {error}</p>}
          </form>
        ) : (
          <form onSubmit={submitReset} className="flex flex-col gap-3.5">
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
                className="h-10 w-full rounded-lg border border-casper-border bg-casper-surface-2 px-4 text-center text-base tracking-[0.5em] text-casper-ink placeholder-casper-ink/30 transition focus:border-casper-coral focus:outline-none focus:ring-2 focus:ring-casper-coral/25 disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="reset-password" className={labelCls}>
                New password
              </label>
              <div className="relative">
                <span className={leadingIconCls}>
                  <LockIcon />
                </span>
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
            </div>
            <button type="submit" disabled={busy} className={primaryBtnCls}>
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
              className="text-center text-sm text-casper-muted transition hover:text-casper-ink disabled:opacity-50"
            >
              Didn’t get a code? Send again
            </button>
            {error && <p className="text-sm text-rose-400">✗ {error}</p>}
          </form>
        )}
      </div>
    </div>
  );
};
