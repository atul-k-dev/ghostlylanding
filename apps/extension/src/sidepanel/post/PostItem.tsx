import { useState, type ChangeEvent } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  ArrowDown01Icon,
  Delete02Icon,
  Image01Icon,
  MagicWand01Icon,
  QuoteDownIcon,
  SentIcon,
  Tick02Icon,
} from '@hugeicons/core-free-icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toDateInputValue, toTimeInputValue, localDateTime } from '../../lib/schedule-time.js';
import { effectivePostLength, type ScheduledPost } from '../../lib/storage.js';
import { renderQuoteCardPng } from '../../lib/quote-card.js';
import { formatWhen } from '../pages/_shared.js';
import { call, type PostsState } from './usePosts';

/**
 * One post on the agenda: a time, a line on the timeline, and a card that
 * opens in place to edit, move, rewrite, illustrate, publish or delete it.
 *
 * A draft — one Ghostly wrote that nobody has said yes to — leads with the
 * decision: approving is what turns `draft` into `scheduled`, and until then
 * the publisher cannot touch it.
 */
export const STATUS: Record<ScheduledPost['status'], { label: string; cls: string; dot: string }> = {
  draft: { label: 'Waiting for you', cls: 'bg-casper-attention/15 text-casper-attention', dot: 'bg-casper-attention' },
  scheduled: { label: 'Scheduled', cls: 'bg-primary/12 text-primary', dot: 'bg-primary' },
  publishing: { label: 'Posting…', cls: 'bg-primary/12 text-primary', dot: 'bg-primary animate-pulse' },
  posted: { label: 'Posted', cls: 'bg-casper-working/15 text-casper-working', dot: 'bg-casper-working' },
  failed: { label: 'Failed', cls: 'bg-destructive/12 text-destructive', dot: 'bg-destructive' },
};

const time = (ms: number) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/** Counter as a small ring that fills toward the limit, like X's. */
export const CharRing = ({ used, limit }: { used: number; limit: number }) => {
  const r = 9;
  const c = 2 * Math.PI * r;
  const f = Math.min(1, used / limit);
  const over = used > limit;
  const near = !over && limit - used <= 20;
  return (
    <span className="inline-flex items-center gap-1.5 text-xs tabular-nums">
      {(near || over) && <span className={over ? 'font-semibold text-destructive' : 'text-casper-attention'}>{limit - used}</span>}
      <svg viewBox="0 0 24 24" className="size-5 -rotate-90" aria-label={`${used} of ${limit} characters`}>
        <circle cx="12" cy="12" r={r} fill="none" strokeWidth="2.5" className="stroke-foreground/10" />
        <circle
          cx="12"
          cy="12"
          r={r}
          fill="none"
          strokeWidth="2.5"
          strokeDasharray={`${c * f} ${c}`}
          className={over ? 'stroke-destructive' : near ? 'stroke-casper-attention' : 'stroke-primary'}
        />
      </svg>
    </span>
  );
};

/** How X renders it: avatar, name, the text, then link / image / thread. */
export const XPreview = ({
  text,
  link,
  image,
  thread,
  handle,
}: {
  text: string;
  link?: string;
  image?: string | null;
  thread?: string[];
  handle: string | null;
}) => (
  <div className="rounded-3xl bg-muted/50 p-3">
    <p className="mb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Preview on X</p>
    <div className="flex gap-2.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
        {(handle ?? 'Y')[0]?.toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-bold">{handle ? `@${handle}` : 'You'}</span>
          <span className="text-muted-foreground"> · now</span>
        </p>
        <p className="mt-0.5 text-sm leading-relaxed break-words whitespace-pre-wrap">{text || <span className="text-muted-foreground">Nothing written yet.</span>}</p>
        {link && <p className="mt-1 truncate text-sm text-primary">{link}</p>}
        {image && <img src={image} alt="" className="mt-2 max-h-48 w-full rounded-2xl object-cover" />}
        {thread && thread.length > 0 && <p className="mt-1.5 text-xs text-muted-foreground">+ {thread.length} more in the thread</p>}
      </div>
    </div>
  </div>
);

export const PostItem = ({ post, state }: { post: ScheduledPost; state: PostsState }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(post.text);
  const [day, setDay] = useState(() => toDateInputValue(new Date(post.scheduledAt)));
  const [at, setAt] = useState(() => toTimeInputValue(new Date(post.scheduledAt)));
  const [busy, setBusy] = useState<string | null>(null);

  const s = STATUS[post.status];
  const isDraft = post.status === 'draft';
  const editable = isDraft || post.status === 'scheduled';
  const used = effectivePostLength(text, post.link);
  const over = used > state.limit;
  const changed = text.trim() !== post.text.trim();
  const moved = localDateTime(day, at) !== post.scheduledAt;

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(label);
    try {
      state.say(await fn());
      await state.refresh();
    } catch (err) {
      state.fail(err instanceof Error ? err.message : 'That did not work');
    } finally {
      setBusy(null);
    }
  };

  // A draft is APPROVED (draft → scheduled); a scheduled post is only edited.
  // One of those is permission, and the code keeps them apart.
  const save = (publishNow: boolean) =>
    run(publishNow ? 'publish' : 'save', async () => {
      await call(isDraft || publishNow ? 'APPROVE_SCHEDULED_POST' : 'UPDATE_SCHEDULED_POST', {
        id: post.id,
        text: text.trim(),
        ...(publishNow ? { publishNow: true } : {}),
      });
      return publishNow ? 'Posting it now.' : isDraft ? 'Scheduled — it goes out at its slot.' : 'Saved.';
    });

  const reschedule = () =>
    run('move', async () => {
      const ts = localDateTime(day, at);
      if (!Number.isFinite(ts)) throw new Error('Pick a valid day and time.');
      if (ts < Date.now() - 60_000) throw new Error('That time has already passed.');
      await call('UPDATE_SCHEDULED_POST', { id: post.id, scheduledAt: ts });
      return `Moved to ${formatWhen(ts)}.`;
    });

  const rewrite = () =>
    run('rewrite', async () => {
      const data = await call<{ text: string }>('REWRITE_POST', { text: text.trim() });
      setText(data.text);
      return 'Rewritten — read it before it goes out.';
    });

  const setImage = (dataUrl: string | null, note: string) =>
    run('image', async () => {
      await call('UPDATE_SCHEDULED_POST', { id: post.id, imageDataUrl: dataUrl });
      return note;
    });

  const onPickImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return state.fail('Please choose an image file.');
    if (file.size > 3 * 1024 * 1024) return state.fail('Image is too large (max 3 MB).');
    const reader = new FileReader();
    reader.onload = () => void setImage(String(reader.result), 'Image attached.');
    reader.readAsDataURL(file);
  };

  // Typography from the post's own words — AI art reads as "bot" on X.
  const quoteCard = () =>
    run('card', async () => {
      const dataUrl = await renderQuoteCardPng({ text: text.trim(), handle: state.ownHandle });
      if (!dataUrl) throw new Error('Could not draw the card in this browser.');
      await call('UPDATE_SCHEDULED_POST', { id: post.id, imageDataUrl: dataUrl });
      return 'Quote card attached.';
    });

  const remove = () =>
    run('delete', async () => {
      await call('DELETE_SCHEDULED_POST', { id: post.id });
      return 'Deleted.';
    });

  return (
    <li className="group/agenda relative flex gap-3">
      {/* time + timeline */}
      <div className="flex w-14 shrink-0 flex-col items-end pt-3.5">
        <span className="font-display text-sm font-bold tabular-nums">{time(post.scheduledAt)}</span>
      </div>
      <div className="relative flex w-3 shrink-0 justify-center">
        <span className="absolute top-0 bottom-0 w-px bg-border group-last/agenda:bottom-auto group-last/agenda:h-5" />
        <span className={cn('relative mt-4 size-3 rounded-full ring-4 ring-canvas', s.dot)} />
      </div>

      <div
        className={cn(
          'mb-3 min-w-0 flex-1 rounded-3xl bg-card shadow-sm ring-1 ring-[color:var(--card-ring)] transition',
          isDraft && 'ring-casper-attention/40',
        )}
      >
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full cursor-pointer items-start gap-3 p-3 text-left">
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-1.5">
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-semibold', s.cls)}>{s.label}</span>
              {post.origin === 'auto' && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">✨ I wrote this</span>
              )}
              {post.thread && post.thread.length > 0 && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">Thread · {post.thread.length + 1}</span>
              )}
            </span>
            <span className={cn('mt-2 block text-sm leading-snug whitespace-pre-wrap', !open && 'line-clamp-3')}>{post.text}</span>
          </span>
          {post.imageDataUrl && !open && <img src={post.imageDataUrl} alt="" className="size-14 shrink-0 rounded-2xl object-cover" />}
          <HugeiconsIcon icon={ArrowDown01Icon} strokeWidth={2} className={cn('mt-0.5 size-4 shrink-0 text-muted-foreground transition-transform', open && 'rotate-180')} />
        </button>

        {open && !editable && (
          <div className="flex flex-col gap-3 px-3 pb-3">
            <XPreview text={post.text} link={post.link} image={post.imageDataUrl} thread={post.thread} handle={state.ownHandle} />
            {post.error && <p className="text-xs text-destructive">{post.error}</p>}
          </div>
        )}

        {open && editable && (
          <div className="flex flex-col gap-3 px-3 pb-3">
            <div className="relative">
              <Textarea value={text} onChange={(e) => setText(e.target.value)} className="min-h-24 pb-8 text-sm" aria-invalid={over} />
              <span className="absolute right-3 bottom-2">
                <CharRing used={used} limit={state.limit} />
              </span>
            </div>

            <XPreview text={text} link={post.link} image={post.imageDataUrl} thread={post.thread} handle={state.ownHandle} />

            {/* When */}
            <div className="flex items-center gap-2">
              <Input type="date" value={day} min={toDateInputValue(new Date())} onChange={(e) => setDay(e.target.value)} className="h-9 flex-1" />
              <Input type="time" value={at} onChange={(e) => setAt(e.target.value)} className="h-9 w-28" />
              <Button variant="secondary" size="sm" disabled={!moved || busy !== null} onClick={() => void reschedule()}>
                {busy === 'move' ? 'Moving…' : 'Move'}
              </Button>
            </div>

            {/* Tools */}
            <div className="flex flex-wrap gap-1.5">
              <Button variant="outline" size="sm" disabled={busy !== null} onClick={() => void rewrite()}>
                <HugeiconsIcon icon={MagicWand01Icon} strokeWidth={2} data-icon="inline-start" />
                {busy === 'rewrite' ? 'Rewriting…' : 'Rewrite'}
              </Button>
              <Button variant="outline" size="sm" disabled={busy !== null || !text.trim()} onClick={() => void quoteCard()}>
                <HugeiconsIcon icon={QuoteDownIcon} strokeWidth={2} data-icon="inline-start" />
                {busy === 'card' ? 'Drawing…' : 'Quote card'}
              </Button>
              <label className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'cursor-pointer')}>
                <HugeiconsIcon icon={Image01Icon} strokeWidth={2} data-icon="inline-start" />
                {post.imageDataUrl ? 'Change image' : 'Image'}
                <input type="file" accept="image/*" onChange={onPickImage} disabled={busy !== null} className="hidden" />
              </label>
              {post.imageDataUrl && (
                <Button variant="ghost" size="sm" disabled={busy !== null} onClick={() => void setImage(null, 'Image removed.')}>
                  Remove image
                </Button>
              )}
            </div>

            {/* Decide */}
            <div className="flex gap-2">
              {isDraft || changed ? (
                <Button className="h-11 flex-1" disabled={busy !== null || over || !text.trim()} onClick={() => void save(false)}>
                  <HugeiconsIcon icon={Tick02Icon} strokeWidth={2.2} data-icon="inline-start" />
                  {busy === 'save' ? 'Saving…' : isDraft ? (changed ? 'Schedule my version' : 'Yes, schedule it') : 'Save changes'}
                </Button>
              ) : (
                <Button className="h-11 flex-1" variant="secondary" disabled={busy !== null || over} onClick={() => void save(true)}>
                  <HugeiconsIcon icon={SentIcon} strokeWidth={2} data-icon="inline-start" />
                  {busy === 'publish' ? 'Posting…' : 'Post now'}
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon-lg"
                className="size-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
                disabled={busy !== null}
                onClick={() => void remove()}
                aria-label="Delete post"
              >
                <HugeiconsIcon icon={Delete02Icon} strokeWidth={2} />
              </Button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
};
