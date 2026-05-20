import { useEffect, useState } from 'react';
import type { ExtensionSettings, User } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import { getSettings, setSettings, STORAGE_KEYS } from '../../lib/storage.js';

type Tab = 'dashboard' | 'queue' | 'settings';

interface Props {
  user: User;
  onLogout: () => void;
}

export const Dashboard = ({ user, onLogout }: Props) => {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [settings, setLocalSettings] = useState<ExtensionSettings | null>(null);

  useEffect(() => {
    void getSettings().then(setLocalSettings);
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'local' && STORAGE_KEYS.settings in changes) {
        void getSettings().then(setLocalSettings);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const togglePause = async () => {
    if (!settings) return;
    const next: ExtensionSettings = { ...settings, isPaused: !settings.isPaused };
    setLocalSettings(next);
    await setSettings(next);
  };

  const logout = async () => {
    await sendToBackground({ type: 'LOGOUT', payload: {} });
    onLogout();
  };

  return (
    <div className="flex h-[480px] flex-col">
      <Header user={user} isPaused={settings?.isPaused ?? false} onTogglePause={togglePause} />
      <Tabs tab={tab} onChange={setTab} />
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {tab === 'dashboard' && <DashboardTab isPaused={settings?.isPaused ?? false} />}
        {tab === 'queue' && <QueueTab />}
        {tab === 'settings' && <SettingsTab onLogout={logout} userEmail={user.email} />}
      </div>
    </div>
  );
};

const Header = ({
  user,
  isPaused,
  onTogglePause,
}: {
  user: User;
  isPaused: boolean;
  onTogglePause: () => void;
}) => (
  <header className="border-b border-casper-ink/5 px-5 py-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-casper-violet text-white text-lg">
          👻
        </div>
        <div>
          <p className="text-xs text-casper-ink/50">Signed in as</p>
          <p className="truncate text-sm font-medium" title={user.email}>
            {user.email}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onTogglePause}
        className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
          isPaused
            ? 'bg-rose-100 text-rose-600 hover:bg-rose-200'
            : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
        }`}
        aria-pressed={isPaused}
      >
        {isPaused ? '⏸ Paused' : '● Active'}
      </button>
    </div>
  </header>
);

const Tabs = ({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) => {
  const items: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'queue', label: 'Queue' },
    { id: 'settings', label: 'Settings' },
  ];
  return (
    <nav className="flex border-b border-casper-ink/5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`flex-1 px-3 py-2 text-xs font-medium transition ${
            tab === item.id
              ? 'border-b-2 border-casper-violet text-casper-violet'
              : 'text-casper-ink/50 hover:text-casper-ink'
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
};

const Counter = ({ label, value, max }: { label: string; value: number; max: number }) => (
  <div className="rounded-xl bg-white p-3 shadow-sm">
    <p className="text-[10px] uppercase tracking-wide text-casper-ink/40">{label}</p>
    <p className="mt-1 text-lg font-semibold">
      {value}
      <span className="text-xs font-normal text-casper-ink/40">/{max}</span>
    </p>
  </div>
);

const DashboardTab = ({ isPaused }: { isPaused: boolean }) => (
  <div className="space-y-4">
    <div className="rounded-2xl border border-casper-violet/20 bg-casper-violet/5 p-3 text-xs">
      <p className="font-medium text-casper-ink">
        {isPaused ? "I'm taking a break 🌙" : "I'm watching over things 👀"}
      </p>
      <p className="text-casper-ink/60">
        {isPaused
          ? 'Toggle the pill above to resume.'
          : 'Engine warming up — actions land in M3.'}
      </p>
    </div>
    <div className="grid grid-cols-3 gap-2">
      <Counter label="Likes" value={0} max={130} />
      <Counter label="Comments" value={0} max={35} />
      <Counter label="Follows" value={0} max={45} />
    </div>
    <p className="text-[10px] text-casper-ink/40">
      Counters are stubs in M2. The real scheduler arrives in M3.
    </p>
  </div>
);

const QueueTab = () => (
  <div className="flex h-full flex-col items-center justify-center text-center text-xs text-casper-ink/50">
    <div className="mb-2 text-3xl" aria-hidden>
      📭
    </div>
    <p>No drafts yet.</p>
    <p className="text-[10px] text-casper-ink/40">Approval queue lands in M5.</p>
  </div>
);

const SettingsTab = ({ onLogout, userEmail }: { onLogout: () => void; userEmail: string }) => (
  <div className="space-y-4 text-xs">
    <div className="rounded-xl bg-white p-3 shadow-sm">
      <p className="font-medium">Account</p>
      <p className="text-casper-ink/60">{userEmail}</p>
    </div>
    <button
      type="button"
      onClick={onLogout}
      className="w-full rounded-xl border border-casper-ink/10 px-3 py-2 text-casper-ink/70 transition hover:bg-white"
    >
      Sign out
    </button>
    <p className="text-[10px] text-casper-ink/40">
      Targets, hours, and caps editing lands with M3.
    </p>
  </div>
);
