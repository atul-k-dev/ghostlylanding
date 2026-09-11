import { useEffect, useState } from 'react';
import type { ExtensionSettings, PendingReply } from '@casper/shared';
import { REPLY_QUEUE_MAX } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import { getPendingReplies, getSettings, STORAGE_KEYS } from '../../lib/storage.js';
import { TrustOfferCard } from './AutoPosting.js';

/**
 * Review — the replies waiting on a human.
 *
 * Ported from `popup/views/Dashboard.tsx:930-1112` in updateplan 1.6, with the
 * three actions 1.6 asks for added: `Edit & post`, `Never like this`, `Post all`.
 */

const ReviewCard = ({
  reply,
  onApprove,
  onReject,
  onNeverLikeThis,
  busy,
}: {
  reply: PendingReply;
  onApprove: (id: string, text: string) => void;
  onReject: (id: string) => void;
  onNeverLikeThis: (reply: PendingReply) => void;
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
          <p className="mb-1 text-xs font-medium text-casper-ink/50">
            @{reply.authorHandle.replace(/^@/, '')}
          </p>
        )}
        <p className="line-clamp-4 text-xs leading-snug text-casper-ink/60">
          {reply.postText || '(post text unavailable)'}
        </p>
      </a>

      {/* What Ghostly wants to say */}
      <p className="mb-1 font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
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
          className="flex-1 rounded-lg bg-casper-violet py-1.5 text-xs font-medium text-casper-on-coral transition hover:opacity-90 disabled:opacity-40"
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
      {/*
        "Never like this" is the difference between skipping a post and teaching
        me something. It excludes ONE word from the post — see
        `mostDistinctiveTerm` — and the user never sees the phrase "exclude
        keywords", which is a setting, not a thought anyone has.
      */}
      <button
        type="button"
        onClick={() => onNeverLikeThis(reply)}
        disabled={busy}
        className="mt-1.5 w-full rounded-lg px-3 py-1 text-xs text-casper-ink/40 transition hover:text-casper-coral disabled:opacity-40"
      >
        Never send me posts like this
      </button>
    </div>
  );
};


export const Review = () => {
  const [replies, setReplies] = useState<PendingReply[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [settings, setSettings] = useState<ExtensionSettings | null>(null);
  const paused = settings?.isPaused ?? false;

  const load = async () => {
    const list = await getPendingReplies();
    setReplies([...list].sort((a, b) => b.createdAt - a.createdAt));
    setSettings(await getSettings());
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

  const approve = async (id: string, text: string, bulk = false) => {
    setBusyId(id);
    setNote(null);
    try {
      const resp = await sendToBackground<
        | { ok: true; data: { taskId: string; offer?: boolean } }
        | { ok: false; error: { message: string } | string }
      >({ type: 'APPROVE_DRAFT', payload: { id, text, ...(bulk ? { bulk: true } : {}) } });
      if (resp.ok) {
        // The graduation offer (3.3) shows up right here, where the approving
        // happens, rather than on a settings page nobody has open.
        if (resp.data.offer) setSettings(await getSettings());
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

  /**
   * Post everything waiting, in order, one at a time.
   *
   * Sequential rather than parallel on purpose: each approval enqueues a real
   * action, and the engine's own pacing (8–45s, plus the hourly ceiling) is what
   * decides when they actually go out. Firing them all at once would not make
   * them post faster — it would just make the failures harder to read.
   *
   * Marked `bulk` (updateplan 3.3): a sweep does not advance the trust streak.
   * Clearing eight in one click says the queue was full, not that every one of
   * them was read and found perfect.
   */
  const postAll = async () => {
    if (!replies) return;
    for (const reply of replies) {
      await approve(reply.id, reply.draftText, true);
    }
    setNote('All approved — I’ll post them at a human pace.');
  };

  /**
   * Skip this one AND stop bringing me posts like it. One word, chosen the same
   * way a dry-run rejection chooses one.
   */
  const neverLikeThis = async (reply: PendingReply) => {
    setBusyId(reply.id);
    try {
      await sendToBackground({
        type: 'DRY_RUN_REJECT',
        payload: { text: reply.postText, draft: reply.draftText },
      });
      await sendToBackground({ type: 'REJECT_DRAFT', payload: { id: reply.id } });
      setNote('Got it — I’ll steer clear of posts like that one.');
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'That did not work');
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
      {settings && (
        <TrustOfferCard settings={settings} onSettings={setSettings} />
      )}
      {note && (
        <div className="rounded-lg bg-casper-violet/10 px-3 py-2 text-xs text-casper-violet">
          {note}
        </div>
      )}

      {replies.length === 0 ? (
        <div className="flex h-[300px] flex-col items-center justify-center px-6 text-center">
          <div className="mb-2 text-3xl" aria-hidden>
            ✍️
          </div>
          <p className="text-xs text-casper-ink/70">Nothing waiting for you.</p>
          <p className="mt-1 text-xs leading-relaxed text-casper-ink/40">
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
              <p className="text-xs text-casper-coral">Queue full — drafting paused</p>
            )}
          </div>
          {replies.length > 1 && (
            <button
              type="button"
              onClick={() => void postAll()}
              disabled={busyId !== null}
              className="w-full rounded-lg border border-casper-coral/40 bg-casper-coral/12 py-1.5 text-xs font-medium text-casper-coral transition hover:bg-casper-coral/20 disabled:opacity-40"
            >
              Post all {replies.length}
            </button>
          )}
          {replies.map((reply) => (
            <ReviewCard
              key={reply.id}
              reply={reply}
              onApprove={approve}
              onReject={reject}
              onNeverLikeThis={neverLikeThis}
              busy={busyId === reply.id}
            />
          ))}
        </>
      )}
    </div>
  );
};

