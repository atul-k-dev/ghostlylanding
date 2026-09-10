import { useEffect, useState } from 'react';
import type { ExtensionSettings, SafetyPresetName } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import {
  getSettings,
  setSettings,
  getDiagnostics,
  clearDiagnostics,
  appendGrowthMilestone,
  type DiagnosticEntry,
} from '../../lib/storage.js';
import { SAFETY_PRESETS, applyPreset } from '../../lib/presets.js';
import { isTrusted } from '../../lib/trust.js';
import { Section } from './_shared.js';
import { Button, Card } from '../../ui/index.js';

/**
 * Settings — how hard I work, when, and what to do about followers.
 *
 * Rebuilt rather than ported wholesale in updateplan 1.6. Six controls the old
 * SettingsTab carried are deliberately gone:
 *   · "Watch it work"          — replaced by Spotlight (Phase 2.3)
 *   · "Browse like a human"    — now always on
 *   · "Run for 30/60/90"       — replaced by active hours plus the preset
 *   · "Account age (months)"   — folded into the preset's one checkbox
 *   · "Clear the action queue" — it self-heals; this is a diagnostics concern
 *   · the how-to link to the marketing site
 */
export const Settings = () => {
  const [settings, setLocal] = useState<ExtensionSettings | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticEntry[]>([]);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [followBackStatus, setFollowBackStatus] = useState<string | null>(null);

  useEffect(() => {
    void getSettings().then(setLocal);
    void getDiagnostics().then(setDiagnostics);
  }, []);

  const onChange = (next: ExtensionSettings) => {
    setLocal(next);
    void setSettings(next);
  };

  const runFollowBackNow = async () => {
    setFollowBackStatus('Starting…');
    try {
      await sendToBackground({ type: 'FOLLOW_BACK_NOW', payload: {} });
      setFollowBackStatus(
        settings?.isPaused
          ? 'Queued — but you have me paused, so nothing runs until you start me.'
          : 'Opening your followers list and following everyone back…',
      );
    } catch (err) {
      setFollowBackStatus(err instanceof Error ? err.message : 'That did not work');
    }
  };

  if (!settings) {
    return <p className="py-6 text-center text-xs text-casper-muted">Catching up…</p>;
  }

  const hours = settings.activeHours;
  const overnight = hours.startHour > hours.endHour;

  return (
    <div className="space-y-3 p-3">
      <Section
        title="How hard I work"
        subtitle="One choice — it moves the daily caps, the pacing and the hourly ceiling together."
      >
        <div className="flex flex-col gap-2">
          {(['careful', 'balanced', 'growth'] as SafetyPresetName[]).map((name) => {
            const p = SAFETY_PRESETS[name];
            const on = settings.safetyPreset === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  // A change marker for the Growth tab's follower chart
                  // (updateplan 5.1) — only when the preset actually changes,
                  // not every render-triggering click on the already-active card.
                  if (!on) {
                    void appendGrowthMilestone({
                      at: new Date().toISOString(),
                      kind: 'preset-changed',
                      detail: `Switched to ${SAFETY_PRESETS[name].label}`,
                    });
                  }
                  onChange(applyPreset(settings, name));
                }}
                aria-pressed={on}
                className={[
                  'cursor-pointer rounded-xl border px-3 py-2 text-left transition-colors',
                  on
                    ? 'border-casper-coral bg-casper-coral/10'
                    : 'border-casper-border hover:border-casper-muted/50',
                ].join(' ')}
              >
                <p
                  className={[
                    'text-[13px] font-medium',
                    on ? 'text-casper-coral' : 'text-casper-fg',
                  ].join(' ')}
                >
                  {p.label}
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-casper-muted">{p.blurb}</p>
                <p className="mt-1 text-xs text-casper-muted tabular-nums">
                  up to {p.caps.likesPerDay} likes and {p.caps.commentsPerDay} replies a day ·{' '}
                  {p.hourlyCeiling} an hour
                </p>
              </button>
            );
          })}
        </div>
      </Section>

      {/*
        Trust, and how to take it back (updateplan 3.3). The offer promises
        "you can undo any of it" — a grant with no way out would make that
        sentence untrue, which is not a thing this product may do.
      */}
      {isTrusted(settings.trust) && (
        <Section
          title="I post without asking"
          subtitle="You said yes to this. Everything still shows up in Review and Posts first."
        >
          {/* Not `destructive`: coral-as-fill means "this takes something
              away". Handing the keys back is the SAFE direction, and styling
              it as a warning would discourage the one thing we want easy. */}
          <Button
            variant="secondary"
            onClick={() => {
              void (async () => {
                await sendToBackground({ type: 'REVOKE_TRUST', payload: {} });
                setLocal(await getSettings());
              })();
            }}
          >
            Go back to showing me first
          </Button>
        </Section>
      )}

      {/* Weekly auto-tune (updateplan 6.1). Off by default — it removes
          target creators automatically, so it stays opt-in like everything
          else that changes what the engine does on its own. */}
      <Section
        title="Weekly clean-up"
        subtitle="Once a week, drop target creators that have sat quiet for 3+ weeks — reversible from the Growth tab."
      >
        <label className="flex items-center justify-between">
          <span className="text-xs font-medium text-casper-ink">Drop quiet targets automatically</span>
          <button
            type="button"
            onClick={() =>
              onChange({ ...settings, autoTune: { ...settings.autoTune, enabled: !settings.autoTune.enabled } })
            }
            aria-pressed={settings.autoTune.enabled}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              settings.autoTune.enabled
                ? 'bg-emerald-500/15 text-emerald-300'
                : 'bg-casper-ink/10 text-casper-ink/60'
            }`}
          >
            {settings.autoTune.enabled ? 'On' : 'Off'}
          </button>
        </label>
      </Section>

      <Section title="My hours" subtitle="I only work inside this window, in your own timezone.">
        <div className="flex items-end gap-2">
          <label className="min-w-0 flex-1 text-xs text-casper-muted">
            From
            <select
              value={hours.startHour}
              onChange={(e) =>
                onChange({
                  ...settings,
                  activeHours: { ...hours, startHour: Number(e.target.value) },
                })
              }
              className="mt-1 w-full rounded-lg border border-casper-border bg-casper-bg px-2 py-1.5 text-xs text-casper-fg tabular-nums"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-0 flex-1 text-xs text-casper-muted">
            Until
            <select
              value={hours.endHour}
              onChange={(e) =>
                onChange({
                  ...settings,
                  activeHours: { ...hours, endHour: Number(e.target.value) },
                })
              }
              className="mt-1 w-full rounded-lg border border-casper-border bg-casper-bg px-2 py-1.5 text-xs text-casper-fg tabular-nums"
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-1.5 text-xs text-casper-muted">
          {settings.timezone}
          {overnight && ' · runs overnight'}
          {hours.startHour === hours.endHour && ' · this window is empty, so nothing will run'}
        </p>
      </Section>

      <Section
        title="Mentions"
        subtitle="Answer the people who talk to you — replies to your posts, quotes and cold mentions, read off your notifications tab."
      >
        <label className="flex items-center justify-between">
          <span className="text-xs font-medium text-casper-fg">Read mentions and draft replies</span>
          <button
            type="button"
            onClick={() =>
              onChange({ ...settings, mentions: { ...settings.mentions, enabled: !settings.mentions.enabled } })
            }
            aria-pressed={settings.mentions.enabled}
            className={[
              'cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors',
              settings.mentions.enabled
                ? 'bg-casper-working/15 text-casper-working'
                : 'bg-casper-surface-2 text-casper-muted',
            ].join(' ')}
          >
            {settings.mentions.enabled ? 'On' : 'Off'}
          </button>
        </label>
        <p className="mt-1.5 text-xs text-casper-muted">
          This only drafts — whether a reply goes out unread is still your review setting on the
          Voice page, the same as every other reply.
        </p>
      </Section>

      <Section
        title="Browser notifications"
        subtitle="Reserved for moments that can't wait for you to open the panel. Capped at a couple a day, whatever's switched on below."
      >
        <label className="flex items-center justify-between">
          <span className="text-xs font-medium text-casper-fg">Something's broken</span>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...settings,
                notifications: { ...settings.notifications, problems: !settings.notifications.problems },
              })
            }
            aria-pressed={settings.notifications.problems}
            className={[
              'cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors',
              settings.notifications.problems
                ? 'bg-casper-working/15 text-casper-working'
                : 'bg-casper-surface-2 text-casper-muted',
            ].join(' ')}
          >
            {settings.notifications.problems ? 'On' : 'Off'}
          </button>
        </label>
        <p className="mt-1 text-xs text-casper-muted">
          Signed out for hours, or stopped itself because it can't read the timeline.
        </p>
        <label className="mt-3 flex items-center justify-between">
          <span className="text-xs font-medium text-casper-fg">A big account replied</span>
          <button
            type="button"
            onClick={() =>
              onChange({
                ...settings,
                notifications: { ...settings.notifications, bigReplies: !settings.notifications.bigReplies },
              })
            }
            aria-pressed={settings.notifications.bigReplies}
            className={[
              'cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors',
              settings.notifications.bigReplies
                ? 'bg-casper-working/15 text-casper-working'
                : 'bg-casper-surface-2 text-casper-muted',
            ].join(' ')}
          >
            {settings.notifications.bigReplies ? 'On' : 'Off'}
          </button>
        </label>
        <p className="mt-1 text-xs text-casper-muted">
          A well-known account mentioned you and I'm holding a draft for your review. Off by
          default — everything except a real problem is your call.
        </p>
      </Section>

      <Section
        title="Auto follow-back"
        subtitle="Follow back the people who follow you — I scroll your Followers list and tap every 'Follow back' for you."
      >
        <label className="flex items-center justify-between">
          <span className="text-xs font-medium text-casper-fg">Follow back automatically</span>
          <button
            type="button"
            onClick={() => onChange({ ...settings, followBack: !settings.followBack })}
            aria-pressed={settings.followBack}
            className={[
              'cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors',
              settings.followBack
                ? 'bg-casper-working/15 text-casper-working'
                : 'bg-casper-surface-2 text-casper-muted',
            ].join(' ')}
          >
            {settings.followBack ? 'On' : 'Off'}
          </button>
        </label>
        <p className="mt-1.5 text-xs text-casper-muted">
          Runs every half hour or so while I&rsquo;m working. Bounded by your daily follow cap and
          your whitelist.
        </p>
        <Button
          size="sm"
          variant="primary"
          full
          className="mt-2"
          onClick={() => void runFollowBackNow()}
        >
          Follow back now
        </Button>
        {followBackStatus && <p className="mt-2 text-xs text-casper-muted">{followBackStatus}</p>}
      </Section>

      <Section
        title="If something looks wrong"
        subtitle="What the engine has been telling itself. This is the first place to look when nothing seems to be happening."
      >
        <Button size="sm" variant="secondary" onClick={() => setShowDiagnostics((v) => !v)}>
          {showDiagnostics ? 'Hide' : `Show (${diagnostics.length})`}
        </Button>
        {showDiagnostics && (
          <div className="mt-2 space-y-1.5">
            {diagnostics.length === 0 ? (
              <p className="text-xs text-casper-muted">
                Nothing logged — which is the good outcome.
              </p>
            ) : (
              diagnostics
                .slice()
                .reverse()
                .map((d, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-casper-border bg-casper-bg px-2 py-1.5"
                  >
                    <p className="text-xs text-casper-fg">{d.context}</p>
                    <p className="text-xs leading-relaxed text-casper-muted">{d.detail}</p>
                  </div>
                ))
            )}
            {diagnostics.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void clearDiagnostics().then(() => setDiagnostics([]))}
              >
                Clear
              </Button>
            )}
          </div>
        )}
      </Section>

      <Card title="Your account">
        <p className="text-xs leading-relaxed text-casper-muted">
          Your plan, signing out and deleting your account all live behind the person icon at the
          top.
        </p>
      </Card>
    </div>
  );
};
