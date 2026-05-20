import { useEffect, useState } from 'react';
import type {
  CountersState,
  DailyCounter,
  ExtensionSettings,
  Platform,
  TargetCreator,
  TonePreset,
  User,
} from '@casper/shared';
import { PLATFORMS, TONE_PRESETS } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import {
  getSettings,
  setSettings,
  STORAGE_KEYS,
  getDiagnostics,
  clearDiagnostics,
  type DiagnosticEntry,
} from '../../lib/storage.js';

type Tab = 'dashboard' | 'queue' | 'activity' | 'settings';

interface ActionLogEntry {
  id: string;
  platform: Platform;
  actionType: 'like' | 'comment' | 'follow';
  targetUrl: string;
  targetHandle: string | null;
  success: boolean;
  errorMessage: string | null;
  timestamp: string;
}

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
        {tab === 'activity' && <ActivityTab />}
        {tab === 'settings' && settings && (
          <SettingsTab
            settings={settings}
            onChange={updateSettings}
            onLogout={logout}
            onAccountDeleted={onLogout}
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
    { id: 'dashboard', label: 'Home' },
    { id: 'queue', label: 'Queue' },
    { id: 'activity', label: 'Activity' },
    { id: 'settings', label: 'Settings' },
  ];
  return (
    <nav className="flex border-b border-casper-ink/5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`flex-1 px-2 py-2 text-xs font-medium transition ${
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

  const hasTargets = (settings?.targetCreators.length ?? 0) > 0;

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
      {!hasTargets && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs">
          <p className="font-medium text-amber-700">Add your first creator to begin 👋</p>
          <p className="text-amber-700/80">
            Open <strong>Settings</strong> and add a Twitter or LinkedIn handle. Casper visits
            their profile, likes recent posts, and finds new accounts to follow — all on the
            schedule you set.
          </p>
        </div>
      )}
      <PlatformCounters platform="twitter" counter={counters?.twitter ?? null} />
      <PlatformCounters platform="linkedin" counter={counters?.linkedin ?? null} />
    </div>
  );
};

interface DraftRow {
  id: string;
  platform: Platform;
  postUrl: string;
  draftText: string;
  tone: TonePreset;
  status: string;
  createdAt: string;
}

const QueueTab = () => {
  const [drafts, setDrafts] = useState<DraftRow[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const resp = await sendToBackground<
        | { ok: true; data: { drafts: DraftRow[] } }
        | { ok: false; error: { message: string } }
      >({ type: 'LIST_DRAFTS', payload: { status: 'pending' } });
      if (resp.ok) {
        setDrafts(resp.data.drafts);
        setError(null);
      } else {
        setError(resp.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    }
  };

  useEffect(() => {
    void refresh();
    const id = setInterval(refresh, 5_000);
    return () => clearInterval(id);
  }, []);

  const approve = async (draft: DraftRow) => {
    setBusyId(draft.id);
    try {
      const resp = await sendToBackground<
        { ok: true; data: { taskId: string } } | { ok: false; error: { message: string } }
      >({ type: 'APPROVE_DRAFT', payload: { id: draft.id } });
      if (!resp.ok) {
        setError(resp.error.message);
      } else {
        setDrafts((prev) => prev?.filter((d) => d.id !== draft.id) ?? null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (draft: DraftRow) => {
    setBusyId(draft.id);
    try {
      await sendToBackground({ type: 'REJECT_DRAFT', payload: { id: draft.id } });
      setDrafts((prev) => prev?.filter((d) => d.id !== draft.id) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setBusyId(null);
    }
  };

  if (drafts === null) {
    return <p className="py-4 text-center text-xs text-casper-ink/40">Loading drafts…</p>;
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</div>
      )}
      {drafts.length === 0 ? (
        <div className="flex h-[280px] flex-col items-center justify-center text-center text-xs text-casper-ink/50">
          <div className="mb-2 text-3xl" aria-hidden>
            📭
          </div>
          <p>No drafts waiting.</p>
          <p className="text-[10px] text-casper-ink/40">
            Click ✨ Draft on any post to add one.
          </p>
        </div>
      ) : (
        drafts.map((d) => (
          <div key={d.id} className="rounded-2xl bg-white p-3 text-xs shadow-sm">
            <div className="mb-2 flex items-center justify-between text-[10px] text-casper-ink/40">
              <span className="capitalize">{d.platform} · {d.tone}</span>
              <a
                href={d.postUrl}
                target="_blank"
                rel="noreferrer"
                className="text-casper-violet hover:underline"
              >
                open post ↗
              </a>
            </div>
            <p className="mb-3 whitespace-pre-wrap leading-relaxed text-casper-ink">
              {d.draftText}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => approve(d)}
                disabled={busyId === d.id}
                className="flex-1 rounded-lg bg-casper-violet px-3 py-1.5 text-[11px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {busyId === d.id ? '…' : '✓ Approve'}
              </button>
              <button
                type="button"
                onClick={() => reject(d)}
                disabled={busyId === d.id}
                className="rounded-lg border border-casper-ink/10 px-3 py-1.5 text-[11px] text-casper-ink/60 transition hover:bg-casper-cloud disabled:opacity-50"
              >
                Skip
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

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
  onAccountDeleted,
  userEmail,
}: {
  settings: ExtensionSettings;
  onChange: (s: ExtensionSettings) => void;
  onLogout: () => void;
  onAccountDeleted: () => void;
  userEmail: string;
}) => {
  const [seedStatus, setSeedStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  const doDelete = async () => {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const r = await sendToBackground<
        { ok: true; data: unknown } | { ok: false; error: { message: string } }
      >({ type: 'DELETE_ACCOUNT', payload: {} });
      if (!r.ok) {
        setDeleteError(r.error.message);
        setDeleteBusy(false);
        return;
      }
      onAccountDeleted();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'failed');
      setDeleteBusy(false);
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

      <Section title="Comment tone" subtitle="Used when you click ✨ Draft on a post.">
        <select
          value={settings.tone}
          onChange={(e) => onChange({ ...settings, tone: e.target.value as TonePreset })}
          className="w-full rounded-lg border border-casper-ink/10 bg-white px-2 py-1.5 text-sm capitalize focus:border-casper-violet focus:outline-none"
        >
          {TONE_PRESETS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
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

      <TargetsSection settings={settings} onChange={onChange} />

      <WhitelistSection settings={settings} onChange={onChange} />

      <DiagnosticsSection />

      <Section title="Dev tools" subtitle="Useful while testing the engine.">
        <button
          type="button"
          onClick={seed}
          className="w-full rounded-xl bg-casper-violet/10 px-3 py-2 text-casper-violet transition hover:bg-casper-violet/20"
        >
          Enqueue 10 stub tasks
        </button>
        {seedStatus && <p className="mt-2 text-[10px] text-casper-ink/50">{seedStatus}</p>}
      </Section>

      <Section
        title="Danger zone"
        subtitle="Deleting your account wipes everything: profile, action logs, drafts."
      >
        {confirmDelete ? (
          <div className="space-y-2">
            <p className="text-[11px] text-rose-700">
              This permanently deletes your account and all data. Type-safe — no undo.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={doDelete}
                disabled={deleteBusy}
                className="flex-1 rounded-xl bg-rose-600 px-3 py-2 text-[11px] font-medium text-white transition hover:bg-rose-700 disabled:opacity-50"
              >
                {deleteBusy ? 'Deleting…' : 'Yes, delete forever'}
              </button>
              <button
                type="button"
                disabled={deleteBusy}
                onClick={() => setConfirmDelete(false)}
                className="rounded-xl border border-casper-ink/10 px-3 py-2 text-[11px] text-casper-ink/70 transition hover:bg-white disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
            {deleteError && (
              <p className="text-[10px] text-rose-600">✗ {deleteError}</p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full rounded-xl border border-rose-200 px-3 py-2 text-[11px] text-rose-600 transition hover:bg-rose-50"
          >
            Delete my account
          </button>
        )}
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

const ActivityTab = () => {
  const [entries, setEntries] = useState<ActionLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const resp = await sendToBackground<
        | { ok: true; data: { entries: ActionLogEntry[] } }
        | { ok: false; error: { message: string } }
      >({ type: 'LIST_ACTION_LOG', payload: { limit: 50 } });
      if (resp.ok) {
        setEntries(resp.data.entries);
        setError(null);
      } else {
        setError(resp.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    }
  };

  useEffect(() => {
    void refresh();
    const id = setInterval(refresh, 10_000);
    return () => clearInterval(id);
  }, []);

  if (entries === null) {
    return <p className="py-4 text-center text-xs text-casper-ink/40">Loading…</p>;
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-600">{error}</div>
      )}
      {entries.length === 0 ? (
        <div className="flex h-[280px] flex-col items-center justify-center text-center text-xs text-casper-ink/50">
          <div className="mb-2 text-3xl" aria-hidden>
            🌱
          </div>
          <p>No activity yet.</p>
          <p className="text-[10px] text-casper-ink/40">
            Once Casper acts on your behalf, you'll see it here.
          </p>
        </div>
      ) : (
        entries.map((e) => (
          <a
            key={e.id}
            href={e.targetUrl}
            target="_blank"
            rel="noreferrer"
            className="flex items-start gap-2 rounded-xl bg-white p-2.5 text-[11px] shadow-sm transition hover:bg-casper-cloud"
          >
            <span
              className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] ${
                e.success ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-600'
              }`}
              aria-hidden
            >
              {e.success ? '✓' : '✗'}
            </span>
            <span className="flex-1">
              <span className="font-medium text-casper-ink capitalize">{e.actionType}</span>{' '}
              <span className="text-casper-ink/40">on {e.platform}</span>
              {e.targetHandle && (
                <span className="text-casper-ink/60"> · @{e.targetHandle.replace(/^@/, '')}</span>
              )}
              <span className="block text-[10px] text-casper-ink/40">
                {formatRelative(e.timestamp)}
                {e.errorMessage ? ` · ${e.errorMessage}` : ''}
              </span>
            </span>
          </a>
        ))
      )}
    </div>
  );
};

const formatRelative = (iso: string): string => {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
};

const DiagnosticsSection = () => {
  const [diags, setDiags] = useState<DiagnosticEntry[] | null>(null);
  const [open, setOpen] = useState(false);

  const refresh = async () => {
    setDiags(await getDiagnostics());
  };

  useEffect(() => {
    void refresh();
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'local' && STORAGE_KEYS.diagnostics in changes) {
        void refresh();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const count = diags?.length ?? 0;

  return (
    <Section
      title="Diagnostics"
      subtitle={count > 0 ? `${count} recent issue${count === 1 ? '' : 's'}` : 'No issues recorded.'}
    >
      {count > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="text-[11px] text-casper-violet hover:underline"
          >
            {open ? 'Hide' : 'Show'} latest
          </button>
          {open && (
            <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto">
              {diags!.slice(0, 20).map((d, i) => (
                <li
                  key={`${d.at}-${i}`}
                  className="rounded-md bg-casper-cloud px-2 py-1 text-[10px] text-casper-ink/70"
                >
                  <span className="text-casper-ink/40">{formatRelative(d.at)}</span>{' '}
                  <span className="font-medium">{d.kind}</span>{' '}
                  <span>{d.context}</span>
                  {d.detail && <span className="text-casper-ink/50"> — {d.detail}</span>}
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={async () => {
              await clearDiagnostics();
            }}
            className="mt-2 text-[10px] text-casper-ink/40 hover:text-rose-500"
          >
            Clear log
          </button>
        </>
      )}
    </Section>
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

const WhitelistSection = ({
  settings,
  onChange,
}: {
  settings: ExtensionSettings;
  onChange: (s: ExtensionSettings) => void;
}) => {
  const [platform, setPlatform] = useState<Platform>('twitter');
  const [handle, setHandle] = useState('');

  const add = () => {
    const clean = handle.trim().replace(/^@/, '');
    if (!clean) return;
    if (
      settings.whitelist.some(
        (w) => w.platform === platform && w.handle.toLowerCase() === clean.toLowerCase(),
      )
    ) {
      setHandle('');
      return;
    }
    onChange({
      ...settings,
      whitelist: [...settings.whitelist, { platform, handle: clean }],
    });
    setHandle('');
  };

  const remove = (entry: { platform: Platform; handle: string }) => {
    onChange({
      ...settings,
      whitelist: settings.whitelist.filter(
        (w) => !(w.platform === entry.platform && w.handle === entry.handle),
      ),
    });
  };

  return (
    <Section
      title="Whitelist"
      subtitle="Casper will never follow accounts on this list."
    >
      <div className="flex gap-2">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          className="rounded-lg border border-casper-ink/10 bg-white px-2 py-1.5 text-xs"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          placeholder="@handle"
          className="flex-1 rounded-lg border border-casper-ink/10 bg-white px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          disabled={!handle.trim()}
          className="rounded-lg bg-casper-ink/10 px-3 py-1.5 text-xs font-medium text-casper-ink transition hover:bg-casper-ink/20 disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {settings.whitelist.length === 0 ? (
        <p className="mt-3 text-[10px] text-casper-ink/40">No whitelisted handles.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {settings.whitelist.map((w) => (
            <li
              key={`${w.platform}:${w.handle}`}
              className="flex items-center justify-between rounded-lg bg-casper-cloud px-2 py-1.5 text-xs"
            >
              <span>
                <span className="text-casper-ink/40">{w.platform[0]?.toUpperCase()}</span>{' '}
                <span>@{w.handle}</span>
              </span>
              <button
                type="button"
                onClick={() => remove(w)}
                aria-label="Remove"
                className="rounded px-2 py-0.5 text-[10px] text-rose-500 hover:bg-rose-50"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
};

const TargetsSection = ({
  settings,
  onChange,
}: {
  settings: ExtensionSettings;
  onChange: (s: ExtensionSettings) => void;
}) => {
  const [platform, setPlatform] = useState<Platform>('twitter');
  const [handle, setHandle] = useState('');
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const add = () => {
    const clean = handle.trim().replace(/^@/, '');
    if (!clean) return;
    if (
      settings.targetCreators.some(
        (t) => t.platform === platform && t.handle.toLowerCase() === clean.toLowerCase(),
      )
    ) {
      setHandle('');
      return;
    }
    const next: TargetCreator = {
      platform,
      handle: clean,
      addedAt: new Date().toISOString(),
    };
    onChange({ ...settings, targetCreators: [...settings.targetCreators, next] });
    setHandle('');
  };

  const remove = (target: TargetCreator) => {
    onChange({
      ...settings,
      targetCreators: settings.targetCreators.filter(
        (t) => !(t.platform === target.platform && t.handle === target.handle),
      ),
    });
  };

  const scanNow = async (target: TargetCreator) => {
    setScanStatus(`Scanning ${target.handle}…`);
    try {
      await sendToBackground({
        type: 'SCAN_TARGET_NOW',
        payload: { platform: target.platform, handle: target.handle },
      });
      setScanStatus(`Queued scan for ${target.handle}`);
    } catch (err) {
      setScanStatus(err instanceof Error ? err.message : 'failed');
    }
  };

  const scanFollowersNow = async (target: TargetCreator) => {
    setScanStatus(`Scanning followers of ${target.handle}…`);
    try {
      await sendToBackground({
        type: 'SCAN_FOLLOWERS_NOW',
        payload: { platform: target.platform, handle: target.handle },
      });
      setScanStatus(`Queued follow scan for ${target.handle}`);
    } catch (err) {
      setScanStatus(err instanceof Error ? err.message : 'failed');
    }
  };

  return (
    <Section
      title="Target creators"
      subtitle="Casper visits these profiles, finds fresh posts, and likes them."
    >
      <div className="flex gap-2">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          className="rounded-lg border border-casper-ink/10 bg-white px-2 py-1.5 text-xs"
        >
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add();
          }}
          placeholder="@handle"
          className="flex-1 rounded-lg border border-casper-ink/10 bg-white px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
        />
        <button
          type="button"
          onClick={add}
          disabled={!handle.trim()}
          className="rounded-lg bg-casper-violet px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {settings.targetCreators.length === 0 ? (
        <p className="mt-3 text-[10px] text-casper-ink/40">No targets yet. Add a handle above.</p>
      ) : (
        <ul className="mt-3 space-y-1">
          {settings.targetCreators.map((t) => (
            <li
              key={`${t.platform}:${t.handle}`}
              className="flex items-center justify-between rounded-lg bg-casper-cloud px-2 py-1.5 text-xs"
            >
              <span>
                <span className="text-casper-ink/40">{t.platform[0]?.toUpperCase()}</span>{' '}
                <span>@{t.handle}</span>
              </span>
              <span className="flex gap-1">
                <button
                  type="button"
                  onClick={() => scanNow(t)}
                  className="rounded px-2 py-0.5 text-[10px] text-casper-violet hover:bg-casper-violet/10"
                  title="Scan recent posts and like them"
                >
                  Posts
                </button>
                <button
                  type="button"
                  onClick={() => scanFollowersNow(t)}
                  className="rounded px-2 py-0.5 text-[10px] text-casper-violet hover:bg-casper-violet/10"
                  title="Scan followers and follow them"
                >
                  Followers
                </button>
                <button
                  type="button"
                  onClick={() => remove(t)}
                  aria-label="Remove"
                  className="rounded px-2 py-0.5 text-[10px] text-rose-500 hover:bg-rose-50"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {scanStatus && <p className="mt-2 text-[10px] text-casper-ink/50">{scanStatus}</p>}
    </Section>
  );
};
