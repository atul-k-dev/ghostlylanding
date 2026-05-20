import { useEffect, useState } from 'react';

type SmokeStatus = 'idle' | 'pinging' | 'ok' | 'error';

export const Popup = () => {
  const [status, setStatus] = useState<SmokeStatus>('idle');
  const [detail, setDetail] = useState<string>('');
  const [apiUrl, setApiUrl] = useState<string>('');

  useEffect(() => {
    chrome.runtime.sendMessage({ type: 'GET_API_URL', payload: {} }, (response) => {
      if (chrome.runtime.lastError) {
        setApiUrl('(service worker not ready)');
        return;
      }
      setApiUrl(response?.payload?.apiUrl ?? '');
    });
  }, []);

  const handlePing = () => {
    setStatus('pinging');
    setDetail('');
    chrome.runtime.sendMessage(
      { type: 'PING', payload: { from: 'popup' } },
      (response) => {
        if (chrome.runtime.lastError) {
          setStatus('error');
          setDetail(chrome.runtime.lastError.message ?? 'unknown error');
          return;
        }
        if (response?.type === 'PONG' && response.payload?.apiOk) {
          setStatus('ok');
          setDetail(`API reachable at ${response.payload.timestamp}`);
        } else {
          setStatus('error');
          setDetail(JSON.stringify(response));
        }
      },
    );
  };

  return (
    <main className="w-[360px] min-h-[480px] bg-casper-cloud p-5 text-casper-ink">
      <header className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-casper-violet text-white text-xl">
          👻
        </div>
        <div>
          <h1 className="text-lg font-semibold">Casper AI</h1>
          <p className="text-xs text-casper-ink/60">Friendly growth, on autopilot.</p>
        </div>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 text-sm font-medium">M0 smoke test</h2>
        <p className="mb-3 text-xs text-casper-ink/60">
          Roundtrip: popup → service worker → API → back.
        </p>
        <p className="mb-3 break-all text-[10px] text-casper-ink/50">
          API: {apiUrl || '...'}
        </p>
        <button
          type="button"
          onClick={handlePing}
          disabled={status === 'pinging'}
          className="w-full rounded-xl bg-casper-violet px-3 py-2 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {status === 'pinging' ? 'Pinging…' : 'Test API'}
        </button>
        <div className="mt-3 min-h-[40px] text-xs">
          {status === 'ok' && (
            <p className="text-emerald-600">✓ {detail}</p>
          )}
          {status === 'error' && (
            <p className="text-rose-600">✗ {detail}</p>
          )}
        </div>
      </section>

      <footer className="mt-6 text-center text-[10px] text-casper-ink/40">
        v0.0.1 · MVP scaffolding
      </footer>
    </main>
  );
};
