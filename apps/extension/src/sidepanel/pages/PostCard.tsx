import { useState } from 'react';
import { sendToBackground } from '../../lib/messages.js';
import { toDateInputValue, toTimeInputValue, localDateTime } from '../../lib/schedule-time.js';
import { effectivePostLength, type ScheduledPost } from '../../lib/storage.js';
import { renderQuoteCardPng } from '../../lib/quote-card.js';
import { POST_STATUS, formatWhen } from './_shared.js';

/**
 * One post, editable in place (updateplan 3.4).
 *
 * The plan asks for text, an X preview, an image, and four actions: `Publish
 * now`, `Reschedule`, `Rewrite it`, `Delete`. A drafted post — one Ghostly
 * wrote and nobody has said yes to — gets a fifth, and it is the important one:
 * approving it is what turns `draft` into `scheduled`, and until that happens
 * the publisher cannot touch it.
 *
 * The card opens closed. A week's posts as seven open textareas is a form; as
 * seven readable cards it is a plan you can look at.
 */

/** How X renders it: the text, then the link on its own line. */
const XPreview = ({ post, text }: { post: ScheduledPost; text: string }) => (
  <div className="rounded-xl border border-casper-border bg-black/30 p-3">
    <p className="mb-1 text-xs text-casper-muted">How it lands on X</p>
    <div className="flex gap-2">
      <div className="h-8 w-8 flex-none rounded-full bg-casper-border" aria-hidden />
      <div className="min-w-0 flex-1">
        <p className="whitespace-pre-wrap break-words text-xs leading-relaxed text-casper-fg">
          {text}
        </p>
        {post.link && <p className="mt-1 truncate text-xs text-casper-violet">{post.link}</p>}
        {post.imageDataUrl && (
          <img
            src={post.imageDataUrl}
            alt=""
            className="mt-2 max-h-40 w-full rounded-lg border border-casper-border object-cover"
          />
        )}
        {post.thread && post.thread.length > 0 && (
          <p className="mt-1 text-xs text-casper-muted">
            + {post.thread.length} more in the thread
          </p>
        )}
      </div>
    </div>
  </div>
);

export const PostCard = ({
  post,
  limit,
  ownHandle,
  onChanged,
  onNote,
}: {
  post: ScheduledPost;
  /** The user's character limit, from their X account type. */
  limit: number;
  /** For the quote card's attribution. Null when we've never read it. */
  ownHandle: string | null;
  onChanged: () => Promise<void> | void;
  onNote: (message: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(post.text);
  const [day, setDay] = useState(() => toDateInputValue(new Date(post.scheduledAt)));
  const [time, setTime] = useState(() => toTimeInputValue(new Date(post.scheduledAt)));
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const status = POST_STATUS[post.status];
  const isDraft = post.status === 'draft';
  const editable = isDraft || post.status === 'scheduled';
  const over = effectivePostLength(text, post.link) > limit;
  const changed = text.trim() !== post.text.trim();

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work');
    } finally {
      setBusy(null);
    }
  };

  const call = async <T,>(message: { type: string; payload: unknown }): Promise<T> => {
    const resp = await sendToBackground<
      { ok: true; data: T } | { ok: false; error: { message: string } | string }
    >(message);
    if (!resp.ok) {
      throw new Error(typeof resp.error === 'string' ? resp.error : resp.error.message);
    }
    return resp.data;
  };

  const save = (publishNow: boolean) =>
    run(publishNow ? 'publish' : 'save', async () => {
      // A draft is approved (draft → scheduled); an already-scheduled post is
      // only edited. Two different words for two different things: one of them
      // is permission, and the code should not blur them.
      await call({
        type: isDraft || publishNow ? 'APPROVE_SCHEDULED_POST' : 'UPDATE_SCHEDULED_POST',
        payload: { id: post.id, text: text.trim(), ...(publishNow ? { publishNow: true } : {}) },
      });
      onNote(
        publishNow
          ? 'Posting it now.'
          : isDraft
            ? 'Scheduled — it goes out at its slot.'
            : 'Saved.',
      );
      // The graduation offer isn't announced here. `onChanged` re-reads the
      // settings the service worker just wrote, and the offer card renders
      // itself at the top of the page — one card, in one place, saying it once.
    });

  const reschedule = () =>
    run('reschedule', async () => {
      const ts = localDateTime(day, time);
      if (!Number.isFinite(ts)) throw new Error('Pick a valid day and time.');
      if (ts < Date.now() - 60_000) throw new Error('That time has already passed.');
      await call({ type: 'UPDATE_SCHEDULED_POST', payload: { id: post.id, scheduledAt: ts } });
      onNote(`Moved to ${formatWhen(ts)}.`);
    });

  const rewrite = () =>
    run('rewrite', async () => {
      const data = await call<{ text: string }>({
        type: 'REWRITE_POST',
        payload: { text: text.trim() },
      });
      setText(data.text);
      onNote('Rewritten — read it before you schedule it.');
    });

  const remove = () =>
    run('delete', async () => {
      await sendToBackground({ type: 'DELETE_SCHEDULED_POST', payload: { id: post.id } });
      onNote('Deleted.');
    });

  /** Same 3 MB / image-only rule the composer uses — X rejects the rest. */
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
      void run('image', async () => {
        await call({
          type: 'UPDATE_SCHEDULED_POST',
          payload: { id: post.id, imageDataUrl: String(reader.result) },
        });
        onNote('Image attached.');
      });
    };
    reader.readAsDataURL(file);
  };

  /**
   * A quote card built from the post's OWN words — typography, not an
   * illustration (updateplan 3.6). Generated AI art reads as "bot" on X and
   * would undo the work the humanizer does on the text.
   */
  const makeCard = () =>
    run('card', async () => {
      const dataUrl = await renderQuoteCardPng({ text: text.trim(), handle: ownHandle });
      if (!dataUrl) throw new Error('Could not draw the card in this browser.');
      await call({ type: 'UPDATE_SCHEDULED_POST', payload: { id: post.id, imageDataUrl: dataUrl } });
      onNote('Quote card attached.');
    });

  return (
    <li
      className={[
        'rounded-xl border p-2.5',
        isDraft
          ? 'border-casper-attention/40 bg-casper-attention/5'
          : 'border-casper-border bg-casper-cloud',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex w-full items-start gap-2 text-left"
      >
        {post.imageDataUrl && (
          <img
            src={post.imageDataUrl}
            alt=""
            className="h-10 w-10 flex-none rounded-md border border-casper-border object-cover"
          />
        )}
        <span className="min-w-0 flex-1">
          <span className="line-clamp-3 block whitespace-pre-wrap text-xs text-casper-ink/80">
            {post.text}
          </span>
          <span className="mt-1.5 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${status.cls}`}>
              {status.label}
            </span>
            <span className="text-xs text-casper-ink/40">{formatWhen(post.scheduledAt)}</span>
            {post.origin === 'auto' && (
              <span className="text-xs text-casper-ink/40">· I wrote this one</span>
            )}
          </span>
        </span>
        <span aria-hidden className="mt-0.5 text-xs text-casper-muted">
          {open ? '▴' : '▾'}
        </span>
      </button>

      {open && editable && (
        <div className="mt-2.5 space-y-2.5 border-t border-casper-border pt-2.5">
          <div>
            <label className="mb-1 flex items-center justify-between font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
              <span>Post text</span>
              <span className={over ? 'text-casper-coral' : 'text-casper-ink/40'}>
                {effectivePostLength(text, post.link)}/{limit}
              </span>
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              className={`w-full resize-y whitespace-pre-wrap rounded-lg border bg-casper-cloud px-2 py-1.5 text-xs leading-relaxed focus:outline-none ${
                over ? 'border-casper-coral/60' : 'border-casper-ink/10 focus:border-casper-violet'
              }`}
            />
          </div>

          <XPreview post={post} text={text} />

          {/*
            The image, changeable here rather than only in the composer. A post
            whose picture is wrong is not a post you want to delete and rewrite.
          */}
          <div className="flex items-center gap-2">
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-casper-ink/10 bg-casper-cloud px-3 py-1.5 text-xs text-casper-ink/70 transition hover:bg-white/5">
              {post.imageDataUrl ? 'Change image' : 'Add image'}
              <input type="file" accept="image/*" onChange={onPickImage} className="hidden" />
            </label>
            {post.imageDataUrl && (
              <button
                type="button"
                onClick={() =>
                  void run('image', async () => {
                    await call({
                      type: 'UPDATE_SCHEDULED_POST',
                      payload: { id: post.id, imageDataUrl: null },
                    });
                    onNote('Image removed.');
                  })
                }
                disabled={busy !== null}
                className="rounded px-2 py-1 text-xs text-casper-coral transition hover:bg-casper-coral/10 disabled:opacity-40"
              >
                Remove image
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <input
              type="date"
              value={day}
              min={toDateInputValue(new Date())}
              onChange={(e) => setDay(e.target.value)}
              className="flex-1 rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
            />
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-28 rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void reschedule()}
              disabled={busy !== null}
              className="rounded-lg border border-casper-border px-3 py-1.5 text-xs text-casper-ink/70 transition hover:bg-white/5 disabled:opacity-40"
            >
              {busy === 'reschedule' ? '…' : 'Reschedule'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => void save(true)}
              disabled={busy !== null || over || text.trim().length === 0}
              className="rounded-lg bg-casper-violet px-3 py-1.5 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              {busy === 'publish' ? 'Posting…' : 'Publish now'}
            </button>
            <button
              type="button"
              onClick={() => void rewrite()}
              disabled={busy !== null}
              className="rounded-lg border border-casper-violet/40 bg-casper-violet/10 px-3 py-1.5 text-xs font-medium text-casper-violet transition hover:bg-casper-violet/20 disabled:opacity-40"
            >
              {busy === 'rewrite' ? 'Rewriting…' : 'Rewrite it'}
            </button>
            <button
              type="button"
              onClick={() => void makeCard()}
              disabled={busy !== null || text.trim().length === 0}
              className="rounded-lg border border-casper-border px-3 py-1.5 text-xs text-casper-ink/70 transition hover:bg-white/5 disabled:opacity-40"
            >
              {busy === 'card' ? 'Drawing…' : 'Make a quote card'}
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              disabled={busy !== null}
              className="rounded-lg bg-casper-coral px-3 py-1.5 text-xs font-medium text-black transition hover:opacity-90 disabled:opacity-40"
            >
              {busy === 'delete' ? '…' : 'Delete'}
            </button>
          </div>

          {(isDraft || changed) && (
            <button
              type="button"
              onClick={() => void save(false)}
              disabled={busy !== null || over || text.trim().length === 0}
              className="w-full rounded-lg border border-casper-working/40 bg-casper-working/10 py-1.5 text-xs font-medium text-casper-working transition hover:bg-casper-working/20 disabled:opacity-40"
            >
              {busy === 'save'
                ? 'Saving…'
                : isDraft
                  ? changed
                    ? 'Post my version at its slot'
                    : 'Yes, schedule it'
                  : 'Save changes'}
            </button>
          )}

          {error && <p className="text-xs text-casper-coral">✗ {error}</p>}
        </div>
      )}

      {open && !editable && (
        <div className="mt-2.5 space-y-2 border-t border-casper-border pt-2.5">
          <XPreview post={post} text={post.text} />
          {post.error && <p className="text-xs text-casper-coral">{post.error}</p>}
        </div>
      )}
    </li>
  );
};
