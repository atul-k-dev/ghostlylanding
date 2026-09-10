import { useEffect, useState } from 'react';
import type { ExtensionSettings } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import { presetOf } from '../../lib/presets.js';
import { MIN_DAYS } from '../../lib/best-times.js';
import { TRUST_OFFER, hasOpenOffer, isTrusted, normalizeTrust } from '../../lib/trust.js';
import { getSettings, setSettings } from '../../lib/storage.js';
import { Section } from './_shared.js';

/**
 * The publishing half, switched on (updateplan 3.2 + 3.3).
 *
 * Two controls and one question. The controls say whether Ghostly may write
 * posts and when it thinks they should go out; the question is the graduation
 * offer, which is the only thing in this product that can stop holding work for
 * review — and it is a question, asked once, never a default.
 */

/** What the best-time model currently believes, and how much it is working from. */
interface BestTimesView {
  labels: string[];
  personalised: boolean;
  days: number;
  posts: number;
}

export const TrustOfferCard = ({
  settings,
  onSettings,
}: {
  settings: ExtensionSettings;
  onSettings: (s: ExtensionSettings) => void;
}) => {
  const [busy, setBusy] = useState(false);
  const trust = normalizeTrust(settings.trust);
  if (!hasOpenOffer(trust)) return null;

  const answer = async (accept: boolean) => {
    setBusy(true);
    try {
      await sendToBackground({ type: 'ANSWER_TRUST_OFFER', payload: { accept } });
      onSettings(await getSettings());
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-casper-working/40 bg-casper-working/5 p-3">
      <p className="text-xs font-medium text-casper-fg">{TRUST_OFFER.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-casper-muted">{TRUST_OFFER.body}</p>
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void answer(true)}
          className="flex-1 rounded-lg bg-casper-working px-3 py-1.5 text-xs font-medium text-black transition hover:opacity-90 disabled:opacity-40"
        >
          {TRUST_OFFER.accept}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void answer(false)}
          className="flex-1 rounded-lg border border-casper-border px-3 py-1.5 text-xs text-casper-ink/70 transition hover:bg-white/5 disabled:opacity-40"
        >
          {TRUST_OFFER.decline}
        </button>
      </div>
    </div>
  );
};

export const AutoPosting = ({
  settings,
  onSettings,
  onNote,
}: {
  settings: ExtensionSettings;
  onSettings: (s: ExtensionSettings) => void;
  onNote: (message: string) => void;
}) => {
  const [times, setTimes] = useState<BestTimesView | null>(null);
  const [busy, setBusy] = useState(false);
  const auto = settings.autoPost;
  const perDay = presetOf(settings).postsPerDay;
  const trusted = isTrusted(settings.trust);

  useEffect(() => {
    void (async () => {
      const resp = await sendToBackground<
        { ok: true; data: BestTimesView } | { ok: false }
      >({ type: 'GET_BEST_TIMES', payload: { count: 3 } });
      if (resp.ok) setTimes(resp.data);
    })();
  }, []);

  const toggle = async () => {
    const next: ExtensionSettings = {
      ...settings,
      autoPost: { ...auto, enabled: !auto.enabled },
    };
    onSettings(next);
    await setSettings(next);
  };

  const writeNow = async () => {
    setBusy(true);
    try {
      const resp = await sendToBackground<
        | { ok: true; data: { drafted: number; skip: string | null; autoPublish: boolean } }
        | { ok: false; error: { message: string } | string }
      >({ type: 'AUTO_DRAFT_NOW', payload: {} });
      if (!resp.ok) {
        onNote(typeof resp.error === 'string' ? resp.error : resp.error.message);
        return;
      }
      const { drafted, skip, autoPublish } = resp.data;
      if (drafted > 0) {
        onNote(
          autoPublish
            ? `Wrote ${drafted} and put them on the schedule.`
            : `Wrote ${drafted} for you to read below.`,
        );
      } else if (skip === 'no-topics') {
        onNote('Tell me what you post about first — the box above.');
      } else if (skip === 'queue-full' || skip === 'enough-queued') {
        onNote('You already have enough waiting. Clear some of those first.');
      } else if (skip === 'posted-recently') {
        onNote('You have posted recently — there is nothing to fill in.');
      } else {
        onNote('Nothing came back. Try again in a minute.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Section
      title="Ghostly writes for you"
      subtitle={
        auto.enabled
          ? `About ${perDay} a day, in your voice, from what you post about.`
          : 'Off. Nothing is written or published unless you turn this on.'
      }
    >
      <button
        type="button"
        onClick={() => void toggle()}
        aria-pressed={auto.enabled}
        className={`w-full rounded-lg px-3 py-2 text-xs font-medium transition ${
          auto.enabled
            ? 'bg-casper-working/15 text-casper-working'
            : 'border border-casper-ink/10 text-casper-ink/70 hover:bg-white/5'
        }`}
      >
        {auto.enabled ? '● Writing for you' : 'Write posts for me'}
      </button>

      {auto.enabled && (
        <p className="mt-2 text-xs leading-relaxed text-casper-muted">
          {trusted
            ? 'These go out on their own now. Every one is in the week below before it does, and you can delete any of them.'
            : 'Each one waits for your yes in the week below. Nothing publishes until you say so.'}
        </p>
      )}

      {/*
        Never imply the times are personalised when they are not. Under two
        weeks of measured posts this is a sensible default and says so — a
        confident wrong answer here is worse than an openly generic one.
      */}
      {times && times.labels.length > 0 && (
        <p className="mt-2 text-xs leading-relaxed text-casper-muted">
          {times.personalised ? (
            <>
              Your posts do best {times.labels.join(', ')} — from {times.posts} of your own posts
              over {times.days} days.
            </>
          ) : (
            <>
              I schedule at {times.labels.join(' and ')} for now. Those are sensible defaults, not
              your numbers: I need about {MIN_DAYS} days of your own posts before I can tell you
              when your audience actually shows up.
            </>
          )}
        </p>
      )}

      <button
        type="button"
        onClick={() => void writeNow()}
        disabled={busy}
        className="mt-2.5 w-full rounded-lg border border-casper-violet/40 bg-casper-violet/10 py-1.5 text-xs font-medium text-casper-violet transition hover:bg-casper-violet/20 disabled:opacity-40"
      >
        {busy ? 'Writing…' : 'Write some for me now'}
      </button>
    </Section>
  );
};
