'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { WEB_AUTH_MESSAGE_TYPE, type User } from '@casper/shared';

type Status =
  | { kind: 'loading' }
  | { kind: 'success'; user: User }
  | { kind: 'error'; message: string };

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000';

export function VerifyClient() {
  const params = useSearchParams();
  const token = params.get('token');
  const [status, setStatus] = useState<Status>({ kind: 'loading' });

  useEffect(() => {
    if (!token) {
      setStatus({ kind: 'error', message: 'No token in URL.' });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/auth/verify?token=${encodeURIComponent(token)}`,
          { credentials: 'omit' },
        );
        const json = (await res.json()) as
          | { ok: true; data: { token: string; user: User } }
          | { ok: false; error: { code: string; message: string } };

        if (cancelled) return;

        if (!json.ok) {
          setStatus({ kind: 'error', message: json.error.message });
          return;
        }

        // Hand off to the Casper extension content script via window.postMessage.
        // The content script (registered for /auth/verify*) forwards to the
        // service worker which stores the JWT in chrome.storage.local.
        window.postMessage(
          {
            type: WEB_AUTH_MESSAGE_TYPE,
            payload: { token: json.data.token, user: json.data.user },
          },
          window.location.origin,
        );

        setStatus({ kind: 'success', user: json.data.user });
      } catch (err) {
        if (cancelled) return;
        setStatus({
          kind: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="w-full max-w-sm rounded-3xl bg-white/5 backdrop-blur p-8 border border-white/10 text-center">
      <div className="text-5xl mb-4" aria-hidden>
        👻
      </div>
      {status.kind === 'loading' && (
        <>
          <h1 className="text-xl font-semibold mb-2">Signing you in…</h1>
          <p className="text-sm text-white/60">Verifying your magic link.</p>
        </>
      )}
      {status.kind === 'success' && (
        <>
          <h1 className="text-xl font-semibold mb-2">You're in 🎉</h1>
          <p className="text-sm text-white/60">
            Welcome, <span className="text-white">{status.user.email}</span>.
          </p>
          <p className="text-xs text-white/40 mt-6">
            You can close this tab and return to the Casper extension.
          </p>
        </>
      )}
      {status.kind === 'error' && (
        <>
          <h1 className="text-xl font-semibold mb-2">Couldn't sign you in</h1>
          <p className="text-sm text-rose-300">{status.message}</p>
          <p className="text-xs text-white/40 mt-6">
            Open Casper and request a new magic link.
          </p>
        </>
      )}
    </div>
  );
}
