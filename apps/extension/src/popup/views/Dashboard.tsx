import { useEffect, useState } from 'react';
import type {
  CountersState,
  DailyCounter,
  ExtensionSettings,
  Platform,
  User,
} from '@casper/shared';
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

  const updateSettings = async (next: ExtensionSettings) => {
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
        {tab === 'dashboard' && <DashboardTab settings={settings} />}
        {tab === 'queue' && <QueueTab />}
        {tab === 'settings' && settings && (
          <SettingsTab
            settings={settings}
            onChange={updateSettings}
            onLogout={logout}
            userEmail={user.email}
          />
        )}
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

const PlatformCounters = ({
  platform,
  counter,
}: {
  platform: Platform;
  counter: DailyCounter | null;
}) => (
  <div className="rounded-2xl bg-white p-3 shadow-sm">
    <div className="mb-2 flex items-center justify-between">
      <p className="text-xs font-semibold capitalize">{platform}</p>
      {counter && (
        <p className="text-[10px] text-casper-ink/40">{counter.date}</p>
      )}
    </div>
    <div className="grid grid-cols-3 gap-2">
      <Counter
        label="Likes"
        value={counter?.byActionType.like ?? 0}
        max={counter?.effectiveCap.likesPerDay ?? 0}
      />
      <Counter
        label="Comments"
        value={counter?.byActionType.comment ?? 0}
        max={counter?.effectiveCap.commentsPerDay ?? 0}
      />
      <Counter
        label="Follows"
        value={counter?.byActionType.follow ?? 0}
        max={counter?.effectiveCap.followsPerDay ?? 0}
      />
    </div>
  </div>
);

const DashboardTab = ({ settings }: { settings: ExtensionSettings | null }) => {
  const [counters, setCountersState] = useState<CountersState | null>(null);
  const [stats, setStats] = useState<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
  } | null>(null);

  const refresh = async () => {
    try {
      const c = await sendToBackground<{ ok: true; data: CountersState }>({
        type: 'ENSURE_COUNTERS',
        payload: {},
      });
      if (c.ok) setCountersState(c.data);
      const s = await sendToBackground<{
        ok: true;
        data: { pending: number; running: number; completed: number; failed: number };
      }>({ type: 'GET_QUEUE_STATS', payload: {} });
      if (s.ok) setStats(s.data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void refresh();
    const id = setInterval(refresh, 2_000);
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'local' && (STORAGE_KEYS.counters in changes || STORAGE_KEYS.queue in changes)) {
        void refresh();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      clearInterval(id);
      chrome.storage.onChanged.removeListener(listener);
    };
  }, []);

  const isPaused = settings?.isPaused ?? false;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-casper-violet/20 bg-casper-violet/5 p-3 text-xs">
        <p className="font-medium text-casper-ink">
          {isPaused ? "I'm taking a break 🌙" : "I'm watching over things 👀"}
        </p>
        <p className="text-casper-ink/60">
          {isPaused
            ? 'Toggle the pill above to resume.'
            : stats
              ? `${stats.pending} pending · ${stats.completed} done · ${stats.failed} failed`
              : 'Engine warming up…'}
        </p>
      </div>
      <PlatformCounters platform="twitter" counter={counters?.twitter ?? null} />
      <PlatformCounters platform="linkedin" counter={counters?.linkedin ?? null} />
      <p className="text-[10px] text-casper-ink/40">
        Real platform actions land in M4. Until then, seed stub tasks from Settings ↘
      </p>
    </div>
  );
};

const QueueTab = () => (
  <div className="flex h-full flex-col items-center justify-center text-center text-xs text-casper-ink/50">
    <div className="mb-2 text-3xl" aria-hidden>
      📭
    </div>
    <p>No drafts yet.</p>
    <p className="text-[10px] text-casper-ink/40">Approval queue lands in M5.</p>
  </div>
);

const NumberField = ({
  label,
  value,
  onChange,
  min = 0,
  max = 23,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
}) => (
  <label className="flex flex-col gap-1 text-xs">
    <span className="text-casper-ink/60">{label}</span>
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-lg border border-casper-ink/10 bg-white px-2 py-1.5 text-sm focus:border-casper-violet focus:outline-none"
    />
  </label>
);

const SettingsTab = ({
  settings,
  onChange,
  onLogout,
  userEmail,
}: {
  settings: ExtensionSettings;
  onChange: (s: ExtensionSettings) => void;
  onLogout: () => void;
  userEmail: string;
}) => {
  const [seedStatus, setSeedStatus] = useState<string | null>(null);

  const setStart = (h: number) =>
    onChange({ ...settings, activeHours: { ...settings.activeHours, startHour: h } });
  const setEnd = (h: number) =>
    onChange({ ...settings, activeHours: { ...settings.activeHours, endHour: h } });
  const setAge = (platform: Platform, months: number | null) =>
    onChange({
      ...settings,
      accountAgeMonths: { ...settings.accountAgeMonths, [platform]: months },
    });

  const seed = async () => {
    setSeedStatus('Seeding…');
    try {
      const r = await sendToBackground<{ ok: true; data: { enqueued: number } }>({
        type: 'DEV_ENQUEUE_STUB_TASKS',
        payload: { count: 10 },
      });
      setSeedStatus(`Enqueued ${r.data.enqueued} stub tasks`);
    } catch (err) {
      setSeedStatus(err instanceof Error ? err.message : 'failed');
    }
  };

  return (
    <div className="space-y-4 text-xs">
      <Section title="Account">
        <p className="text-casper-ink/60">{userEmail}</p>
        <p className="text-[10px] text-casper-ink/40">Timezone: {settings.timezone}</p>
      </Section>

      <Section title="Active hours" subtitle="Casper only acts inside this window.">
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Start" value={settings.activeHours.startHour} onChange={setStart} />
          <NumberField label="End" value={settings.activeHours.endHour} onChange={setEnd} />
        </div>
      </Section>

      <Section
        title="Account age (months)"
        subtitle="Newer accounts get safer caps. Leave blank if unsure."
      >
        <div className="grid grid-cols-2 gap-2">
          <NumberField
            label="Twitter"
            value={settings.accountAgeMonths.twitter ?? 0}
            onChange={(n) => setAge('twitter', n > 0 ? n : null)}
            min={0}
            max={240}
          />
          <NumberField
            label="LinkedIn"
            value={settings.accountAgeMonths.linkedin ?? 0}
            onChange={(n) => setAge('linkedin', n > 0 ? n : null)}
            min={0}
            max={240}
          />
        </div>
      </Section>

      <Section title="Dev tools" subtitle="Will be hidden when real platform engines land.">
        <button
          type="button"
          onClick={seed}
          className="w-full rounded-xl bg-casper-violet/10 px-3 py-2 text-casper-violet transition hover:bg-casper-violet/20"
        >
          Enqueue 10 stub tasks
        </button>
        {seedStatus && <p className="mt-2 text-[10px] text-casper-ink/50">{seedStatus}</p>}
      </Section>

      <button
        type="button"
        onClick={onLogout}
        className="w-full rounded-xl border border-casper-ink/10 px-3 py-2 text-casper-ink/70 transition hover:bg-white"
      >
        Sign out
      </button>
    </div>
  );
};

const Section = ({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-xl bg-white p-3 shadow-sm">
    <p className="font-medium text-casper-ink">{title}</p>
    {subtitle && <p className="mb-2 text-[10px] text-casper-ink/50">{subtitle}</p>}
    {children}
  </div>
);
