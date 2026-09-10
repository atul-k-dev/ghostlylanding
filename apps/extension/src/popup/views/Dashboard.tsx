import { useEffect, useState } from 'react';
import type {
  ActionType,
  CountersState,
  GrowthSummary,
  GrowthDelta,
  PostOutcome,
  PendingReply,
  VoiceProfile,
  DailyCounter,
  ExtensionSettings,
  Platform,
  SubscriptionPlan,
  TargetCreator,
  SearchQuery,
  TonePreset,
  CommentLength,
  PostLength,
  User,
} from '@casper/shared';
import {
  TONE_PRESETS,
  COMMENT_LENGTHS,
  FREE_TIER,
  PLAN_PRICING,
  VOICE_LIMITS,
  REPLY_QUEUE_MAX,
  MAX_SEARCH_QUERIES,
  isPro,
  monthlyActionsUsed,
} from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import { toDateInputValue, toTimeInputValue, localDateTime } from '../../lib/schedule-time.js';
import {
  getSettings,
  setSettings,
  getAuth as getStoredAuth,
  getPendingReplies,
  getSchedulerState,
  STORAGE_KEYS,
  getDiagnostics,
  clearDiagnostics,
  tweetLimitFor,
  effectivePostLength,
  type DiagnosticEntry,
  type ScheduledPost,
} from '../../lib/storage.js';

type Tab = 'dashboard' | 'growth' | 'review' | 'activity' | 'schedule' | 'settings';

interface ActionLogEntry {
  id: string;
  platform: Platform;
  actionType: ActionType;
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
  // Badge count for the Review tab — kept live so a draft queued mid-session
  // shows up without the user hunting for it.
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    void getSettings().then(setLocalSettings);
    void getPendingReplies().then((r) => setPendingCount(r.length));
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'local' && STORAGE_KEYS.settings in changes) {
        void getSettings().then(setLocalSettings);
      }
      if (area === 'local' && STORAGE_KEYS.pendingReplies in changes) {
        void getPendingReplies().then((r) => setPendingCount(r.length));
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
    <div className="flex h-[480px] w-[480px] flex-col">
      <Header user={user} isPaused={settings?.isPaused ?? false} onTogglePause={togglePause} />
      <Tabs tab={tab} onChange={setTab} pendingCount={pendingCount} />
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {tab === 'dashboard' && <DashboardTab settings={settings} />}
        {tab === 'growth' && <GrowthTab />}
        {tab === 'review' && <ReviewTab />}
        {tab === 'activity' && <ActivityTab />}
        {tab === 'schedule' && settings && (
          <ScheduleTab settings={settings} onChange={updateSettings} />
        )}
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
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-casper-violet">
          <img
            src={chrome.runtime.getURL('ghostly247logo-black.png')}
            alt="Ghostly247"
            className="h-9 w-9 object-contain"
          />
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

const Tabs = ({
  tab,
  onChange,
  pendingCount,
}: {
  tab: Tab;
  onChange: (t: Tab) => void;
  pendingCount: number;
}) => {
  const items: { id: Tab; label: string }[] = [
    { id: 'dashboard', label: 'Home' },
    { id: 'growth', label: 'Growth' },
    { id: 'review', label: 'Review' },
    { id: 'activity', label: 'Activity' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'settings', label: 'Settings' },
  ];
  return (
    <nav className="flex border-b border-casper-ink/5">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => onChange(item.id)}
          className={`flex flex-1 items-center justify-center gap-1 px-1 py-2 text-xs font-medium transition ${
            tab === item.id
              ? 'border-b-2 border-casper-violet text-casper-violet'
              : 'text-casper-ink/50 hover:text-casper-ink'
          }`}
        >
          {item.label}
          {item.id === 'review' && pendingCount > 0 && (
            <span className="rounded-full bg-casper-violet px-1.5 text-[9px] font-semibold leading-4 text-white">
              {pendingCount}
            </span>
          )}
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
    <div className="mb-2 grid grid-cols-3 items-center">
      <p className="text-xs font-semibold capitalize">{platform}</p>
      <span className="text-center text-[11px] font-semibold text-casper-coral">
        Your daily limit
      </span>
      <p className="text-right text-[10px] text-casper-ink/40">{counter?.date ?? ''}</p>
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
      <Counter
        label="Bookmarks"
        value={counter?.byActionType.bookmark ?? 0}
        max={counter?.effectiveCap.bookmarksPerDay ?? 0}
      />
      <Counter
        label="Reposts"
        value={counter?.byActionType.repost ?? 0}
        max={counter?.effectiveCap.repostsPerDay ?? 0}
      />
      <Counter
        label="Quotes"
        value={counter?.byActionType.quote ?? 0}
        max={counter?.effectiveCap.quotesPerDay ?? 0}
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
  const [scheduledCount, setScheduledCount] = useState(0);

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

      const sp = await sendToBackground<
        { ok: true; data: { posts: ScheduledPost[]; max: number } } | { ok: false }
      >({ type: 'LIST_SCHEDULED_POSTS', payload: {} });
      if (sp.ok) {
        setScheduledCount(
          sp.data.posts.filter((p) => p.status === 'scheduled' || p.status === 'publishing').length,
        );
      }

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
      if (
        area === 'local' &&
        (STORAGE_KEYS.counters in changes ||
          STORAGE_KEYS.queue in changes ||
          STORAGE_KEYS.scheduledPosts in changes)
      ) {
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
      {scheduledCount > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-casper-border bg-casper-surface px-3 py-2.5 text-xs">
          <span className="flex items-center gap-2 text-casper-ink/80">
            <CalendarIcon />
            <span className="font-medium">
              {scheduledCount} post{scheduledCount === 1 ? '' : 's'} scheduled
            </span>
          </span>
          <span className="text-[10px] text-casper-ink/40">See Schedule tab</span>
        </div>
      )}

      <PlatformCounters platform="twitter" counter={counters?.twitter ?? null} />

      <a
        href={HOW_TO_USE_URL}
        target="_blank"
        rel="noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-casper-border px-3 py-2.5 text-sm font-medium text-casper-ink/80 transition hover:bg-white/5"
      >
        <BookIcon />
        How to use Ghostly247
      </a>
    </div>
  );
};

const HOW_TO_USE_URL = 'https://www.ghostly247.com/#how-to-use';

const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="5" width="17" height="16" rx="2.5" stroke="currentColor" strokeWidth="1.7" />
    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

const BookIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H5.5A1.5 1.5 0 0 1 4 15.5v-10Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
    <path
      d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h5.5a1.5 1.5 0 0 0 1.5-1.5v-10Z"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinejoin="round"
    />
  </svg>
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
      className="w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-sm focus:border-casper-violet focus:outline-none"
    />
  </label>
);

const COMMENT_LENGTH_LABELS: Record<CommentLength, string> = {
  1: '1 line · 8–10 words',
  2: '2 lines · ~20 words',
  3: '3 lines · ~35 words',
};

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
  // Voice profile lives on the server user; the background writes it back into
  // local auth after training, so we read it from there and refresh on change.
  const [voice, setVoice] = useState<VoiceProfile | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null);

  const readVoice = async () => {
    const auth = await getStoredAuth();
    setVoice(auth?.user.voiceProfile ?? null);
  };
  useEffect(() => {
    void readVoice();
  }, []);

  const trainVoice = async () => {
    setVoiceBusy(true);
    setVoiceMsg('Reading your recent posts…');
    try {
      const resp = await sendToBackground<
        { ok: true; data: User } | { ok: false; error: { message: string } | string }
      >({ type: 'TRAIN_VOICE', payload: {} });
      if (resp.ok) {
        setVoice(resp.data.voiceProfile ?? null);
        setVoiceMsg('Done — Ghostly now writes the way you do.');
      } else {
        setVoiceMsg(typeof resp.error === 'string' ? resp.error : resp.error.message);
      }
    } catch (err) {
      setVoiceMsg(err instanceof Error ? err.message : 'Training failed');
    } finally {
      setVoiceBusy(false);
    }
  };

  const clearVoice = async () => {
    setVoiceBusy(true);
    try {
      const resp = await sendToBackground<
        { ok: true; data: User } | { ok: false; error: { message: string } | string }
      >({ type: 'CLEAR_VOICE', payload: {} });
      if (resp.ok) {
        setVoice(null);
        setVoiceMsg('Cleared — back to the tone preset.');
      }
    } finally {
      setVoiceBusy(false);
    }
  };
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [followBackStatus, setFollowBackStatus] = useState<string | null>(null);

  const runFollowBackNow = async () => {
    setFollowBackStatus('Starting…');
    try {
      await sendToBackground({ type: 'FOLLOW_BACK_NOW', payload: {} });
      setFollowBackStatus(
        settings.isPaused
          ? 'Queued — but the engine is Paused. Hit "● Active" up top so it runs.'
          : 'Opening your followers list and following everyone back…',
      );
    } catch (err) {
      setFollowBackStatus(err instanceof Error ? err.message : 'failed');
    }
  };

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
        title="Run for"
        subtitle="Ghostly247 runs for this long, then auto-pauses. Re-arm with the Active pill to go again."
      >
        <div className="flex flex-wrap gap-2">
          {[15, 30, 45, 60].map((m) => (
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
        subtitle="Open the tabs Ghostly247 acts in so you can see scrolling, likes, comments & follows."
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
          Turn off to let Ghostly247 work quietly in the background.
        </p>
      </Section>

      <Section
        title="Browse like a human"
        subtitle="Open profiles and posts to act on them, then head back to the feed."
      >
        <label className="flex items-center justify-between">
          <span className="text-xs font-medium text-casper-ink">Interactive browsing</span>
          <button
            type="button"
            onClick={() =>
              onChange({ ...settings, interactiveMode: !settings.interactiveMode })
            }
            aria-pressed={settings.interactiveMode}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
              settings.interactiveMode
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-casper-ink/10 text-casper-ink/60'
            }`}
          >
            {settings.interactiveMode ? 'On' : 'Off'}
          </button>
        </label>
        <p className="mt-1.5 text-[10px] text-casper-ink/40">
          Follows open the creator&rsquo;s profile (and give their latest post a like), replies
          open the post&rsquo;s own page. Turn off to do everything from the timeline instead.
        </p>
      </Section>

      <Section
        title="Your voice"
        subtitle="Learn how you write, so replies sound like you and not like a preset."
      >
        {voice ? (
          <div className="space-y-2">
            <p className="rounded-lg border border-casper-border bg-casper-cloud p-2 text-[11px] leading-relaxed text-casper-ink/70">
              {voice.summary}
            </p>
            <p className="text-[10px] text-casper-ink/40">
              Learned from {voice.sampleCount} of your posts on{' '}
              {new Date(voice.trainedAt).toLocaleDateString()}. This overrides the tone preset
              below.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={trainVoice}
                disabled={voiceBusy}
                className="flex-1 rounded-lg border border-casper-border py-1.5 text-xs font-medium text-casper-ink/70 transition hover:bg-white/5 disabled:opacity-50"
              >
                {voiceBusy ? 'Working…' : 'Retrain'}
              </button>
              <button
                type="button"
                onClick={clearVoice}
                disabled={voiceBusy}
                className="rounded-lg border border-casper-border px-3 py-1.5 text-xs text-casper-ink/50 transition hover:bg-white/5 disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[10px] leading-relaxed text-casper-ink/50">
              Ghostly reads your last {VOICE_LIMITS.maxSamples} posts once, works out how you
              actually write, and uses that for every reply and drafted post. Your posts are
              analysed and discarded — only the summary is kept.
            </p>
            <button
              type="button"
              onClick={trainVoice}
              disabled={voiceBusy}
              className="w-full rounded-lg bg-casper-violet py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {voiceBusy ? 'Reading your posts…' : 'Learn my voice'}
            </button>
          </div>
        )}
        {voiceMsg && <p className="mt-2 text-[10px] text-casper-ink/50">{voiceMsg}</p>}
      </Section>

      <Section
        title="Review before posting"
        subtitle="Hold each generated reply in the Review tab until you approve it."
      >
        <label className="flex items-center gap-2 text-xs text-casper-ink/80">
          <input
            type="checkbox"
            checked={settings.replyApproval !== false}
            onChange={() =>
              onChange({ ...settings, replyApproval: !(settings.replyApproval !== false) })
            }
            className="h-3.5 w-3.5 rounded border-casper-ink/20 text-casper-violet focus:ring-casper-violet/30"
          />
          Approve replies before they post
        </label>
        <p className="mt-1 text-[10px] leading-relaxed text-casper-ink/40">
          {settings.replyApproval !== false
            ? 'Nothing goes out under your name until you say so. Drafts wait in Review.'
            : 'Replies post automatically as soon as they are written.'}
        </p>
      </Section>

      <Section title="Reply tone" subtitle="Voice Ghostly247 uses when it auto-replies to posts.">
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

      <Section title="Reply length" subtitle="How long auto-replies are. Shorter feels more human.">
        <select
          value={settings.commentLength}
          onChange={(e) =>
            onChange({ ...settings, commentLength: Number(e.target.value) as CommentLength })
          }
          className="w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-sm focus:border-casper-violet focus:outline-none"
        >
          {COMMENT_LENGTHS.map((n) => (
            <option key={n} value={n}>
              {COMMENT_LENGTH_LABELS[n]}
            </option>
          ))}
        </select>
      </Section>

      <Section
        title="Account age (months)"
        subtitle="Newer accounts get safer caps. Left blank, I assume new and go at half pace."
      >
        <NumberField
          label="Twitter"
          value={settings.accountAgeMonths.twitter ?? 0}
          onChange={(n) => setAge('twitter', n > 0 ? n : null)}
          min={0}
          max={240}
        />
      </Section>

      <HomeFeedSection settings={settings} onChange={onChange} />

      <Section
        title="Auto follow-back"
        subtitle="Follow back people who follow you on Twitter/X — scrolls your Followers list and taps every 'Follow back' for you."
      >
        <label className="flex items-center justify-between">
          <span className="text-xs font-medium text-casper-ink">Follow back automatically</span>
          <button
            type="button"
            onClick={() => onChange({ ...settings, followBack: !settings.followBack })}
            aria-pressed={settings.followBack}
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
              settings.followBack
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-casper-ink/10 text-casper-ink/60'
            }`}
          >
            {settings.followBack ? 'On' : 'Off'}
          </button>
        </label>
        <p className="mt-1.5 text-[10px] text-casper-ink/40">
          When On, runs every ~30 min while Active. Bounded by your daily follow cap & whitelist.
        </p>
        <button
          type="button"
          onClick={runFollowBackNow}
          className="mt-2 w-full rounded-lg bg-casper-violet/10 px-3 py-2 text-[11px] font-medium text-casper-violet transition hover:bg-casper-violet/20"
        >
          Follow back now
        </button>
        {followBackStatus && (
          <p className="mt-2 text-[10px] text-casper-ink/50">{followBackStatus}</p>
        )}
      </Section>

      <SearchSection settings={settings} onChange={onChange} />

      <TargetsSection settings={settings} onChange={onChange} />

      <WhitelistSection settings={settings} onChange={onChange} />

      <DiagnosticsSection />

      <Section
        title="Maintenance"
        subtitle="Clear the action queue if Ghostly247 seems stuck on old tasks."
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
        onClick={() => {
          // Open Gmail's compose window (not the OS default mail app) so it works
          // straight from the browser the user is already signed into.
          const url =
            `https://mail.google.com/mail/?view=cm&fs=1&tf=1` +
            `&to=${encodeURIComponent(SUPPORT_EMAIL)}` +
            `&su=${encodeURIComponent('Ghostly247 Support Request')}` +
            `&body=${encodeURIComponent(`Hi Ghostly247 team,\n\n\n\n— Account: ${userEmail}`)}`;
          void chrome.tabs.create({ url });
        }}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-casper-border px-3 py-2.5 text-sm font-medium text-casper-ink/80 transition hover:bg-white/5"
      >
        <MailSmallIcon />
        Contact Support
      </button>

      <button
        type="button"
        onClick={onLogout}
        className="w-full rounded-lg border border-casper-border px-3 py-2.5 text-sm font-medium text-casper-ink/70 transition hover:bg-white/5"
      >
        Sign out
      </button>
    </div>
  );
};

const SUPPORT_EMAIL = 'support@ghostly247.com';

const MailSmallIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.8" />
    <path
      d="m4 7 8 6 8-6"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/* -- Review ---------------------------------------------------------------
 * The approval queue. Each card shows the post being answered next to the
 * reply Ghostly wrote, editable in place — because the whole point is that
 * nothing goes out under the user's name until they've read it.
 * ---------------------------------------------------------------------- */

const ReviewCard = ({
  reply,
  onApprove,
  onReject,
  busy,
}: {
  reply: PendingReply;
  onApprove: (id: string, text: string) => void;
  onReject: (id: string) => void;
  busy: boolean;
}) => {
  const [text, setText] = useState(reply.draftText);
  const edited = text.trim() !== reply.draftText.trim();

  return (
    <div className="rounded-2xl border border-casper-border bg-casper-surface p-3">
      {/* What we're replying to */}
      <a
        href={reply.postUrl}
        target="_blank"
        rel="noreferrer"
        className="mb-2 block rounded-xl bg-casper-cloud p-2.5 transition hover:bg-white/5"
      >
        {reply.authorHandle && (
          <p className="mb-1 text-[10px] font-medium text-casper-ink/50">
            @{reply.authorHandle.replace(/^@/, '')}
          </p>
        )}
        <p className="line-clamp-4 text-[11px] leading-snug text-casper-ink/60">
          {reply.postText || '(post text unavailable)'}
        </p>
      </a>

      {/* What Ghostly wants to say */}
      <p className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
        Your reply
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        className="w-full resize-none rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-[12px] leading-snug focus:border-casper-violet focus:outline-none"
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onApprove(reply.id, text)}
          disabled={busy || text.trim().length < 2}
          className="flex-1 rounded-lg bg-casper-violet py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {edited ? 'Post my version' : 'Post it'}
        </button>
        <button
          type="button"
          onClick={() => onReject(reply.id)}
          disabled={busy}
          className="rounded-lg border border-casper-border px-3 py-1.5 text-xs text-casper-ink/60 transition hover:bg-white/5 disabled:opacity-40"
        >
          Skip
        </button>
      </div>
    </div>
  );
};

const ReviewTab = () => {
  const [replies, setReplies] = useState<PendingReply[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);

  const load = async () => {
    const list = await getPendingReplies();
    setReplies([...list].sort((a, b) => b.createdAt - a.createdAt));
    setPaused((await getSettings()).isPaused);
  };

  useEffect(() => {
    void load();
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'local' && STORAGE_KEYS.pendingReplies in changes) void load();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const approve = async (id: string, text: string) => {
    setBusyId(id);
    setNote(null);
    try {
      const resp = await sendToBackground<
        { ok: true; data: { taskId: string } } | { ok: false; error: { message: string } | string }
      >({ type: 'APPROVE_DRAFT', payload: { id, text } });
      if (resp.ok) {
        // The engine posts it; if it's paused nothing will happen until the
        // user arms it, so say so rather than leaving them wondering.
        setNote(
          paused
            ? 'Approved — it posts as soon as you hit "● Active" up top.'
            : 'Approved — posting it now.',
        );
      } else {
        setNote(typeof resp.error === 'string' ? resp.error : resp.error.message);
      }
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setBusyId(null);
      await load();
    }
  };

  const reject = async (id: string) => {
    setBusyId(id);
    try {
      await sendToBackground({ type: 'REJECT_DRAFT', payload: { id } });
      setNote('Skipped — Ghostly won’t reply to that post.');
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'Skip failed');
    } finally {
      setBusyId(null);
      await load();
    }
  };

  if (replies === null) {
    return <p className="py-4 text-center text-xs text-casper-ink/40">Loading…</p>;
  }

  return (
    <div className="space-y-3">
      {note && (
        <div className="rounded-lg bg-casper-violet/10 px-3 py-2 text-[11px] text-casper-violet">
          {note}
        </div>
      )}

      {replies.length === 0 ? (
        <div className="flex h-[300px] flex-col items-center justify-center px-6 text-center">
          <div className="mb-2 text-3xl" aria-hidden>
            ✍️
          </div>
          <p className="text-xs text-casper-ink/70">Nothing waiting for you.</p>
          <p className="mt-1 text-[10px] leading-relaxed text-casper-ink/40">
            When auto-reply is on, every reply Ghostly writes lands here first. Read it, edit it if
            it isn&rsquo;t quite you, and post it — nothing goes out under your name until you say
            so.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <p className="text-xs font-semibold">
              {replies.length} waiting
              <span className="text-casper-ink/40"> / {REPLY_QUEUE_MAX}</span>
            </p>
            {replies.length >= REPLY_QUEUE_MAX && (
              <p className="text-[10px] text-casper-coral">Queue full — drafting paused</p>
            )}
          </div>
          {replies.map((reply) => (
            <ReviewCard
              key={reply.id}
              reply={reply}
              onApprove={approve}
              onReject={reject}
              busy={busyId === reply.id}
            />
          ))}
        </>
      )}
    </div>
  );
};

/* -- Growth ---------------------------------------------------------------
 * The scoreboard: what the automation GOT, not what it did. Everything here
 * comes from the daily growth scan reading the user's own profile.
 * ---------------------------------------------------------------------- */

const fmtNum = (n: number): string => n.toLocaleString();

/** Follower trend. Uniform-scaled points; a single reading renders as a dot. */
const Sparkline = ({ points }: { points: number[] }) => {
  const W = 400;
  const H = 64;
  const PAD = 6;
  if (points.length === 0) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  // A flat line (no growth yet) would divide by zero — park it mid-height.
  const span = max - min || 1;
  const x = (i: number): number => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
  const y = (v: number): number =>
    max === min ? H / 2 : H - PAD - ((v - min) / span) * (H - PAD * 2);

  const line = points.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-16 w-full"
      role="img"
      aria-label={`Follower trend over the last ${points.length} readings`}
    >
      <defs>
        <linearGradient id="ghostly-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f44d60" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#f44d60" stopOpacity="0" />
        </linearGradient>
      </defs>
      {points.length > 1 && (
        <>
          <polygon points={`0,${H} ${line} ${W},${H}`} fill="url(#ghostly-spark)" />
          <polyline
            points={line}
            fill="none"
            stroke="#f44d60"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
      <circle
        cx={x(points.length - 1)}
        cy={y(points[points.length - 1] ?? 0)}
        r="3"
        fill="#f44d60"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

/** One follower-change tile. Honest about short history: a 3-day-old install
 *  reports "+12 · 3d", never a made-up month. */
const DeltaTile = ({ label, delta }: { label: string; delta: GrowthDelta }) => {
  const has = delta.change !== null;
  const up = (delta.change ?? 0) > 0;
  const down = (delta.change ?? 0) < 0;
  return (
    <div className="rounded-xl border border-casper-border bg-casper-surface p-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold ${
          up ? 'text-emerald-300' : down ? 'text-rose-300' : 'text-casper-ink'
        }`}
      >
        {has ? `${up ? '+' : ''}${fmtNum(delta.change ?? 0)}` : '—'}
      </p>
      <p className="text-[10px] text-casper-ink/40">
        {has ? `over ${delta.days}d` : 'needs 2 readings'}
      </p>
    </div>
  );
};

const TopReply = ({ post }: { post: PostOutcome }) => (
  <a
    href={post.url}
    target="_blank"
    rel="noreferrer"
    className="block rounded-xl border border-casper-border bg-casper-surface p-2.5 transition hover:bg-white/5"
  >
    <div className="mb-1 flex items-center gap-3 text-[11px]">
      <span className="font-semibold text-casper-violet">♥ {fmtNum(post.likes)}</span>
      <span className="text-casper-ink/50">💬 {fmtNum(post.replies)}</span>
      {post.reposts > 0 && <span className="text-casper-ink/50">🔁 {fmtNum(post.reposts)}</span>}
      {post.views !== null && (
        <span className="ml-auto text-[10px] text-casper-ink/35">
          {fmtNum(post.views)} views
        </span>
      )}
    </div>
    <p className="line-clamp-2 text-[11px] leading-snug text-casper-ink/70">
      {post.text || (post.isReply ? '(reply)' : '(post)')}
    </p>
  </a>
);

const GrowthTab = () => {
  const [summary, setSummary] = useState<GrowthSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const resp = await sendToBackground<
        { ok: true; data: GrowthSummary } | { ok: false; error: { message: string } | string }
      >({ type: 'GET_GROWTH', payload: { days: 30 } });
      if (resp.ok) {
        setSummary(resp.data);
        setError(null);
      } else {
        setError(typeof resp.error === 'string' ? resp.error : resp.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  /** Reads the profile now. Takes a minute or two — the scan opens (background)
   *  tabs for the profile, the followers sample, and the replies timeline. */
  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const resp = await sendToBackground<
        { ok: true; data: { message: string } } | { ok: false; error: { message: string } | string }
      >({ type: 'REFRESH_GROWTH', payload: {} });
      if (!resp.ok) {
        setError(typeof resp.error === 'string' ? resp.error : resp.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'refresh failed');
    } finally {
      setRefreshing(false);
      await load();
    }
  };

  if (!loaded) {
    return <p className="py-4 text-center text-xs text-casper-ink/40">Loading…</p>;
  }

  const latest = summary?.latest ?? null;
  const series = summary?.series ?? [];
  const replies = summary?.replies;

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>
      )}

      {latest === null ? (
        <div className="flex h-[300px] flex-col items-center justify-center px-6 text-center">
          <div className="mb-2 text-3xl" aria-hidden>
            📈
          </div>
          <p className="text-xs text-casper-ink/70">No readings yet.</p>
          <p className="mt-1 text-[10px] leading-relaxed text-casper-ink/40">
            Ghostly checks your profile once a day and notes your followers, plus how the replies
            it left actually performed. Take the first reading now and come back tomorrow to see
            the line move.
          </p>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="mt-4 rounded-lg bg-casper-violet px-4 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {refreshing ? 'Reading your profile…' : 'Take the first reading'}
          </button>
        </div>
      ) : (
        <>
          {/* Headline: followers + trend */}
          <div className="rounded-2xl border border-casper-border bg-casper-surface p-3">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
                  Followers
                </p>
                <p className="text-2xl font-semibold">{fmtNum(latest.followers)}</p>
              </div>
              <p className="text-right text-[10px] text-casper-ink/40">
                {fmtNum(latest.following)} following
                {latest.posts !== null && <> · {fmtNum(latest.posts)} posts</>}
                <span className="block">read {latest.date}</span>
              </p>
            </div>
            <div className="mt-2">
              <Sparkline points={series.map((p) => p.followers)} />
            </div>
          </div>

          {/* Deltas */}
          {summary && (
            <div className="grid grid-cols-3 gap-2">
              <DeltaTile label="Today" delta={summary.deltas.day} />
              <DeltaTile label="7 days" delta={summary.deltas.week} />
              <DeltaTile label="30 days" delta={summary.deltas.month} />
            </div>
          )}

          {/* Follow-back payoff */}
          {latest.followedBack !== null && latest.followedBackSample ? (
            <div className="rounded-xl border border-casper-border bg-casper-surface p-3">
              <p className="text-[11px] text-casper-ink/70">
                <span className="font-semibold text-casper-violet">
                  {fmtNum(latest.followedBack)}
                </span>{' '}
                of your last {fmtNum(latest.followedBackSample)} followers are accounts Ghostly
                followed first.
              </p>
            </div>
          ) : null}

          {/* Reply performance */}
          <div className="rounded-2xl border border-casper-border bg-casper-surface p-3">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-xs font-semibold">Your replies</p>
              <p className="text-[10px] text-casper-ink/40">
                {replies?.tracked ?? 0} measured · {fmtNum(replies?.totalLikes ?? 0)} likes · avg{' '}
                {replies?.avgLikes ?? 0}
              </p>
            </div>
            {replies && replies.top.length > 0 ? (
              <div className="space-y-2">
                {replies.top.map((post) => (
                  <TopReply key={post.tweetId} post={post} />
                ))}
              </div>
            ) : (
              <p className="py-3 text-center text-[10px] text-casper-ink/40">
                Nothing measured yet — replies show up here after the next daily reading.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="w-full rounded-lg border border-casper-border py-2 text-xs font-medium text-casper-ink/70 transition hover:bg-white/5 disabled:opacity-50"
          >
            {refreshing ? 'Reading your profile…' : 'Refresh now'}
          </button>
        </>
      )}
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
            Once Ghostly247 acts on your behalf, you'll see it here.
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

const formatWhen = (ms: number): string =>
  new Date(ms).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

const POST_LENGTHS: { id: PostLength; label: string }[] = [
  { id: 'short', label: 'Short · 280' },
  { id: 'mid', label: 'Medium · 1k' },
  { id: 'long', label: 'Long · 4k' },
];

const POST_STATUS: Record<ScheduledPost['status'], { label: string; cls: string }> = {
  scheduled: { label: 'Scheduled', cls: 'bg-casper-violet/15 text-casper-violet' },
  publishing: { label: 'Posting…', cls: 'bg-amber-500/15 text-amber-300' },
  posted: { label: 'Posted', cls: 'bg-emerald-500/15 text-emerald-300' },
  failed: { label: 'Failed', cls: 'bg-rose-500/15 text-rose-300' },
};

const ScheduleTab = ({
  settings,
  onChange,
}: {
  settings: ExtensionSettings;
  onChange: (s: ExtensionSettings) => void;
}) => {
  const isPaused = settings.isPaused;
  const plan = settings.xAccountPlan;
  const limit = tweetLimitFor(plan, settings.postLength);
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [max, setMax] = useState(5);
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [image, setImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [text, setText] = useState('');
  const [when, setWhen] = useState(() => toDateInputValue(new Date()));
  // Default to an hour out rather than "now", so a post scheduled in a hurry
  // doesn't fire on the very next tick before it's been read back.
  const [atTime, setAtTime] = useState(() =>
    toTimeInputValue(new Date(Date.now() + 60 * 60 * 1000)),
  );
  /** Follow-up tweets. One entry per box shown under the main text. */
  const [thread, setThread] = useState<string[]>([]);
  const [ideas, setIdeas] = useState<string[] | null>(null);
  const [ideasBusy, setIdeasBusy] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = async () => {
    const r = await sendToBackground<
      { ok: true; data: { posts: ScheduledPost[]; max: number } } | { ok: false }
    >({ type: 'LIST_SCHEDULED_POSTS', payload: {} });
    if (r.ok) {
      setPosts(r.data.posts);
      setMax(r.data.max);
    }
  };

  useEffect(() => {
    void refresh();
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'local' && STORAGE_KEYS.scheduledPosts in changes) void refresh();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const pending = posts.filter((p) => p.status === 'scheduled' || p.status === 'publishing');
  const history = posts.filter((p) => p.status === 'posted' || p.status === 'failed');
  const atLimit = pending.length >= max;

  const onPickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError('Image is too large (max 3 MB).');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImage({ dataUrl: String(reader.result), name: file.name });
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const generate = async () => {
    if (!description.trim()) {
      setError('Write a short description first.');
      return;
    }
    setGenerating(true);
    setError(null);
    try {
      const r = await sendToBackground<
        { ok: true; data: { text: string } } | { ok: false; error: { message: string } }
      >({
        type: 'GENERATE_POST',
        payload: { description: description.trim(), link: link.trim() || undefined },
      });
      if (r.ok) setText(r.data.text);
      else setError(r.error.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setGenerating(false);
    }
  };

  const schedule = async () => {
    if (!text.trim()) {
      setError('Add some post text (or generate it).');
      return;
    }
    if (effectivePostLength(text.trim(), link) > limit) {
      setError(`Post is over the ${limit}-character limit — trim it before scheduling.`);
      return;
    }
    const today = toDateInputValue(new Date());
    if (!when || when < today) {
      setError('Pick today or a future day.');
      return;
    }
    const ts = localDateTime(when, atTime);
    if (!Number.isFinite(ts)) {
      setError('Pick a valid day and time.');
      return;
    }
    // A slot in the past would fire on the very next tick, which is never what
    // someone picking a time meant.
    if (ts < Date.now() - 60_000) {
      setError('That time has already passed today — pick a later one.');
      return;
    }
    const parts = thread.map((t) => t.trim()).filter(Boolean);
    const tooLong = parts.find((t) => t.length > limit);
    if (tooLong) {
      setError(`One of the thread tweets is over the ${limit}-character limit.`);
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const r = await sendToBackground<
        { ok: true } | { ok: false; error: { message: string } }
      >({
        type: 'SCHEDULE_POST',
        payload: {
          text: text.trim(),
          link: link.trim(),
          imageDataUrl: image?.dataUrl ?? null,
          scheduledAt: ts,
          ...(parts.length > 0 ? { thread: parts } : {}),
        },
      });
      if (r.ok) {
        setDescription('');
        setLink('');
        setImage(null);
        setText('');
        setThread([]);
        setWhen(toDateInputValue(new Date()));
        setAtTime(toTimeInputValue(new Date(Date.now() + 60 * 60 * 1000)));
        setNotice('Scheduled ✓');
        await refresh();
      } else {
        setError(r.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    await sendToBackground({ type: 'DELETE_SCHEDULED_POST', payload: { id } });
    await refresh();
  };

  /**
   * Ask for a few post ideas, written in the user's trained voice and informed
   * by which of their own posts performed. They land as suggestions, never on
   * the schedule — publishing under someone's name stays their decision.
   */
  const suggest = async () => {
    setIdeasBusy(true);
    setError(null);
    try {
      const r = await sendToBackground<
        | { ok: true; data: { ideas: string[]; basedOnWinners: number } }
        | { ok: false; error: { message: string } | string }
      >({ type: 'GENERATE_IDEAS', payload: { count: 3 } });
      if (r.ok) {
        setIdeas(r.data.ideas);
        setNotice(
          r.data.basedOnWinners > 0
            ? `Drafted from your ${r.data.basedOnWinners} best-performing posts.`
            : 'Drafted from your topics. Once the growth scan has measured a few posts, these get better.',
        );
      } else {
        setError(typeof r.error === 'string' ? r.error : r.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setIdeasBusy(false);
    }
  };

  // Count the way X does: the text plus the attached link (23 + a 2-char join).
  const effectiveLen = effectivePostLength(text, link);
  const over = effectiveLen > limit;

  return (
    <div className="space-y-4 text-xs">
      <div className="rounded-2xl border border-casper-violet/20 bg-casper-violet/5 p-3">
        <p className="font-medium text-casper-ink">Create &amp; schedule a post ✍️</p>
        <p className="mt-1 text-[10px] leading-relaxed text-casper-ink/60">
          Describe your post, let AI draft it, add a link or image, and pick a day. Ghostly247
          posts it through your own X session that day, the next time your browser is open and
          signed in. It posts even while the engine is paused; delete one to cancel.
        </p>
      </div>

      <Section
        title="Your X account"
        subtitle={
          plan === 'pro'
            ? `X Premium — posts up to ${limit.toLocaleString()} characters.`
            : 'Free account — posts are limited to 280 characters.'
        }
      >
        <div className="flex gap-2">
          {(['free', 'pro'] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChange({ ...settings, xAccountPlan: p })}
              aria-pressed={plan === p}
              className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                plan === p
                  ? 'bg-casper-violet text-white'
                  : 'border border-casper-ink/10 text-casper-ink/70 hover:bg-white/5'
              }`}
            >
              {p === 'free' ? 'Free · 280' : 'Pro · long posts'}
            </button>
          ))}
        </div>

        {plan === 'pro' && (
          <div className="mt-3">
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
              Post length
            </p>
            <div className="flex gap-2">
              {POST_LENGTHS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onChange({ ...settings, postLength: l.id })}
                  aria-pressed={settings.postLength === l.id}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-[11px] font-medium transition ${
                    settings.postLength === l.id
                      ? 'bg-casper-violet text-white'
                      : 'border border-casper-ink/10 text-casper-ink/70 hover:bg-white/5'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </Section>

      <Section title="New post" subtitle={`${pending.length} / ${max} scheduled`}>
        <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
          What's the post about?
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="e.g. why I stopped using keyword filters and switched to intent-based targeting"
          className="w-full resize-none rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
        />

        <label className="mb-1.5 mt-3 block font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
          Link (optional)
        </label>
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
        />

        <label className="mb-1.5 mt-3 block font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
          Image (optional)
        </label>
        {image ? (
          <div className="flex items-center gap-2">
            <img
              src={image.dataUrl}
              alt="attachment"
              className="h-12 w-12 flex-none rounded-lg border border-casper-border object-cover"
            />
            <span className="flex-1 truncate text-[10px] text-casper-ink/50">{image.name}</span>
            <button
              type="button"
              onClick={() => setImage(null)}
              className="rounded px-2 py-0.5 text-[10px] text-rose-400 hover:bg-rose-500/10"
            >
              Remove
            </button>
          </div>
        ) : (
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-casper-ink/10 bg-casper-cloud px-3 py-1.5 text-[11px] text-casper-ink/70 transition hover:bg-white/5">
            Choose image
            <input type="file" accept="image/*" onChange={onPickImage} className="hidden" />
          </label>
        )}

        <button
          type="button"
          onClick={generate}
          disabled={generating || !description.trim()}
          className="mt-3 w-full rounded-lg bg-casper-violet/10 px-3 py-2 text-[11px] font-medium text-casper-violet transition hover:bg-casper-violet/20 disabled:opacity-50"
        >
          {generating ? 'Drafting…' : text ? 'Re-draft with AI' : 'Draft with AI ✨'}
        </button>

        <label className="mb-1.5 mt-3 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
          <span>Post text</span>
          <span className={over ? 'text-rose-400' : 'text-casper-ink/40'}>
            {effectiveLen}/{limit}
          </span>
        </label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder="Your tweet — draft it with AI above, or write it yourself."
          className={`w-full resize-y whitespace-pre-wrap rounded-lg border bg-casper-cloud px-2 py-1.5 text-xs leading-relaxed focus:outline-none ${
            over ? 'border-rose-500/50' : 'border-casper-ink/10 focus:border-casper-violet'
          }`}
        />
        {over ? (
          <p className="mt-1 text-[10px] text-rose-400">
            Over the {limit}-character limit
            {link.trim() ? ' (your link counts as 23 characters)' : ''} — trim it before scheduling.
          </p>
        ) : (
          link.trim() && (
            <p className="mt-1 text-[10px] text-casper-ink/40">
              Your link counts as 23 characters toward the {limit} limit.
            </p>
          )
        )}

        {/* Thread: each box is one more tweet after the opener. */}
        {thread.map((part, i) => (
          <div key={i} className="mt-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
                Thread · {i + 2}
              </span>
              <button
                type="button"
                onClick={() => setThread(thread.filter((_, j) => j !== i))}
                className="text-[10px] text-casper-ink/40 transition hover:text-casper-coral"
              >
                Remove
              </button>
            </div>
            <textarea
              value={part}
              onChange={(e) =>
                setThread(thread.map((t, j) => (j === i ? e.target.value : t)))
              }
              rows={2}
              placeholder="Next tweet in the thread…"
              className={`w-full resize-none rounded-lg border bg-casper-cloud px-2 py-1.5 text-xs focus:outline-none ${
                part.length > limit
                  ? 'border-rose-500/50'
                  : 'border-casper-ink/10 focus:border-casper-violet'
              }`}
            />
          </div>
        ))}
        <button
          type="button"
          onClick={() => setThread([...thread, ''])}
          className="mt-2 w-full rounded-lg border border-casper-border py-1.5 text-[11px] text-casper-ink/60 transition hover:bg-white/5"
        >
          + Add to thread
        </button>

        <div className="mt-3 border-t border-casper-border pt-3">
          <label className="mb-1.5 block font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
            What you post about
          </label>
          <input
            value={settings.contentTopics.join(', ')}
            onChange={(e) =>
              onChange({
                ...settings,
                contentTopics: e.target.value
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
                  .slice(0, 10),
              })
            }
            placeholder="building in public, design, indie hacking"
            className="mb-2 w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
          />
          <button
            type="button"
            onClick={suggest}
            disabled={ideasBusy}
            className="w-full rounded-lg border border-casper-violet/40 bg-casper-violet/10 py-1.5 text-[11px] font-medium text-casper-violet transition hover:bg-casper-violet/20 disabled:opacity-40"
          >
            {ideasBusy ? 'Thinking…' : '✨ Suggest posts for me'}
          </button>
          {ideas && ideas.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {ideas.map((idea, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setText(idea);
                    setIdeas(null);
                    setNotice('Loaded into the composer — edit it before you schedule.');
                  }}
                  className="block w-full rounded-lg border border-casper-border bg-casper-cloud p-2 text-left text-[11px] leading-snug text-casper-ink/75 transition hover:bg-white/5"
                >
                  {idea.length > 220 ? `${idea.slice(0, 220)}…` : idea}
                </button>
              ))}
              <p className="text-[10px] text-casper-ink/40">
                Tap one to load it into the composer. Nothing is scheduled until you say so.
              </p>
            </div>
          )}
        </div>

        <label className="mb-1.5 mt-3 block font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
          Post at
        </label>
        <div className="flex gap-2">
          <input
            type="date"
            value={when}
            min={toDateInputValue(new Date())}
            onChange={(e) => setWhen(e.target.value)}
            className="flex-1 rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
          />
          <input
            type="time"
            value={atTime}
            onChange={(e) => setAtTime(e.target.value)}
            className="w-28 rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
          />
        </div>
        <p className="mt-1 text-[10px] text-casper-ink/40">
          Goes out at this time, the next time your browser is open. If it's closed at that
          moment, it posts as soon as you open Ghostly247 afterwards.
        </p>

        {atLimit && (
          <p className="mt-2 text-[10px] text-amber-300">
            You've hit the {max}-post limit. Delete a scheduled post below to add another.
          </p>
        )}
        <button
          type="button"
          onClick={schedule}
          disabled={busy || atLimit || !text.trim() || over}
          className="mt-3 w-full rounded-lg bg-casper-violet px-3 py-2 text-[11px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? 'Scheduling…' : 'Schedule post'}
        </button>
        {error && <p className="mt-2 text-[10px] text-rose-400">✗ {error}</p>}
        {notice && <p className="mt-2 text-[10px] text-emerald-300">{notice}</p>}
        {isPaused && pending.length > 0 && (
          <p className="mt-2 text-[10px] text-casper-ink/40">
            Heads up: scheduled posts still publish on their day even though the engine is paused.
          </p>
        )}
      </Section>

      {pending.length > 0 && (
        <Section title="Scheduled">
          <ul className="space-y-2">
            {pending
              .slice()
              .sort((a, b) => a.scheduledAt - b.scheduledAt)
              .map((p) => (
                <PostRow key={p.id} post={p} onDelete={() => remove(p.id)} />
              ))}
          </ul>
        </Section>
      )}

      {history.length > 0 && (
        <Section title="Recent">
          <ul className="space-y-2">
            {history
              .slice()
              .sort((a, b) => (b.postedAt ?? b.createdAt) - (a.postedAt ?? a.createdAt))
              .slice(0, 10)
              .map((p) => (
                <PostRow key={p.id} post={p} onDelete={() => remove(p.id)} />
              ))}
          </ul>
        </Section>
      )}
    </div>
  );
};

const PostRow = ({ post, onDelete }: { post: ScheduledPost; onDelete: () => void }) => {
  const s = POST_STATUS[post.status];
  return (
    <li className="rounded-xl bg-casper-cloud p-2.5">
      <div className="flex items-start gap-2">
        {post.imageDataUrl && (
          <img
            src={post.imageDataUrl}
            alt=""
            className="h-10 w-10 flex-none rounded-md border border-casper-border object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="line-clamp-3 whitespace-pre-wrap text-[11px] text-casper-ink/80">
            {post.text}
          </p>
          {post.link && (
            <p className="mt-0.5 truncate text-[10px] text-casper-violet">{post.link}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete"
          className="rounded px-1.5 py-0.5 text-[12px] text-rose-400 hover:bg-rose-500/10"
        >
          ×
        </button>
      </div>
      <div className="mt-1.5 flex items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${s.cls}`}>{s.label}</span>
        <span className="text-[10px] text-casper-ink/40">
          {formatWhen(post.scheduledAt)}
          {post.thread && post.thread.length > 0 && (
            <span className="ml-1 text-casper-violet">· thread of {post.thread.length + 1}</span>
          )}
        </span>
        {post.status === 'failed' && post.error && (
          <span className="truncate text-[10px] text-rose-400/80" title={post.error}>
            · {post.error}
          </span>
        )}
      </div>
    </li>
  );
};

const PLAN_LABELS: Record<SubscriptionPlan, { label: string; price: string }> = {
  free: { label: 'Free', price: '$0' },
  weekly: {
    label: PLAN_PRICING.weekly.label,
    price: `${PLAN_PRICING.weekly.amount}/wk`,
  },
  monthly: {
    label: PLAN_PRICING.monthly.label,
    price: `${PLAN_PRICING.monthly.amount}/mo`,
  },
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
  const monthlyUsed = monthlyActionsUsed(user);
  const monthlyCap = FREE_TIER.monthlyActions;
  const exhausted = !pro && monthlyUsed >= monthlyCap;

  return (
    <Section
      title="Plan"
      subtitle={
        pro
          ? 'Ghostly247 Pro · unlimited actions'
          : `Free · all features, ${monthlyCap} actions per month (likes + replies + follows)`
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
            <span>Free actions used this month</span>
            <span>
              {Math.min(monthlyUsed, monthlyCap)} / {monthlyCap}
            </span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-casper-ink/10">
            <div
              className={`h-full rounded-full ${exhausted ? 'bg-rose-500' : 'bg-casper-violet'}`}
              style={{
                width: `${Math.min(100, (monthlyUsed / monthlyCap) * 100)}%`,
              }}
            />
          </div>
          {exhausted && (
            <p className="mt-2 text-[10px] text-rose-400">
              You've used all {monthlyCap} free actions this month. Upgrade for unlimited.
            </p>
          )}
        </div>
      )}

      {pro ? (
        <button
          type="button"
          onClick={manage}
          disabled={busy === 'portal'}
          className="w-full rounded-lg border border-casper-border px-3 py-2 text-[11px] text-casper-ink/80 transition hover:bg-white/5 disabled:opacity-50"
        >
          {busy === 'portal' ? 'Opening…' : 'Manage subscription'}
        </button>
      ) : (
        <div className="space-y-1.5">
          <UpgradeButton
            label={`Monthly · ${PLAN_PRICING.monthly.amount}`}
            sub="Best value · cancel anytime"
            highlight={true}
            busy={busy === 'monthly'}
            onClick={() => upgrade('monthly')}
          />
          <UpgradeButton
            label={`Weekly · ${PLAN_PRICING.weekly.amount}`}
            sub="Try it for a week · cancel anytime"
            highlight={false}
            busy={busy === 'weekly'}
            onClick={() => upgrade('weekly')}
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
      subtitle="Ghostly247 will never follow accounts on this list."
    >
      <div className="flex gap-2">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          className="rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs"
        >
          <option value="twitter">twitter</option>
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
  const [excludeText, setExcludeText] = useState(hf.excludeKeywords.join(', '));
  const [scanStatus, setScanStatus] = useState<string | null>(null);

  const update = (patch: Partial<typeof hf>) =>
    onChange({ ...settings, homeFeed: { ...hf, ...patch } });

  const commitExclude = () => {
    const list = excludeText
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    update({ excludeKeywords: list });
  };

  const commitKeywords = () => {
    const list = keywordText
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);
    update({ keywords: list });
    // Persist to the DB so they survive reinstalls and sync across devices.
    void sendToBackground({ type: 'UPDATE_PREFERENCES', payload: { keywords: list } }).catch(
      () => {},
    );
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
      subtitle="Ghostly247 scrolls your own timeline and engages with relevant posts."
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
              Actions
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
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
              <Check
                checked={hf.bookmark}
                onToggle={() => update({ bookmark: !hf.bookmark })}
                label="Bookmark"
              />
              <Check
                checked={hf.repost}
                onToggle={() => update({ repost: !hf.repost })}
                label="Repost"
              />
              <Check
                checked={hf.quote}
                onToggle={() => update({ quote: !hf.quote })}
                label="Quote"
              />
            </div>
            {hf.comment && (
              <p className="mt-2 text-[10px] text-casper-ink/40">
                Ghostly247 posts a short, relevant reply automatically. Bounded by your daily caps &
                relevance keywords — toggle the Active pill to stop everything instantly. Free plan:
                50 actions per month (likes + replies + follows). Needs your Ghostly247 server running.
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

          <div>
            <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-casper-ink/40">
              Exclude keywords
            </p>
            <input
              type="text"
              value={excludeText}
              onChange={(e) => setExcludeText(e.target.value)}
              onBlur={commitExclude}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitExclude();
              }}
              placeholder="politics, nsfw, crypto (comma-separated)"
              className="w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-casper-ink/40">
              Skip any post containing these words — even if it matches above.
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

const SearchSection = ({
  settings,
  onChange,
}: {
  settings: ExtensionSettings;
  onChange: (s: ExtensionSettings) => void;
}) => {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const queries = settings.searchQueries;
  const full = queries.length >= MAX_SEARCH_QUERIES;

  const add = () => {
    const clean = query.trim();
    if (!clean || full) return;
    if (queries.some((q) => q.query.toLowerCase() === clean.toLowerCase())) {
      setQuery('');
      return;
    }
    const next: SearchQuery = { query: clean, addedAt: new Date().toISOString() };
    onChange({ ...settings, searchQueries: [...queries, next] });
    setQuery('');
  };

  const remove = (q: SearchQuery) =>
    onChange({ ...settings, searchQueries: queries.filter((x) => x.query !== q.query) });

  const runNow = async (q: SearchQuery) => {
    setStatus('Starting…');
    try {
      await sendToBackground({ type: 'SCAN_SEARCH_NOW', payload: { query: q.query } });
      setStatus(
        settings.isPaused
          ? 'Queued — but the engine is Paused. Hit "● Active" up top so it runs.'
          : `Working the Latest results for "${q.query}"…`,
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'failed');
    }
  };

  return (
    <Section
      title="Topic feeds"
      subtitle="Work X's Latest results for a topic, instead of whatever the home feed serves you."
    >
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && add()}
          placeholder="indie hackers"
          disabled={full}
          className="flex-1 rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-sm focus:border-casper-violet focus:outline-none disabled:opacity-50"
        />
        <button
          type="button"
          onClick={add}
          disabled={full}
          className="rounded-lg bg-casper-violet px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          Add
        </button>
      </div>
      <p className="mt-1 text-[10px] text-casper-ink/40">
        {full
          ? `That's the limit of ${MAX_SEARCH_QUERIES} feeds.`
          : `X's search operators work here — try "indie hackers min_faves:5 -filter:replies".`}
      </p>

      {queries.length > 0 && (
        <div className="mt-2 space-y-1.5">
          {queries.map((q) => (
            <div
              key={q.query}
              className="flex items-center gap-2 rounded-lg bg-casper-cloud px-2 py-1.5"
            >
              <span className="flex-1 truncate text-[11px]" title={q.query}>
                {q.query}
              </span>
              <button
                type="button"
                onClick={() => runNow(q)}
                className="text-[10px] text-casper-violet transition hover:opacity-80"
              >
                Run now
              </button>
              <button
                type="button"
                onClick={() => remove(q)}
                aria-label="Remove"
                className="text-casper-ink/30 transition hover:text-casper-coral"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
      {status && <p className="mt-2 text-[10px] text-casper-ink/50">{status}</p>}

      <label className="mt-3 flex items-center gap-2 border-t border-casper-border pt-3 text-xs text-casper-ink/80">
        <input
          type="checkbox"
          checked={settings.skipReplies !== false}
          onChange={() => onChange({ ...settings, skipReplies: !(settings.skipReplies !== false) })}
          className="h-3.5 w-3.5 rounded border-casper-ink/20 text-casper-violet focus:ring-casper-violet/30"
        />
        Skip posts buried in someone else&rsquo;s thread
      </label>
      <p className="mt-1 text-[10px] leading-relaxed text-casper-ink/40">
        A reply inside a thread costs the same daily budget as a top-level post and reaches a
        fraction of the people.
      </p>
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
    setScanStatus(`Visiting @${target.handle}…`);
    try {
      await sendToBackground({
        type: 'SCAN_TARGET_NOW',
        payload: { platform: target.platform, handle: target.handle },
      });
      setScanStatus(
        settings.isPaused
          ? `Queued — but the engine is Paused. Hit "● Active" up top so it runs.`
          : `Visiting @${target.handle} now — a tab opens and likes their recent posts.`,
      );
    } catch (err) {
      setScanStatus(err instanceof Error ? err.message : 'failed');
    }
  };

  const scanFollowersNow = async (target: TargetCreator) => {
    setScanStatus(`Scanning @${target.handle}'s followers…`);
    try {
      await sendToBackground({
        type: 'SCAN_FOLLOWERS_NOW',
        payload: { platform: target.platform, handle: target.handle },
      });
      setScanStatus(
        settings.isPaused
          ? `Queued — but the engine is Paused. Hit "● Active" up top so it runs.`
          : `Finding @${target.handle}'s followers to follow…`,
      );
    } catch (err) {
      setScanStatus(err instanceof Error ? err.message : 'failed');
    }
  };

  return (
    <Section
      title="Target creators"
      subtitle='Add a creator, make sure the engine is "● Active", then tap Like posts — Ghostly247 visits their profile and likes their recent posts in one tab.'
    >
      <div className="flex gap-2">
        <select
          value={platform}
          onChange={(e) => setPlatform(e.target.value as Platform)}
          className="rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs"
        >
          <option value="twitter">twitter</option>
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
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => scanNow(t)}
                  className="rounded-md border border-casper-violet/30 bg-casper-violet/10 px-2 py-0.5 text-[10px] font-medium text-casper-violet transition hover:bg-casper-violet/20"
                  title="Visit this profile and like their recent posts"
                >
                  Like posts
                </button>
                <button
                  type="button"
                  onClick={() => scanFollowersNow(t)}
                  className="rounded-md border border-casper-ink/10 px-2 py-0.5 text-[10px] text-casper-ink/70 transition hover:bg-white/5"
                  title="Find this creator's followers and follow them"
                >
                  Followers
                </button>
                <button
                  type="button"
                  onClick={() => remove(t)}
                  aria-label="Remove"
                  className="rounded px-1.5 py-0.5 text-[12px] text-rose-400 hover:bg-rose-500/10"
                >
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      {scanStatus && <p className="mt-2 text-[10px] text-casper-ink/50">{scanStatus}</p>}
          <label className="mt-3 flex items-center gap-2 border-t border-casper-border pt-3 text-xs text-casper-ink/80">
        <input
          type="checkbox"
          checked={settings.earlyReply === true}
          onChange={() => onChange({ ...settings, earlyReply: !settings.earlyReply })}
          className="h-3.5 w-3.5 rounded border-casper-ink/20 text-casper-violet focus:ring-casper-violet/30"
        />
        Reply early to new posts
      </label>
      <p className="mt-1 text-[10px] leading-relaxed text-casper-ink/40">
        {settings.earlyReply
          ? 'Checking one creator every few minutes and engaging only posts from the last few hours — so your reply lands while the thread is still short.'
          : 'Off: creators are swept every 6 hours, so a reply may arrive long after the post did.'}
      </p>
</Section>
  );
};
