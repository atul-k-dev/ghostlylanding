import { useEffect, useState } from 'react';
import type { User } from '@casper/shared';
import { sendToBackground } from '../lib/messages.js';
import { STORAGE_KEYS } from '../lib/storage.js';
import { LoggedOut } from './views/LoggedOut.js';
import { Dashboard } from './views/Dashboard.js';

type AuthState =
  | { kind: 'loading' }
  | { kind: 'logged-out' }
  | { kind: 'logged-in'; user: User };

export const Popup = () => {
  const [state, setState] = useState<AuthState>({ kind: 'loading' });

  const refresh = async () => {
    try {
      const resp = await sendToBackground<{
        type: 'AUTH_STATE';
        payload: { authenticated: boolean; user: User | null };
      }>({ type: 'GET_AUTH', payload: {} });
      if (resp.payload.authenticated && resp.payload.user) {
        setState({ kind: 'logged-in', user: resp.payload.user });
      } else {
        setState({ kind: 'logged-out' });
      }
    } catch {
      setState({ kind: 'logged-out' });
    }
  };

  useEffect(() => {
    void refresh();
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'local' && STORAGE_KEYS.auth in changes) {
        void refresh();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  return (
    <main className="casper-app w-[480px] text-casper-ink">
      {state.kind === 'loading' && (
        <div className="flex h-[300px] items-center justify-center text-sm text-casper-ink/60">
          <span>Loading…</span>
        </div>
      )}
      {state.kind === 'logged-out' && <LoggedOut />}
      {state.kind === 'logged-in' && <Dashboard user={state.user} onLogout={refresh} />}
    </main>
  );
};
