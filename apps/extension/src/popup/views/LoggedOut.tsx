import { useState } from 'react';
import { sendToBackground } from '../../lib/messages.js';

type FormState =
  | { kind: 'idle' }
  | { kind: 'sending' }
  | { kind: 'sent'; via: string; devVerifyUrl?: string }
  | { kind: 'error'; message: string };

const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

export const LoggedOut = () => {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<FormState>({ kind: 'idle' });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setState({ kind: 'error', message: 'That email doesn’t look right.' });
      return;
    }
    setState({ kind: 'sending' });
    try {
      const resp = await sendToBackground<{
        type: 'MAGIC_LINK_SENT';
        payload: { sent: boolean; via?: string; devVerifyUrl?: string; error?: string };
      }>({ type: 'REQUEST_MAGIC_LINK', payload: { email } });
      if (!resp.payload.sent) {
        setState({ kind: 'error', message: resp.payload.error ?? 'Couldn’t send the link.' });
        return;
      }
      setState({
        kind: 'sent',
        via: resp.payload.via ?? 'email',
        devVerifyUrl: resp.payload.devVerifyUrl,
      });
    } catch (err) {
      setState({
        kind: 'error',
        message: err instanceof Error ? err.message : 'Network error',
      });
    }
  };

  return (
    <div className="flex flex-col p-6">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-casper-violet text-white text-xl">
          👻
        </div>
        <div>
          <h1 className="text-lg font-semibold">Welcome to Casper</h1>
          <p className="text-xs text-casper-ink/60">Sign in to start growing.</p>
        </div>
      </header>

      {state.kind === 'sent' ? (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-2 text-2xl" aria-hidden>
            ✉️
          </div>
          <h2 className="mb-1 text-sm font-semibold">Check your inbox</h2>
          <p className="text-xs text-casper-ink/60">
            We sent a magic link to <span className="text-casper-ink">{email}</span>. Click it to
            finish signing in.
          </p>
          {state.devVerifyUrl && (
            <p className="mt-3 break-all rounded-lg bg-casper-cloud p-2 text-[10px] text-casper-ink/50">
              dev link: <a className="text-casper-violet underline" href={state.devVerifyUrl} target="_blank" rel="noreferrer">{state.devVerifyUrl}</a>
            </p>
          )}
          <button
            type="button"
            onClick={() => setState({ kind: 'idle' })}
            className="mt-4 w-full rounded-xl border border-casper-ink/10 px-3 py-2 text-xs text-casper-ink/60 transition hover:bg-casper-cloud"
          >
            Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="rounded-2xl bg-white p-5 shadow-sm">
          <label htmlFor="email" className="mb-2 block text-xs font-medium text-casper-ink/70">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            disabled={state.kind === 'sending'}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="mb-3 w-full rounded-xl border border-casper-ink/10 bg-casper-cloud px-3 py-2 text-sm text-casper-ink placeholder-casper-ink/30 focus:border-casper-violet focus:outline-none focus:ring-2 focus:ring-casper-violet/20"
          />
          <button
            type="submit"
            disabled={state.kind === 'sending' || !email}
            className="w-full rounded-xl bg-casper-violet px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {state.kind === 'sending' ? 'Sending…' : 'Send magic link'}
          </button>
          {state.kind === 'error' && (
            <p className="mt-3 text-xs text-rose-600">✗ {state.message}</p>
          )}
          <p className="mt-4 text-[10px] leading-relaxed text-casper-ink/40">
            No password needed. We'll email you a one-tap sign-in link.
          </p>
        </form>
      )}

      <footer className="mt-auto pt-6 text-center text-[10px] text-casper-ink/40">
        v0.0.1 · safe by default
      </footer>
    </div>
  );
};
