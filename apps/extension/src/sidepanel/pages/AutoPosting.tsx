import { useState } from 'react';
import type { ExtensionSettings } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import { TRUST_OFFER, hasOpenOffer, normalizeTrust } from '../../lib/trust.js';
import { getSettings } from '../../lib/storage.js';

/**
 * The graduation offer (updateplan 3.3) — the only thing in this product that
 * can stop holding work for review, so it is a question, asked once, never a
 * default. Shown on Home and the Post page. (The auto-writer that used to live
 * here moved to post/PostPage.)
 */
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
    <section className="flex flex-col gap-3 rounded-4xl bg-card p-4 text-card-foreground shadow-sm ring-1 ring-casper-working/40">
      <div>
        <p className="font-display text-base font-bold tracking-tight">{TRUST_OFFER.title}</p>
        <p className="mt-1 text-sm leading-snug text-muted-foreground">{TRUST_OFFER.body}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void answer(true)}
          className="h-11 flex-1 cursor-pointer rounded-full bg-primary font-display text-sm font-bold text-primary-foreground transition hover:bg-primary/85 disabled:opacity-50"
        >
          {TRUST_OFFER.accept}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void answer(false)}
          className="h-11 flex-1 cursor-pointer rounded-full bg-muted font-display text-sm font-bold transition hover:bg-muted/70 disabled:opacity-50"
        >
          {TRUST_OFFER.decline}
        </button>
      </div>
    </section>
  );
};
