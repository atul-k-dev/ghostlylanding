import { useEffect, useState } from 'react';
import type { User } from '@casper/shared';
import { sendToBackground } from '../lib/messages.js';
import { getPendingReplies, STORAGE_KEYS } from '../lib/storage.js';
import { Panel, TopBar, TabBar, StatusBar, type TabSpec } from '../ui/index.js';
import { useEngineStatus } from './useEngineStatus.js';
import type { PanelTarget } from './navigation.js';
import { Today } from './pages/Today.js';
import { Review } from './pages/Review.js';
import { Posts } from './pages/Posts.js';
import { Growth } from './pages/Growth.js';
import { Ask } from './pages/Ask.js';
import { Account } from './pages/Account.js';
import { Setup } from './pages/Setup.js';
import { Settings } from './pages/Settings.js';
import { Voice } from './pages/Voice.js';
import { WhoIWatch } from './pages/WhoIWatch.js';
import { LoggedOut } from './pages/LoggedOut.js';

type TabId = 'today' | 'review' | 'posts' | 'growth' | 'ask';
/**
 * The gear and person pages sit OVER the tabs rather than beside them — they
 * are somewhere you go and come back from, not a sixth place to live.
 */
type Overlay = 'account' | 'settings' | 'who' | 'voice' | null;

const TABS: readonly TabId[] = ['today', 'review', 'posts', 'growth', 'ask'];
const TAB_LABELS: Record<TabId, string> = {
  today: 'Today',
  review: 'Review',
  posts: 'Posts',
  growth: 'Growth',
  ask: 'Ask',
};

const OVERLAY_TITLES: Record<NonNullable<Overlay>, string> = {
  account: 'Account',
  settings: 'Settings',
  who: 'Who I watch',
  voice: 'Voice',
};

type AuthState = { kind: 'loading' } | { kind: 'logged-out' } | { kind: 'logged-in'; user: User };

export const App = () => {
  const [auth, setAuth] = useState<AuthState>({ kind: 'loading' });
  const [tab, setTab] = useState<TabId>('today');
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [waiting, setWaiting] = useState(0);
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

  /** The Review badge — the one number in the shell that is a call to action. */
  const refreshWaiting = async () => {
    setWaiting((await getPendingReplies()).length);
  };

  useEffect(() => {
    void refreshAuth();
    void refreshWaiting();
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area !== 'local') return;
      if (STORAGE_KEYS.auth in changes) void refreshAuth();
      if (STORAGE_KEYS.pendingReplies in changes) void refreshWaiting();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  /** Where a condition card's one button sends you. */
  const navigate = (target: PanelTarget) => {
    if (target === 'account' || target === 'settings' || target === 'who' || target === 'voice') {
      setOverlay(target);
      return;
    }
    if (target === 'setup') {
      setOverlay(null);
      return;
    }
    setOverlay(null);
    setTab(target);
  };

  if (auth.kind === 'loading') {
    return (
      <div className="casper-app grid h-full w-full place-items-center bg-casper-bg text-xs text-casper-muted">
        Waking up…
      </div>
    );
  }

  // Signed out: no tabs, no status bar, nothing to pause.
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
      <Panel top={<TopBar title="Let’s get you started" actions={[]} />}>
        <Setup onDone={() => void status.refresh()} />
      </Panel>
    );
  }

  const paused = status.settings?.isPaused ?? false;
  const tabs: TabSpec<TabId>[] = TABS.map((id) => ({
    id,
    label: TAB_LABELS[id],
    ...(id === 'review' && waiting > 0 ? { badge: waiting } : {}),
  }));

  return (
    <Panel
      top={
        <TopBar
          title={overlay ? OVERLAY_TITLES[overlay] : 'Ghostly247'}
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
              label: overlay ? 'Back' : 'Settings',
              active: overlay === 'settings' || overlay === 'who' || overlay === 'voice',
              onClick: () =>
                setOverlay((o) => (o === 'settings' || o === 'who' || o === 'voice' ? null : 'settings')),
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
      tabs={overlay ? undefined : <TabBar tabs={tabs} active={tab} onChange={setTab} />}
      status={<StatusBar state={status.state} label={status.label} pace={status.pace} />}
    >
      {/* The gear's three pages, as a row rather than a menu: there are only
          three, and a menu to reach three things is a click nobody needs. */}
      {(overlay === 'settings' || overlay === 'who' || overlay === 'voice') && (
        <div className="flex gap-1 border-b border-casper-border px-3 py-2">
          {(['who', 'voice', 'settings'] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setOverlay(id)}
              aria-pressed={overlay === id}
              className={[
                'cursor-pointer rounded-lg px-2 py-1 text-xs transition-colors',
                overlay === id
                  ? 'bg-casper-coral/12 text-casper-coral'
                  : 'text-casper-muted hover:bg-casper-surface hover:text-casper-fg',
              ].join(' ')}
            >
              {OVERLAY_TITLES[id]}
            </button>
          ))}
        </div>
      )}

      {overlay === 'account' && (
        <Account user={auth.user} onSignedOut={() => void refreshAuth()} />
      )}
      {overlay === 'settings' && <Settings />}
      {overlay === 'who' && <WhoIWatch />}
      {overlay === 'voice' && <Voice />}
      {!overlay && tab === 'today' && <Today status={status} onNavigate={navigate} />}
      {!overlay && tab === 'review' && <Review />}
      {!overlay && tab === 'posts' && <Posts />}
      {!overlay && tab === 'growth' && <Growth />}
      {!overlay && tab === 'ask' && <Ask />}
    </Panel>
  );
};
