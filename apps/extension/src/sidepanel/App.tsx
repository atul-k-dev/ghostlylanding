import { useEffect, useState } from 'react';
import type { User } from '@casper/shared';
import { sendToBackground } from '../lib/messages.js';
import { STORAGE_KEYS } from '../lib/storage.js';
import { Panel, TopBar } from '../ui/index.js';
import { useEngineStatus } from './useEngineStatus.js';
import type { PanelTarget } from './navigation.js';
import { AppHeader } from './shell/AppHeader.js';
import { BottomNav, type PageId } from './shell/BottomNav.js';
import { Home } from './pages/Home.js';
import { PostPage } from './post/PostPage.js';
import { AskPage } from './ask/AskPage.js';
import { SettingsScreen, type SettingsRoute } from './settings/SettingsScreen.js';
import { Setup } from './pages/Setup.js';
import { NotificationsPage } from './notifications/NotificationsPage.js';
import { useNotifications } from './notifications/useNotifications.js';
import { LoggedOut } from './pages/LoggedOut.js';

type AuthState = { kind: 'loading' } | { kind: 'logged-out' } | { kind: 'logged-in'; user: User };

export const App = () => {
  const [auth, setAuth] = useState<AuthState>({ kind: 'loading' });
  const [page, setPage] = useState<PageId>('home');
  /** Settings sits OVER the pages — somewhere you go and come back from. */
  const [settings, setSettings] = useState<SettingsRoute | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const status = useEngineStatus();
  const notifications = useNotifications(status);

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
      if (area !== 'local') return;
      if (STORAGE_KEYS.auth in changes) void refreshAuth();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  /** Where a condition card's one button sends you. */
  const navigate = (target: PanelTarget) => {
    setNotificationsOpen(false);
    switch (target) {
      case 'account':
      case 'settings':
        setSettings('list');
        return;
      case 'who':
        setSettings('homeFeed');
        return;
      case 'voice':
        setSettings('voice');
        return;
      case 'posts':
        setSettings(null);
        setPage('post');
        return;
      case 'ask':
        setSettings(null);
        setPage('ask');
        return;
      case 'setup':
        setSettings(null);
        return;
      default: // today · review · growth all live on Home now
        setSettings(null);
        setPage('home');
    }
  };

  if (auth.kind === 'loading') {
    return (
      <div className="grid h-full w-full place-items-center bg-canvas text-xs text-muted-foreground">
        Waking up…
      </div>
    );
  }

  // Signed out: no header, no nav, nothing to pause.
  if (auth.kind === 'logged-out') {
    return (
      <div className="no-scrollbar h-full w-full overflow-y-auto bg-canvas">
        <LoggedOut />
      </div>
    );
  }

  // Setup owns the whole panel until it is done. Deciding on
  // `setupCompletedAt` rather than on "has targets" means someone who
  // deliberately runs with none isn't dragged back to step 1 every time.
  if (status.settings && !status.settings.setupCompletedAt) {
    return (
      <Panel top={<TopBar title="Let’s get you started" actions={[]} />}>
        <Setup onDone={() => void status.refresh()} />
      </Panel>
    );
  }

  if (settings) {
    return (
      <div className="h-full w-full bg-canvas text-foreground">
        <SettingsScreen
          user={auth.user}
          route={settings}
          onRoute={setSettings}
          onClose={() => setSettings(null)}
          onSignedOut={() => void refreshAuth()}
        />
      </div>
    );
  }

  if (notificationsOpen) {
    return (
      <div className="h-full w-full bg-canvas text-foreground">
        <NotificationsPage
          n={notifications}
          status={status}
          onBack={() => setNotificationsOpen(false)}
          onNavigate={navigate}
        />
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-canvas text-foreground">
      <AppHeader
        user={auth.user}
        unread={notifications.count}
        onOpenProfile={() => setSettings('list')}
        onOpenNotifications={() => setNotificationsOpen(true)}
      />
      {/* The only scroll container; the bottom padding keeps content (and
          Ask's input) clear of the floating nav. */}
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain pb-24">
        {page === 'home' && <Home status={status} onNavigate={navigate} />}
        {page === 'post' && <PostPage />}
        {page === 'ask' && <AskPage user={auth.user} />}
      </main>
      <BottomNav active={page} onChange={setPage} />
    </div>
  );
};
