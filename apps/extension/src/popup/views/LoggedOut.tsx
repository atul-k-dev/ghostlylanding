import { useEffect, useRef, useState } from 'react';
import { sendToBackground } from '../../lib/messages.js';

type Step =
  | { kind: 'enter-email' }
  | { kind: 'sending' }
  | { kind: 'enter-code'; email: string; ttlMinutes: number; devCode?: string }
  | { kind: 'verifying'; email: string };

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export const LoggedOut = () => {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<Step>({ kind: 'enter-email' });
  const [error, setError] = useState<string | null>(null);
  const codeInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (step.kind === 'enter-code') {
      codeInputRef.current?.focus();
    }
  }, [step.kind]);

  const submitEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!isValidEmail(email)) {
      setError('That email doesn’t look right.');
      return;
    }
    setStep({ kind: 'sending' });
    try {
      const resp = await sendToBackground<{
        type: 'CODE_SENT';
        payload: {
          sent: boolean;
          via?: string;
          ttlMinutes?: number;
          devCode?: string;
          error?: string;
        };
      }>({ type: 'REQUEST_CODE', payload: { email } });
      if (!resp.payload.sent) {
        setError(resp.payload.error ?? 'Couldn’t send the code.');
        setStep({ kind: 'enter-email' });
        return;
      }
      setStep({
        kind: 'enter-code',
        email,
        ttlMinutes: resp.payload.ttlMinutes ?? 15,
        ...(resp.payload.devCode ? { devCode: resp.payload.devCode } : {}),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setStep({ kind: 'enter-email' });
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (step.kind !== 'enter-code') return;
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    const targetEmail = step.email;
    setStep({ kind: 'verifying', email: targetEmail });
    try {
      const resp = await sendToBackground<{
        type: 'CODE_VERIFIED';
        payload: { ok: boolean; error?: string };
      }>({ type: 'VERIFY_CODE', payload: { email: targetEmail, code } });
      if (!resp.payload.ok) {
        setError(resp.payload.error ?? 'Verification failed.');
        setStep({ kind: 'enter-code', email: targetEmail, ttlMinutes: 15 });
        return;
      }
      // success — Popup parent auto-flips via storage listener
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error');
      setStep({ kind: 'enter-code', email: targetEmail, ttlMinutes: 15 });
    }
  };

  const startOver = () => {
    setStep({ kind: 'enter-email' });
    setCode('');
    setError(null);
  };

  const ttlLine =
    step.kind === 'enter-code' ? `Code expires in ${step.ttlMinutes} minutes.` : null;

  return (
    <div className="flex flex-col p-6 min-h-[480px]">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-casper-violet text-white text-xl">
          👻
        </div>
        <div>
          <h1 className="text-lg font-semibold">Welcome to Casper</h1>
          <p className="text-xs text-casper-ink/60">
            {step.kind === 'enter-email' || step.kind === 'sending'
              ? 'Sign in to start growing.'
              : `We sent a code to ${'email' in step ? step.email : ''}.`}
          </p>
        </div>
      </header>

      {(step.kind === 'enter-email' || step.kind === 'sending') && (
        <form onSubmit={submitEmail} className="rounded-2xl bg-white p-5 shadow-sm">
          <label htmlFor="email" className="mb-2 block text-xs font-medium text-casper-ink/70">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            disabled={step.kind === 'sending'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mb-3 w-full rounded-xl border border-casper-ink/10 bg-casper-cloud px-3 py-2 text-sm text-casper-ink placeholder-casper-ink/30 focus:border-casper-violet focus:outline-none focus:ring-2 focus:ring-casper-violet/20"
          />
          <button
            type="submit"
            disabled={step.kind === 'sending' || !email}
            className="w-full rounded-xl bg-casper-violet px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {step.kind === 'sending' ? 'Sending…' : 'Send sign-in code'}
          </button>
          {error && <p className="mt-3 text-xs text-rose-600">✗ {error}</p>}
          <p className="mt-4 text-[10px] leading-relaxed text-casper-ink/40">
            We'll email you a 6-digit code. Type it here to sign in.
          </p>
        </form>
      )}

      {(step.kind === 'enter-code' || step.kind === 'verifying') && (
        <form onSubmit={submitCode} className="rounded-2xl bg-white p-5 shadow-sm">
          <label htmlFor="code" className="mb-2 block text-xs font-medium text-casper-ink/70">
            6-digit code
          </label>
          <input
            id="code"
            ref={codeInputRef}
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            disabled={step.kind === 'verifying'}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="123456"
            className="mb-3 w-full rounded-xl border border-casper-ink/10 bg-casper-cloud px-3 py-2 text-center text-2xl tracking-[0.5em] text-casper-ink placeholder-casper-ink/20 focus:border-casper-violet focus:outline-none focus:ring-2 focus:ring-casper-violet/20"
          />
          <button
            type="submit"
            disabled={step.kind === 'verifying' || code.length !== 6}
            className="w-full rounded-xl bg-casper-violet px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {step.kind === 'verifying' ? 'Verifying…' : 'Verify & sign in'}
          </button>
          {error && <p className="mt-3 text-xs text-rose-600">✗ {error}</p>}
          {step.kind === 'enter-code' && step.devCode && (
            <p className="mt-3 rounded-lg bg-casper-cloud p-2 text-[10px] text-casper-ink/50">
              dev code: <span className="font-mono text-casper-violet">{step.devCode}</span>
            </p>
          )}
          <div className="mt-3 flex items-center justify-between text-[10px] text-casper-ink/50">
            {ttlLine && <span>{ttlLine}</span>}
            <button
              type="button"
              onClick={startOver}
              className="text-casper-violet hover:underline"
              disabled={step.kind === 'verifying'}
            >
              Use a different email
            </button>
          </div>
        </form>
      )}

      <footer className="mt-auto pt-6 text-center text-[10px] text-casper-ink/40">
        v0.0.1 · safe by default
      </footer>
    </div>
  );
};
