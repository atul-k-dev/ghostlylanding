import { useEffect, useState } from 'react';
import type { User } from '@casper/shared';
import { sendToBackground } from '../lib/messages.js';
import { STORAGE_KEYS } from '../lib/storage.js';
import { Panel, TopBar, TabBar, StatusBar, type TabSpec } from '../ui/index.js';
import { useEngineStatus } from './useEngineStatus.js';
import { Today } from './pages/Today.js';
import { Review } from './pages/Review.js';
import { Posts } from './pages/Posts.js';
import { Growth } from './pages/Growth.js';
import { Ask } from './pages/Ask.js';
import { Account } from './pages/Account.js';
import { Setup } from './pages/Setup.js';
import { Settings } from './pages/Settings.js';
import { LoggedOut } from '../popup/views/LoggedOut.js';

type TabId = 'today' | 'review' | 'posts' | 'growth' | 'ask';
/** The gear/person pages sit OVER the tabs rather than beside them — they are
 *  somewhere you go and come back from, not a sixth place to live. */
type Overlay = 'account' | 'settings' | null;

const TABS: readonly TabSpec<TabId>[] = [
  { id: 'today', label: 'Today' },
  { id: 'review', label: 'Review' },
  { id: 'posts', label: 'Posts' },
  { id: 'growth', label: 'Growth' },
  { id: 'ask', label: 'Ask' },
];

type AuthState = { kind: 'loading' } | { kind: 'logged-out' } | { kind: 'logged-in'; user: User };

export const App = () => {
  const [auth, setAuth] = useState<AuthState>({ kind: 'loading' });
  const [tab, setTab] = useState<TabId>('today');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const status = useEngineStatus();

  const refreshAuth = async () => {
    try {
      const resp = await sendToBackground<{
        type: 'AUTH_STATE';
        payload: { authenticated: boolean; user: User | null };
      }>({ type: 'GET_AUTH', payload: {} });
      setAuth(
        resp.payload.authenticated && resp.payload.user
          ? { kind: 'logged-in', user: resp.payload.user }
          : { kind: 'logged-out' },
      );
    } catch {
      setAuth({ kind: 'logged-out' });
    }
  };

  useEffect(() => {
    void refreshAuth();
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'local' && STORAGE_KEYS.auth in changes) void refreshAuth();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  if (auth.kind === 'loading') {
    return (
      <div className="casper-app grid h-full w-full place-items-center bg-casper-bg text-xs text-casper-muted">
        Waking up…
      </div>
    );
  }

  // Signed out: no tabs, no status bar, nothing to pause. 1.6 moves this view
  // into src/sidepanel/pages and sizes it for the panel; until then the popup's
  // version renders here unchanged rather than being duplicated.
  if (auth.kind === 'logged-out') {
    return (
      <div className="casper-app h-full w-full overflow-y-auto bg-casper-bg">
        <LoggedOut />
      </div>
    );
  }

  // Setup owns the whole panel until it is done: no tabs, no status bar, one
  // thing to do. Deciding on `setupCompletedAt` rather than on "has targets"
  // means someone who deliberately runs with none isn't dragged back to step 1
  // every time they open the panel.
  if (status.settings && !status.settings.setupCompletedAt) {
    return (
      <Panel
        top={<TopBar title="Let's get you started" actions={[]} />}
      >
        <Setup onDone={() => void status.refresh()} />
      </Panel>
    );
  }

  const paused = status.settings?.isPaused ?? false;

  return (
    <Panel
      top={
        <TopBar
          title={overlay === 'account' ? 'Account' : overlay === 'settings' ? 'Settings' : 'Ghostly247'}
          actions={[
            {
              id: 'account',
              icon: '👤',
              label: 'Account',
              active: overlay === 'account',
              onClick: () => setOverlay((o) => (o === 'account' ? null : 'account')),
            },
            {
              id: 'settings',
              icon: '⚙',
              label: 'Settings',
              active: overlay === 'settings',
              onClick: () => setOverlay((o) => (o === 'settings' ? null : 'settings')),
            },
            {
              id: 'pause',
              icon: paused ? '▶' : '⏸',
              label: paused ? 'Start' : 'Pause everything',
              onClick: () => void status.togglePause(),
            },
            {
              // Chrome gives a side panel no close API; the panel is its own
              // window, so closing it is exactly window.close().
              id: 'collapse',
              icon: '→|',
              label: 'Close the panel',
              onClick: () => window.close(),
            },
          ]}
        />
      }
      tabs={
        overlay ? undefined : <TabBar tabs={TABS} active={tab} onChange={setTab} />
      }
      status={<StatusBar state={status.state} label={status.label} pace={status.pace} />}
    >
      {overlay === 'account' && (
        <Account user={auth.user} onSignedOut={() => void refreshAuth()} />
      )}
      {overlay === 'settings' && <Settings />}
      {!overlay && tab === 'today' && <Today status={status} />}
      {!overlay && tab === 'review' && <Review />}
      {!overlay && tab === 'posts' && <Posts />}
      {!overlay && tab === 'growth' && <Growth />}
      {!overlay && tab === 'ask' && <Ask />}
    </Panel>
  );
};
