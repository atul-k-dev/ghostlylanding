import { useEffect, useState } from 'react';
import type { ExtensionSettings, TonePreset, CommentLength, User, VoiceProfile } from '@casper/shared';
import { TONE_PRESETS, COMMENT_LENGTHS, VOICE_LIMITS } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import { getSettings, setSettings, getAuth as getStoredAuth } from '../../lib/storage.js';
import { Section, COMMENT_LENGTH_LABELS } from './_shared.js';

/**
 * Voice — how replies sound.
 *
 * Ported from the voice half of `popup/views/Dashboard.tsx`'s SettingsTab in
 * updateplan 1.6. Everything that decides what goes out under the user's name
 * lives here: the trained voice, whether replies wait for approval, the fallback
 * tone preset and reply length.
 */
export const Voice = () => {
  const [settings, setLocal] = useState<ExtensionSettings | null>(null);
  const [voice, setVoice] = useState<VoiceProfile | null>(null);
  const [voiceBusy, setVoiceBusy] = useState(false);
  const [voiceMsg, setVoiceMsg] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLocal(await getSettings());
      const auth = await getStoredAuth();
      setVoice(auth?.user.voiceProfile ?? null);
    })();
  }, []);

  const onChange = (next: ExtensionSettings) => {
    setLocal(next);
    void setSettings(next);
  };

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

  if (!settings) return <p className="py-6 text-center text-xs text-casper-muted">Catching up…</p>;

  return (
    <div className="space-y-3 p-3">
      <Section
        title="Your voice"
        subtitle="Learn how you write, so replies sound like you and not like a preset."
      >
        {voice ? (
          <div className="space-y-2">
            <p className="rounded-lg border border-casper-border bg-casper-cloud p-2 text-xs leading-relaxed text-casper-ink/70">
              {voice.summary}
            </p>
            <p className="text-xs text-casper-ink/40">
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
            <p className="text-xs leading-relaxed text-casper-ink/50">
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
        {voiceMsg && <p className="mt-2 text-xs text-casper-ink/50">{voiceMsg}</p>}
      </Section>

      <Section
        title="Auto-approve replies"
        subtitle="Turn this on for fully hands-off replying — nothing to review, nothing to click."
      >
        <label className="flex items-center gap-2 text-xs text-casper-ink/80">
          <input
            type="checkbox"
            checked={settings.replyApproval === false}
            onChange={() =>
              onChange({ ...settings, replyApproval: settings.replyApproval !== false })
            }
            className="h-3.5 w-3.5 rounded border-casper-ink/20 text-casper-violet focus:ring-casper-violet/30"
          />
          Post replies automatically — don't ask me first
        </label>
        <p className="mt-1 text-xs leading-relaxed text-casper-ink/40">
          {settings.replyApproval === false
            ? 'Replies post the moment they are written. You can still read what went out any time in the action feed on Today.'
            : "Off for now: every reply waits in Review until you approve it. Turn this on and there's nothing left to click."}
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

    </div>
  );
};
