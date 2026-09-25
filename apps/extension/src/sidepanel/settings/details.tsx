import { useEffect, useState } from 'react';
import type { ExtensionSettings, PaidPlan, SafetyPresetName, User, VoiceProfile } from '@casper/shared';
import { COMMENT_LENGTHS, PAID_PLANS, PLAN_PRICING, TONE_PRESETS, VOICE_LIMITS, isPro } from '@casper/shared';
import { CreditCardIcon, Delete02Icon, GiftIcon, Mic01Icon, UserAdd01Icon } from '@hugeicons/core-free-icons';
import { sendToBackground } from '../../lib/messages.js';
import {
  appendGrowthMilestone,
  clearDiagnostics,
  getAuth as getStoredAuth,
  getDiagnostics,
  type DiagnosticEntry,
} from '../../lib/storage.js';
import { SAFETY_PRESETS, applyPreset } from '../../lib/presets.js';
import { COMMENT_LENGTH_LABELS } from '../pages/_shared.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { HomeFeedDetail, TargetsDetail, TopicFeedsDetail, WhitelistDetail } from './sources';
import { AppearanceDetail } from './AppearanceDetail';
import { LimitsDetail } from './LimitsDetail';
import { InviteDetail } from './InviteDetail';
import { Slider } from '@/components/ui/slider';
import { AccentButton, Group, Pad, Row, ProBadge } from './kit';

export type DetailKey =
  | 'appearance'
  | 'limits'
  | 'invite'
  | 'plan'
  | 'intensity'
  | 'hours'
  | 'trust'
  | 'homeFeed'
  | 'topics'
  | 'targets'
  | 'whitelist'
  | 'followBack'
  | 'voice'
  | 'tone'
  | 'length'
  | 'diagnostics';

export const DETAIL_TITLES: Record<DetailKey, string> = {
  appearance: 'Appearance',
  limits: 'Limits',
  invite: 'Invite Friends',
  plan: 'Plan',
  intensity: 'Work pace',
  hours: 'Active hours',
  trust: 'Posting on my own',
  homeFeed: 'Home feed',
  topics: 'Topic feeds',
  targets: 'Target creators',
  whitelist: 'Whitelist',
  followBack: 'Auto follow-back',
  voice: 'Your voice',
  tone: 'Reply tone',
  length: 'Reply length',
  diagnostics: 'Diagnostics',
};

interface DetailProps {
  settings: ExtensionSettings;
  update: (next: ExtensionSettings) => void;
  reload: () => void;
  user: User;
  /** Jump to another detail page (e.g. Limits → Plan). */
  go?: (key: DetailKey) => void;
}

const hh = (h: number) => `${String(h).padStart(2, '0')}:00`;

export const Detail = ({ id, ...p }: DetailProps & { id: DetailKey }) => {
  switch (id) {
    case 'appearance':
      return <AppearanceDetail />;
    case 'limits':
      return (
        <LimitsDetail
          settings={p.settings}
          user={p.user}
          onUpgrade={() => p.go?.('plan')}
          onInvite={() => p.go?.('invite')}
        />
      );
    case 'invite':
      return <InviteDetail />;
    case 'plan':
      return <PlanDetail user={p.user} onInvite={() => p.go?.('invite')} />;
    case 'intensity':
      return <IntensityDetail {...p} />;
    case 'hours':
      return <HoursDetail {...p} />;
    case 'trust':
      return <TrustDetail {...p} />;
    case 'homeFeed':
      return <HomeFeedDetail settings={p.settings} onChange={p.update} />;
    case 'topics':
      return <TopicFeedsDetail settings={p.settings} onChange={p.update} />;
    case 'targets':
      return <TargetsDetail settings={p.settings} onChange={p.update} />;
    case 'whitelist':
      return <WhitelistDetail settings={p.settings} onChange={p.update} />;
    case 'followBack':
      return <FollowBackDetail {...p} />;
    case 'voice':
      return <VoiceDetail />;
    case 'tone':
      return (
        <Group label="Tone" footer="Used when no learned voice is set. A learned voice always wins.">
          {TONE_PRESETS.map((t) => (
            <Row
              key={t}
              label={t.charAt(0).toUpperCase() + t.slice(1)}
              selected={p.settings.tone === t}
              onClick={() => p.update({ ...p.settings, tone: t })}
            />
          ))}
        </Group>
      );
    case 'length':
      return (
        <Group label="Length" footer="How long auto-replies are. Shorter feels more human.">
          {COMMENT_LENGTHS.map((n) => (
            <Row
              key={n}
              label={COMMENT_LENGTH_LABELS[n]}
              selected={p.settings.commentLength === n}
              onClick={() => p.update({ ...p.settings, commentLength: n })}
            />
          ))}
        </Group>
      );
    case 'diagnostics':
      return <DiagnosticsDetail />;
  }
};

const PlanDetail = ({ user, onInvite }: { user: User; onInvite: () => void }) => {
  const [plan, setPlan] = useState<PaidPlan>(PAID_PLANS[PAID_PLANS.length - 1]!);
  const pro = isPro(user.subscriptionStatus ?? 'free');

  if (pro) {
    return (
      <Group label="Your plan" footer="Everything unlocked, with no monthly limit on what I do for you.">
        <Row label="Ghostly247" value={<ProBadge />} />
        <Row
          icon={CreditCardIcon}
          label="Manage billing"
          onClick={() => void sendToBackground({ type: 'OPEN_BILLING_PORTAL', payload: {} })}
        />
      </Group>
    );
  }

  return (
    <>
      <Group label="Choose a plan" footer="Cancel any time. Every feature already works on Free — Pro removes the monthly action limit.">
        {PAID_PLANS.map((id) => (
          <Row
            key={id}
            label={`${PLAN_PRICING[id].amount} a ${PLAN_PRICING[id].per}`}
            selected={plan === id}
            onClick={() => setPlan(id)}
          />
        ))}
      </Group>
      <AccentButton onClick={() => void sendToBackground({ type: 'START_CHECKOUT', payload: { plan } })}>
        Continue to checkout
      </AccentButton>
      <Group footer="Not ready to pay? Every friend who signs up with your link gets you both free credits — one credit is one extra action.">
        <Row
          icon={GiftIcon}
          label="Earn free credits"
          hint="Invite friends to Ghostly247"
          value={user.bonusCredits ? `${user.bonusCredits} now` : undefined}
          onClick={onInvite}
        />
      </Group>
    </>
  );
};

/** 45 → "45 min", 90 → "1 h 30 min", 120 → "2 h". */
const duration = (m: number) => {
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h === 0 ? `${r} min` : r === 0 ? `${h} h` : `${h} h ${r} min`;
};

/** A labelled slider row: the name, the current value, the slider, the ends. */
const SliderRow = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) => (
  <Pad className="flex flex-col gap-3">
    <div className="flex items-baseline justify-between text-[15px]">
      <span>{label}</span>
      <span className="font-display font-bold text-primary tabular-nums">{duration(value)}</span>
    </div>
    <Slider
      min={min}
      max={max}
      step={step}
      value={value}
      onValueChange={(v) => onChange(Array.isArray(v) ? (v[0] ?? min) : v)}
      aria-label={label}
    />
    <div className="flex justify-between text-xs text-muted-foreground">
      <span>{duration(min)}</span>
      <span>{duration(max)}</span>
    </div>
  </Pad>
);

const IntensityDetail = ({ settings, update }: DetailProps) => (
  <Group
    label="How hard I work"
    footer="One choice — it moves the daily caps, the pacing, the hourly ceiling, the work and break lengths, and which actions are on. Fine-tune sessions in Active hours."
  >
    {(['careful', 'balanced', 'growth'] as SafetyPresetName[]).map((name) => {
      const preset = SAFETY_PRESETS[name];
      const on = settings.safetyPreset === name;
      return (
        <Row
          key={name}
          label={preset.label}
          hint={`${preset.blurb} Up to ${preset.caps.likesPerDay} likes and ${preset.caps.commentsPerDay} replies a day · ${preset.hourlyCeiling} an hour.`}
          selected={on}
          onClick={() => {
            if (on) return;
            // A change marker for the Growth chart — only on a real change.
            void appendGrowthMilestone({
              at: new Date().toISOString(),
              kind: 'preset-changed',
              detail: `Switched to ${preset.label}`,
            });
            update(applyPreset(settings, name));
          }}
        />
      );
    })}
  </Group>
);

const HOUR_ITEMS = Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: hh(h) }));

const HourSelect = ({ value, onChange, label }: { value: number; onChange: (h: number) => void; label: string }) => (
  <Select items={HOUR_ITEMS} value={String(value)} onValueChange={(v) => v !== null && onChange(Number(v))}>
    <SelectTrigger className="h-9 min-w-24 rounded-full tabular-nums" aria-label={label}>
      <SelectValue />
    </SelectTrigger>
    <SelectContent className="max-h-72">
      {HOUR_ITEMS.map((h) => (
        <SelectItem key={h.value} value={h.value} className="tabular-nums">
          {h.label}
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
);

/** Work sessions and the breaks between them — shown on the Active hours page. */
const SESSION_MAX = 60;
const BREAK_MAX = 30;

const SessionsControls = ({ settings, update }: Pick<DetailProps, 'settings' | 'update'>) => {
  const work = Math.min(SESSION_MAX, settings.sessionMinutes);
  const rest = Math.min(BREAK_MAX, settings.breakMinutes ?? 20);
  const resume = settings.autoResume !== false;
  const { startHour, endHour } = settings.activeHours;
  const windowMin = ((endHour - startHour + 24) % 24 || 24) * 60;
  const sessions = resume ? Math.max(1, Math.floor((windowMin + rest) / (work + rest))) : 1;
  const workToday = Math.min(windowMin, sessions * work);

  return (
    <>
      <Group label="Work sessions" footer="One stretch of work in a single tab — at most an hour. Shorter sessions look more like a person.">
        <SliderRow label="Work for" value={work} min={15} max={SESSION_MAX} step={5} onChange={(v) => update({ ...settings, sessionMinutes: v })} />
      </Group>

      <Group label="When a session ends">
        <Row
          label="Take a break, then carry on"
          hint="Rest, then start the next session on my own"
          selected={resume}
          onClick={() => update({ ...settings, autoResume: true })}
        />
        <Row
          label="Pause until I start again"
          hint="Stop after one session — you press Start"
          selected={!resume}
          onClick={() => update({ ...settings, autoResume: false })}
        />
      </Group>

      {resume && (
        <Group
          label="Break"
          footer={
            <>
              About <span className="font-semibold text-foreground">{sessions}</span> {sessions === 1 ? 'session' : 'sessions'} and{' '}
              <span className="font-semibold text-foreground">{duration(workToday)}</span> of work between {hh(startHour)} and {hh(endHour)} — always
              inside your daily limits.
            </>
          }
        >
          <SliderRow label="Break for" value={rest} min={5} max={BREAK_MAX} step={5} onChange={(v) => update({ ...settings, breakMinutes: v })} />
        </Group>
      )}
    </>
  );
};

const HoursDetail = ({ settings, update }: DetailProps) => {
  const hours = settings.activeHours;
  const set = (patch: Partial<typeof hours>) => update({ ...settings, activeHours: { ...hours, ...patch } });
  const note =
    hours.startHour === hours.endHour
      ? 'This window is empty, so nothing will run.'
      : hours.startHour > hours.endHour
        ? 'Runs overnight.'
        : 'I only work inside this window.';
  return (
    <>
      <Group label="Window" footer={`${note} Times are in your timezone (${settings.timezone}).`}>
        <Row label="From" trailing={<HourSelect label="From" value={hours.startHour} onChange={(h) => set({ startHour: h })} />} />
        <Row label="Until" trailing={<HourSelect label="Until" value={hours.endHour} onChange={(h) => set({ endHour: h })} />} />
      </Group>
      <SessionsControls settings={settings} update={update} />
    </>
  );
};

const TrustDetail = ({ reload }: DetailProps) => (
  <Group footer="You said yes to this. Everything still shows up in Review and Posts first. Taking it back is always one tap.">
    <Row
      label="Go back to showing me first"
      onClick={() => {
        void (async () => {
          await sendToBackground({ type: 'REVOKE_TRUST', payload: {} });
          reload();
        })();
      }}
    />
  </Group>
);

const FollowBackDetail = ({ settings, update }: DetailProps) => {
  const [status, setStatus] = useState<string | null>(null);
  const runNow = async () => {
    setStatus('Starting…');
    try {
      await sendToBackground({ type: 'FOLLOW_BACK_NOW', payload: {} });
      setStatus(
        settings.isPaused
          ? 'Queued — but autopilot is paused, so nothing runs until you turn it on.'
          : 'Opening your followers list and following everyone back…',
      );
    } catch (err) {
      setStatus(err instanceof Error ? err.message : 'That did not work');
    }
  };
  return (
    <>
      <Group footer="Runs every half hour or so while I'm working. Bounded by your daily follow cap and your whitelist.">
        <Row
          icon={UserAdd01Icon}
          label="Follow back automatically"
          toggle={{ checked: settings.followBack, onChange: (v) => update({ ...settings, followBack: v }) }}
        />
      </Group>
      <Group footer={status ?? undefined}>
        <Row label="Follow back now" onClick={() => void runNow()} />
      </Group>
    </>
  );
};

const VoiceDetail = () => {
  const [voice, setVoice] = useState<VoiceProfile | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void getStoredAuth().then((auth) => setVoice(auth?.user.voiceProfile ?? null));
  }, []);

  type Resp = { ok: true; data: User } | { ok: false; error: { message: string } | string };

  const train = async () => {
    setBusy(true);
    setMsg('Reading your recent posts…');
    try {
      const resp = await sendToBackground<Resp>({ type: 'TRAIN_VOICE', payload: {} });
      if (resp.ok) {
        setVoice(resp.data.voiceProfile ?? null);
        setMsg('Done — Ghostly now writes the way you do.');
      } else {
        setMsg(typeof resp.error === 'string' ? resp.error : resp.error.message);
      }
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Training failed');
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    setBusy(true);
    try {
      const resp = await sendToBackground<Resp>({ type: 'CLEAR_VOICE', payload: {} });
      if (resp.ok) {
        setVoice(null);
        setMsg('Cleared — back to the tone preset.');
      }
    } finally {
      setBusy(false);
    }
  };

  if (!voice) {
    return (
      <>
        <Group
          footer={`I read your last ${VOICE_LIMITS.maxSamples} posts once, work out how you actually write, and use that for every reply and drafted post. Your posts are analysed and discarded — only the summary is kept.`}
        >
          <Row icon={Mic01Icon} label="Learned voice" value="Not set" />
        </Group>
        <AccentButton icon={Mic01Icon} disabled={busy} onClick={() => void train()}>
          {busy ? 'Reading your posts…' : 'Learn my voice'}
        </AccentButton>
        {msg && <p className="px-4 text-xs text-muted-foreground">{msg}</p>}
      </>
    );
  }

  return (
    <>
      <Group
        label="How you write"
        footer={`Learned from ${voice.sampleCount} of your posts on ${new Date(voice.trainedAt).toLocaleDateString()}. This overrides the reply tone.`}
      >
        <p className="px-4 py-3.5 text-[15px] leading-relaxed text-foreground/90">{voice.summary}</p>
      </Group>
      <Group footer={msg ?? undefined}>
        <Row icon={Mic01Icon} label={busy ? 'Working…' : 'Retrain'} onClick={busy ? undefined : () => void train()} />
        <Row icon={Delete02Icon} label="Clear learned voice" danger onClick={busy ? undefined : () => void clear()} />
      </Group>
    </>
  );
};

const DiagnosticsDetail = () => {
  const [entries, setEntries] = useState<DiagnosticEntry[] | null>(null);
  useEffect(() => {
    void getDiagnostics().then(setEntries);
  }, []);
  if (!entries) return null;
  return (
    <>
      <Group
        label="Recent"
        footer="What the engine has been telling itself — the first place to look when nothing seems to be happening."
      >
        {entries.length === 0 ? (
          <p className="px-4 py-3.5 text-[15px] text-muted-foreground">Nothing logged — which is the good outcome.</p>
        ) : (
          entries
            .slice()
            .reverse()
            .map((d, i) => <Row key={i} label={d.context} hint={d.detail} />)
        )}
      </Group>
      {entries.length > 0 && (
        <Group>
          <Row
            icon={Delete02Icon}
            label="Clear diagnostics"
            danger
            onClick={() => void clearDiagnostics().then(() => setEntries([]))}
          />
        </Group>
      )}
    </>
  );
};
