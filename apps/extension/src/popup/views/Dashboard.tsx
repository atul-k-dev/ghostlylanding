import { useEffect, useState } from 'react';
import type {
  CountersState,
  DailyCounter,
  ExtensionSettings,
  Platform,
  SubscriptionPlan,
  TargetCreator,
  TonePreset,
  User,
} from '@casper/shared';
import { PLATFORMS, TONE_PRESETS, FREE_TIER, isPro } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import {
  getSettings,
  setSettings,
  getSchedulerState,
  STORAGE_KEYS,
  getDiagnostics,
  clearDiagnostics,
  type DiagnosticEntry,
} from '../../lib/storage.js';

type Tab = 'dashboard' | 'activity' | 'settings';

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
        <div className="min-w-0">
          <p className="truncate text-sm font-medium" title={user.email}>
            Hi, {user.name.split(/\s+/)[0] || user.name}
          </p>
          <p className="truncate text-[11px] text-casper-ink/50" title={user.email}>
            {user.email}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onTogglePause}
        className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
          isPaused
            ? 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25'
            : 'bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25'
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
  <div className="rounded-xl bg-casper-surface p-3 border border-casper-border">
    <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">{label}</p>
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
  <div className="rounded-2xl bg-casper-surface p-3 border border-casper-border">
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
  const [remainingMin, setRemainingMin] = useState<number | null>(null);

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

      // Live auto-pause countdown.
      const sched = await getSchedulerState();
      if (settings && !settings.isPaused && sched.activeSince) {
        const elapsedMs = Date.now() - sched.activeSince;
        const left = Math.ceil((settings.sessionMinutes * 60_000 - elapsedMs) / 60_000);
        setRemainingMin(left > 0 ? left : 0);
      } else {
        setRemainingMin(null);
      }
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
    // Re-arm with fresh `settings` so the auto-pause countdown stays accurate.
  }, [settings]);

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
            ? 'Toggle the pill above to start.'
            : stats
              ? `${stats.pending} pending · ${stats.completed} done · ${stats.failed} failed`
              : 'Engine warming up…'}
        </p>
        {!isPaused && remainingMin !== null && (
          <p className="mt-1 text-[10px] text-casper-ink/40">
            Auto-pauses in {remainingMin} min
          </p>
        )}
      </div>
      {!hasTargets && (
        <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
          <p className="font-medium text-amber-200">Add your first creator to begin 👋</p>
          <p className="text-amber-200/70">
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
      className="w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-sm focus:border-casper-violet focus:outline-none"
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
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const setAge = (platform: Platform, months: number | null) =>
    onChange({
      ...settings,
      accountAgeMonths: { ...settings.accountAgeMonths, [platform]: months },
    });

  const clearQueue = async () => {
    setQueueStatus('Clearing…');
    try {
      const r = await sendToBackground<
        { ok: true; data: { cleared: number } } | { ok: false; error?: { message?: string } }
      >({ type: 'CLEAR_QUEUE', payload: {} });
      if (r.ok) {
        setQueueStatus(`Cleared ${r.data.cleared} queued task${r.data.cleared === 1 ? '' : 's'}`);
      } else {
        setQueueStatus('Reload the extension first, then try again.');
      }
    } catch (err) {
      setQueueStatus(err instanceof Error ? err.message : 'failed');
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

      <PlanSection />

      <Section
        title="Safety auto-pause"
        subtitle="Casper pauses itself after this long, so it never runs unattended forever."
      >
        <div className="flex flex-wrap gap-2">
          {[15, 30, 60, 120].map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onChange({ ...settings, sessionMinutes: m })}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                settings.sessionMinutes === m
                  ? 'bg-casper-violet text-white'
                  : 'border border-casper-ink/10 text-casper-ink/70 hover:bg-white/5'
              }`}
            >
              {m < 60 ? `${m} min` : `${m / 60} hr`}
            </button>
          ))}
        </div>
      </Section>

      <Section
        title="Watch it work"
        subtitle="Open the tabs Casper acts in so you can see scrolling, likes, comments & follows."
      >
        <label className="flex items-center justify-between">
          <span className="text-xs font-medium text-casper-ink">Show activity on screen</span>
          <button
            type="button"
            onClick={() => onChange({ ...settings, visibleMode: !settings.visibleMode })}
            aria-pressed={settings.visibleMode}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
              settings.visibleMode
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-casper-ink/10 text-casper-ink/60'
            }`}
          >
            {settings.visibleMode ? 'On' : 'Off'}
          </button>
        </label>
        <p className="mt-1.5 text-[10px] text-casper-ink/40">
          Turn off to let Casper work quietly in the background.
        </p>
      </Section>

      <Section title="Reply tone" subtitle="Voice Casper uses when it auto-replies to posts.">
        <select
          value={settings.tone}
          onChange={(e) => onChange({ ...settings, tone: e.target.value as TonePreset })}
          className="w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-sm capitalize focus:border-casper-violet focus:outline-none"
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

      <HomeFeedSection settings={settings} onChange={onChange} />

      <TargetsSection settings={settings} onChange={onChange} />

      <WhitelistSection settings={settings} onChange={onChange} />

      <DiagnosticsSection />

      <Section
        title="Maintenance"
        subtitle="Clear the action queue if Casper seems stuck on old tasks."
      >
        <button
          type="button"
          onClick={clearQueue}
          className="w-full rounded-xl bg-casper-violet/10 px-3 py-2 text-casper-violet transition hover:bg-casper-violet/20"
        >
          Clear action queue
        </button>
        {queueStatus && <p className="mt-2 text-[10px] text-casper-ink/50">{queueStatus}</p>}
      </Section>

      <Section
        title="Danger zone"
        subtitle="Deleting your account wipes everything: profile, action logs, drafts."
      >
        {confirmDelete ? (
          <div className="space-y-2">
            <p className="text-[11px] text-rose-300">
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
                className="rounded-xl border border-casper-ink/10 px-3 py-2 text-[11px] text-casper-ink/70 transition hover:bg-white/5 disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
            {deleteError && (
              <p className="text-[10px] text-rose-400">✗ {deleteError}</p>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="w-full rounded-xl border border-rose-500/30 px-3 py-2 text-[11px] text-rose-300 transition hover:bg-rose-500/10"
          >
            Delete my account
          </button>
        )}
      </Section>

      <button
        type="button"
        onClick={onLogout}
        className="w-full rounded-xl border border-casper-ink/10 px-3 py-2 text-casper-ink/70 transition hover:bg-white/5"
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
        <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>
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
            className="flex items-start gap-2 rounded-xl bg-casper-surface p-2.5 text-[11px] border border-casper-border transition hover:bg-white/5"
          >
            <span
              className={`mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full text-[10px] ${
                e.success ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
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

const PLAN_LABELS: Record<SubscriptionPlan, { label: string; price: string }> = {
  free: { label: 'Free', price: '$0' },
  monthly: { label: 'Pro · Monthly', price: '$14.99/mo' },
};

const PlanSection = () => {
  const [user, setUser] = useState<User | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const resp = await sendToBackground<
        | { ok: true; data: User }
        | { ok: false; error: { message: string } }
      >({ type: 'REFRESH_ME', payload: {} });
      if (resp.ok) setUser(resp.data);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    void refresh();
    // Poll every 15s so post-checkout webhook updates land without manual refresh.
    const id = setInterval(refresh, 15_000);
    return () => clearInterval(id);
  }, []);

  const upgrade = async (plan: SubscriptionPlan) => {
    setBusy(plan);
    setError(null);
    try {
      const resp = await sendToBackground<
        | { ok: true; data: { url: string } }
        | { ok: false; error: { message: string } }
      >({ type: 'START_CHECKOUT', payload: { plan } });
      if (!resp.ok) setError(resp.error.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setBusy(null);
    }
  };

  const manage = async () => {
    setBusy('portal');
    setError(null);
    try {
      const resp = await sendToBackground<
        | { ok: true; data: { url: string } }
        | { ok: false; error: { message: string } }
      >({ type: 'OPEN_BILLING_PORTAL', payload: {} });
      if (!resp.ok) setError(resp.error.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setBusy(null);
    }
  };

  const status = user?.subscriptionStatus ?? 'free';
  const plan = (user?.subscriptionPlan ?? 'free') as SubscriptionPlan;
  const pro = isPro(status);
  const renewLine =
    pro && user?.currentPeriodEnd
      ? `Renews ${new Date(user.currentPeriodEnd).toLocaleDateString()}`
      : null;
  const lifetimeUsed = user?.lifetimeActionCount ?? 0;
  const lifetimeCap = FREE_TIER.lifetimeActions;
  const exhausted = !pro && lifetimeUsed >= lifetimeCap;

  return (
    <Section
      title="Plan"
      subtitle={
        pro
          ? 'Casper Pro · unlimited actions'
          : `Free · all features, ${lifetimeCap} lifetime actions (likes + replies + follows)`
      }
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-medium">{PLAN_LABELS[plan].label}</p>
          <p className="text-[10px] text-casper-ink/50">{PLAN_LABELS[plan].price}</p>
          {renewLine && (
            <p className="text-[10px] text-casper-ink/40">{renewLine}</p>
          )}
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
            pro
              ? 'bg-emerald-500/15 text-emerald-300'
              : status === 'past_due'
                ? 'bg-amber-500/15 text-amber-300'
                : 'bg-casper-ink/10 text-casper-ink/60'
          }`}
        >
          {pro ? 'Active' : status === 'past_due' ? 'Past due' : 'Free'}
        </span>
      </div>

      {!pro && (
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-casper-ink/50 mb-1">
            <span>Free actions used</span>
            <span>
              {Math.min(lifetimeUsed, lifetimeCap)} / {lifetimeCap}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-casper-ink/10">
            <div
              className={`h-full rounded-full ${exhausted ? 'bg-rose-500' : 'bg-casper-violet'}`}
              style={{
                width: `${Math.min(100, (lifetimeUsed / lifetimeCap) * 100)}%`,
              }}
            />
          </div>
          {exhausted && (
            <p className="mt-2 text-[10px] text-rose-400">
              You've used all {lifetimeCap} free actions. Upgrade to keep going.
            </p>
          )}
        </div>
      )}

      {pro ? (
        <button
          type="button"
          onClick={manage}
          disabled={busy === 'portal'}
          className="w-full rounded-xl border border-casper-ink/10 px-3 py-2 text-[11px] text-casper-ink/80 transition hover:bg-white/5 disabled:opacity-50"
        >
          {busy === 'portal' ? 'Opening…' : 'Manage subscription'}
        </button>
      ) : (
        <div className="space-y-1.5">
          <UpgradeButton
            label="Monthly · $14.99"
            sub="Cancel anytime"
            highlight={true}
            busy={busy === 'monthly'}
            onClick={() => upgrade('monthly')}
          />
        </div>
      )}
      {error && <p className="mt-2 text-[10px] text-rose-400">✗ {error}</p>}
    </Section>
  );
};

const UpgradeButton = ({
  label,
  sub,
  highlight,
  busy,
  onClick,
}: {
  label: string;
  sub: string;
  highlight: boolean;
  busy: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={busy}
    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-[11px] transition disabled:opacity-50 ${
      highlight
        ? 'bg-casper-violet text-white hover:opacity-90'
        : 'border border-casper-ink/10 text-casper-ink/80 hover:bg-white/5'
    }`}
  >
    <span className="text-left">
      <span className="block font-medium">{busy ? 'Opening checkout…' : label}</span>
      <span className={`block text-[10px] ${highlight ? 'text-white/70' : 'text-casper-ink/50'}`}>
        {sub}
      </span>
    </span>
    <span aria-hidden>→</span>
  </button>
);

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
  <div className="rounded-xl bg-casper-surface p-3 border border-casper-border">
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
          className="rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs"
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
          className="flex-1 rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
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
                className="rounded px-2 py-0.5 text-[10px] text-rose-400 hover:bg-rose-500/10"
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

const HomeFeedSection = ({
  settings,
  onChange,
}: {
  settings: ExtensionSettings;
  onChange: (s: ExtensionSettings) => void;
}) => {
  const hf = settings.homeFeed;
  const [keywordText, setKeywordText] = useState(hf.keywords.join(', '));
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const update = (patch: Partial<typeof hf>) =>
    onChange({ ...settings, homeFeed: { ...hf, ...patch } });

  const togglePlatform = (p: Platform) => {
    const next = hf.platforms.includes(p)
      ? hf.platforms.filter((x) => x !== p)
      : [...hf.platforms, p];
    update({ platforms: next });
  };

  const commitKeywords = () => {
    const list = keywordText
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    update({ keywords: list });
  };

  const scanNow = async (p: Platform) => {
    setScanStatus(`Scanning ${p} feed…`);
    try {
      await sendToBackground({ type: 'SCAN_HOME_NOW', payload: { platform: p } });
      setScanStatus(
        settings.isPaused
          ? `Queued — but the engine is Paused. Hit "● Active" so it runs.`
          : `Scanning ${p} now — a tab will open and start scrolling.`,
      );
    } catch (err) {
      setScanStatus(err instanceof Error ? err.message : 'failed');
    }
  };

  const Check = ({
    checked,
    onToggle,
    label,
  }: {
    checked: boolean;
    onToggle: () => void;
    label: string;
  }) => (
    <label className="flex items-center gap-2 text-xs text-casper-ink/80">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="h-3.5 w-3.5 rounded border-casper-ink/20 text-casper-violet focus:ring-casper-violet/30"
      />
      {label}
    </label>
  );

  return (
    <Section
      title="Home feed autopilot"
      subtitle="Casper scrolls your own timeline and engages with relevant posts."
    >
      <label className="flex items-center justify-between">
        <span className="text-xs font-medium text-casper-ink">Enable autopilot</span>
        <button
          type="button"
          onClick={() => update({ enabled: !hf.enabled })}
          aria-pressed={hf.enabled}
          className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
            hf.enabled
              ? 'bg-emerald-500/15 text-emerald-300'
              : 'bg-casper-ink/10 text-casper-ink/60'
          }`}
        >
          {hf.enabled ? 'On' : 'Off'}
        </button>
      </label>

      {hf.enabled && (
        <div className="mt-3 space-y-3">
          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
              Platforms
            </p>
            <div className="flex gap-4">
              <Check
                checked={hf.platforms.includes('twitter')}
                onToggle={() => togglePlatform('twitter')}
                label="Twitter"
              />
              <Check
                checked={hf.platforms.includes('linkedin')}
                onToggle={() => togglePlatform('linkedin')}
                label="LinkedIn"
              />
            </div>
          </div>

          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
              Actions
            </p>
            <div className="flex gap-4">
              <Check checked={hf.like} onToggle={() => update({ like: !hf.like })} label="Like" />
              <Check
                checked={hf.comment}
                onToggle={() => update({ comment: !hf.comment })}
                label="Auto-reply"
              />
              <Check
                checked={hf.follow}
                onToggle={() => update({ follow: !hf.follow })}
                label="Follow"
              />
            </div>
            {hf.comment && (
              <p className="mt-2 text-[10px] text-casper-ink/40">
                Casper posts a short, relevant reply automatically. Bounded by your daily caps &
                relevance keywords — toggle the Active pill to stop everything instantly. Free plan:
                30 actions total (likes + replies + follows). Needs your Casper server running.
              </p>
            )}
          </div>

          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
              Relevance keywords
            </p>
            <input
              type="text"
              value={keywordText}
              onChange={(e) => setKeywordText(e.target.value)}
              onBlur={commitKeywords}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitKeywords();
              }}
              placeholder="design, startups, ai (comma-separated)"
              className="w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-casper-ink/40">
              Leave blank to engage with everything in your feed.
            </p>
          </div>

          <div className="flex gap-2">
            {hf.platforms.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => scanNow(p)}
                className="rounded-lg bg-casper-violet/10 px-3 py-1.5 text-[11px] capitalize text-casper-violet transition hover:bg-casper-violet/20"
              >
                Scan {p} now
              </button>
            ))}
          </div>
          {scanStatus && <p className="text-[10px] text-casper-ink/50">{scanStatus}</p>}
        </div>
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
          className="rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs"
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
          className="flex-1 rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
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
                  className="rounded px-2 py-0.5 text-[10px] text-rose-400 hover:bg-rose-500/10"
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
