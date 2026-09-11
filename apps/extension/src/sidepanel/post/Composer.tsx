import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  AiMagicIcon,
  Cancel01Icon,
  Clock01Icon,
  Idea01Icon,
  Image01Icon,
  Link01Icon,
  MagicWand01Icon,
  PencilEdit02Icon,
  PlusSignIcon,
  SentIcon,
  ViewIcon,
} from '@hugeicons/core-free-icons';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toDateInputValue, toTimeInputValue, localDateTime } from '../../lib/schedule-time.js';
import { effectivePostLength, takePanelIntent } from '../../lib/storage.js';
import { formatWhen } from '../pages/_shared.js';
import { Segmented, WIDGET } from '../home/Widget';
import { CharRing, XPreview } from './PostItem';
import { DAY_MS, call, dayStart, nextSlotTime, type PostsState } from './usePosts';

/**
 * Create a post — write it, or describe it and let AI draft it; then pick when.
 *
 *  · AI: say what it's about (or tap one of your topics), optionally a link,
 *    then Draft — or ask for three ideas and pick one.
 *  · Write: the text with an X-style counter, then image / link / thread /
 *    rewrite / preview from one toolbar.
 *  · When: one tap on your best time, or any day and time. Schedule, or post
 *    right now.
 */
type Mode = 'write' | 'ai';

const ACCOUNT_ITEMS = [
  { value: 'free', label: 'X Free · 280' },
  { value: 'pro-short', label: 'Premium · 280' },
  { value: 'pro-mid', label: 'Premium · 1,000' },
  { value: 'pro-long', label: 'Premium · 4,000' },
];

const Chip = ({ on, onClick, children }: { on?: boolean; onClick: () => void; children: ReactNode }) => (
  <button
    type="button"
    onClick={onClick}
    className={cn(
      'inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors',
      on ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground/80 hover:bg-muted/70',
    )}
  >
    {children}
  </button>
);

const defaultWhen = (state: PostsState) => {
  const best = state.bestTimes?.slots[0];
  return best ? nextSlotTime(best) : Date.now() + 60 * 60_000;
};

export const Composer = ({ state, target }: { state: PostsState; target: { day: number; n: number } | null }) => {
  const settings = state.settings!;
  const [mode, setMode] = useState<Mode>('write');
  const [text, setText] = useState('');
  const [description, setDescription] = useState('');
  const [link, setLink] = useState('');
  const [showLink, setShowLink] = useState(false);
  const [image, setImage] = useState<{ dataUrl: string; name: string } | null>(null);
  const [thread, setThread] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  /** The when-options stay tucked away; the Schedule button already says the time. */
  const [showWhen, setShowWhen] = useState(false);
  const [ideas, setIdeas] = useState<string[] | null>(null);
  const [when, setWhen] = useState<number>(() => defaultWhen(state));
  const [touchedWhen, setTouchedWhen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [topicDraft, setTopicDraft] = useState('');
  const box = useRef<HTMLDivElement>(null);

  // Once best times arrive, move the default onto the best slot (unless the user already picked).
  useEffect(() => {
    if (!touchedWhen) setWhen(defaultWhen(state));
  }, [state.bestTimes]);

  // A day picked from the week ("Write one" on an empty day) lands here.
  useEffect(() => {
    if (target === null) return;
    const t = new Date(when);
    const d = new Date(target.day);
    d.setHours(t.getHours(), t.getMinutes(), 0, 0);
    let ms = d.getTime();
    if (ms < Date.now() + 10 * 60_000) ms = Math.max(Date.now() + 60 * 60_000, ms);
    setWhen(ms);
    setTouchedWhen(true);
    setShowWhen(true);
    setMode('write');
    box.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [target]);

  // "Write two for me" / "Write another like this" arrive as a one-shot intent.
  useEffect(() => {
    void takePanelIntent().then((intent) => {
      if (!intent) return;
      setMode('ai');
      if (intent.type === 'write-two') void suggest(2);
      if (intent.type === 'write-like') void suggest(1, intent.seedText);
    });
  }, []);

  const limit = state.limit;
  const used = effectivePostLength(text, link);
  const over = used > limit;
  const threadParts = thread.map((t) => t.trim()).filter(Boolean);
  const atLimit = state.pending.length >= state.max;
  const account = settings.xAccountPlan === 'free' ? 'free' : `pro-${settings.postLength}`;

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(label);
    try {
      await fn();
    } catch (err) {
      state.fail(err instanceof Error ? err.message : 'That did not work');
    } finally {
      setBusy(null);
    }
  };

  const generate = () =>
    run('generate', async () => {
      if (!description.trim()) throw new Error('Say what the post is about first.');
      const data = await call<{ text: string }>('GENERATE_POST', { description: description.trim(), link: link.trim() || undefined });
      setText(data.text);
      setMode('write');
      state.say('Drafted — read it, tweak it, then pick a time.');
    });

  const suggest = (count = 3, seedText?: string) =>
    run('ideas', async () => {
      const data = await call<{ ideas: string[]; basedOnWinners: number }>('GENERATE_IDEAS', {
        count,
        ...(seedText ? { seedText } : {}),
      });
      setIdeas(data.ideas);
      state.say(
        data.basedOnWinners > 0
          ? `Written from your ${data.basedOnWinners} best-performing posts.`
          : 'Written from your topics — these get sharper once a few posts are measured.',
      );
    });

  const rewrite = () =>
    run('rewrite', async () => {
      const data = await call<{ text: string }>('REWRITE_POST', { text: text.trim() });
      setText(data.text);
      state.say('Rewritten — read it before you schedule.');
    });

  const onPickImage = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return state.fail('Please choose an image file.');
    if (file.size > 3 * 1024 * 1024) return state.fail('Image is too large (max 3 MB).');
    const reader = new FileReader();
    reader.onload = () => setImage({ dataUrl: String(reader.result), name: file.name });
    reader.readAsDataURL(file);
  };

  const schedule = (now: boolean) =>
    run(now ? 'now' : 'schedule', async () => {
      if (!text.trim()) throw new Error('Write the post first (or draft it with AI).');
      if (over) throw new Error(`Over the ${limit}-character limit — trim it first.`);
      if (threadParts.some((t) => t.length > limit)) throw new Error(`A thread tweet is over the ${limit}-character limit.`);
      const ts = now ? Date.now() : when;
      if (!now && ts < Date.now() - 60_000) throw new Error('That time has already passed — pick a later one.');
      await call('SCHEDULE_POST', {
        text: text.trim(),
        link: link.trim(),
        imageDataUrl: image?.dataUrl ?? null,
        scheduledAt: ts,
        ...(threadParts.length > 0 ? { thread: threadParts } : {}),
      });
      setText('');
      setDescription('');
      setLink('');
      setShowLink(false);
      setImage(null);
      setThread([]);
      setPreview(false);
      setShowWhen(false);
      setTouchedWhen(false);
      setWhen(defaultWhen(state));
      state.say(now ? 'Posting it now.' : `Scheduled for ${formatWhen(ts)}.`);
      await state.refresh();
    });

  const pickWhen = (ms: number) => {
    setWhen(ms);
    setTouchedWhen(true);
  };

  const setTopics = (topics: string[]) => state.update({ ...settings, contentTopics: topics.slice(0, 10) });

  // Quick "when" options: your best slots, then in an hour, then tomorrow morning.
  const tomorrow = new Date(dayStart(Date.now()) + DAY_MS);
  tomorrow.setHours(settings.activeHours.startHour, 0, 0, 0);
  const quick = [
    ...(state.bestTimes?.slots.slice(0, 2).map((s, i) => ({ ms: nextSlotTime(s), best: i === 0 })) ?? []),
    { ms: Math.ceil((Date.now() + 60 * 60_000) / (15 * 60_000)) * 15 * 60_000, best: false },
    { ms: tomorrow.getTime(), best: false },
  ].filter((q, i, a) => a.findIndex((x) => Math.abs(x.ms - q.ms) < 30 * 60_000) === i);

  const whenLabel = (ms: number) => {
    const d = new Date(ms);
    const day =
      dayStart(ms) === dayStart(Date.now())
        ? 'Today'
        : dayStart(ms) === dayStart(Date.now() + DAY_MS)
          ? 'Tomorrow'
          : d.toLocaleDateString([], { weekday: 'short' });
    return `${day} ${d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  };

  return (
    <section ref={box} className={cn(WIDGET, 'flex scroll-mt-4 flex-col gap-4')}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[17px] font-bold tracking-tight">Create a post</h2>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {state.pending.length} of {state.max} slots used
          </p>
        </div>
        <Segmented
          value={mode}
          options={[
            { id: 'write', label: 'Write' },
            { id: 'ai', label: '✨ AI' },
          ]}
          onChange={setMode}
        />
      </div>

      {mode === 'ai' ? (
        <div className="flex flex-col gap-3">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's it about? e.g. the one habit that doubled my shipping speed"
            className="min-h-20 text-sm"
          />

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Your topics — tap to use, ✕ to remove</p>
            <div className="flex flex-wrap gap-1.5">
              {settings.contentTopics.map((t) => (
                <span key={t} className="inline-flex h-8 items-center rounded-full bg-muted pr-1 pl-3 text-xs font-medium">
                  <button type="button" className="cursor-pointer" onClick={() => setDescription((d) => (d ? `${d}, ${t}` : t))}>
                    {t}
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove ${t}`}
                    onClick={() => setTopics(settings.contentTopics.filter((x) => x !== t))}
                    className="ml-1 grid size-6 cursor-pointer place-items-center rounded-full text-muted-foreground hover:bg-foreground/10"
                  >
                    <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3" />
                  </button>
                </span>
              ))}
              <Input
                value={topicDraft}
                onChange={(e) => setTopicDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && topicDraft.trim()) {
                    setTopics([...settings.contentTopics, topicDraft.trim()]);
                    setTopicDraft('');
                  }
                }}
                placeholder="+ Add topic"
                className="h-8 w-28 rounded-full text-xs"
              />
            </div>
          </div>

          <div className="relative">
            <HugeiconsIcon icon={Link01Icon} strokeWidth={2} className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link to include (optional)" className="pl-9" type="url" />
          </div>

          <div className="flex gap-2">
            <Button className="h-11 flex-1" disabled={busy !== null || !description.trim()} onClick={() => void generate()}>
              <HugeiconsIcon icon={AiMagicIcon} strokeWidth={2} data-icon="inline-start" />
              {busy === 'generate' ? 'Drafting…' : 'Draft it'}
            </Button>
            <Button className="h-11" variant="secondary" disabled={busy !== null} onClick={() => void suggest()}>
              <HugeiconsIcon icon={Idea01Icon} strokeWidth={2} data-icon="inline-start" />
              {busy === 'ideas' ? 'Thinking…' : '3 ideas'}
            </Button>
          </div>

          {ideas && ideas.length > 0 && (
            <div className="flex flex-col gap-2">
              {ideas.map((idea, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setText(idea);
                    setIdeas(null);
                    setMode('write');
                    state.say('Loaded — edit it, then pick a time.');
                  }}
                  className="cursor-pointer rounded-3xl bg-primary/6 p-3 text-left text-sm leading-snug ring-1 ring-primary/15 transition hover:bg-primary/10"
                >
                  <span className="mb-1 block text-[11px] font-semibold tracking-wide text-primary uppercase">Idea {i + 1}</span>
                  <span className="line-clamp-5">{idea}</span>
                </button>
              ))}
              <p className="text-center text-xs text-muted-foreground">Tap one to edit it. Nothing is scheduled until you say so.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="What’s happening? Write it here — or switch to ✨ AI."
              className="min-h-32 pb-9 text-[15px] leading-relaxed"
              aria-invalid={over}
            />
            <span className="absolute right-3 bottom-2.5">
              <CharRing used={used} limit={limit} />
            </span>
          </div>

          {image && (
            <div className="relative w-fit">
              <img src={image.dataUrl} alt={image.name} className="max-h-40 rounded-2xl object-cover" />
              <button
                type="button"
                onClick={() => setImage(null)}
                aria-label="Remove image"
                className="absolute top-2 right-2 grid size-7 cursor-pointer place-items-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} className="size-3.5" />
              </button>
            </div>
          )}

          {showLink && (
            <div className="relative">
              <HugeiconsIcon icon={Link01Icon} strokeWidth={2} className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://…" className="pl-9" type="url" autoFocus />
              {link.trim() && <p className="mt-1 px-1 text-[11px] text-muted-foreground">Links count as 23 characters on X.</p>}
            </div>
          )}

          {/* Thread: each box is one more tweet after the opener, joined by a line. */}
          {thread.map((part, i) => (
            <div key={i} className="relative flex gap-2 pl-4">
              <span className="absolute top-0 bottom-0 left-1.5 w-0.5 rounded-full bg-primary/25" />
              <div className="relative flex-1">
                <Textarea
                  value={part}
                  onChange={(e) => setThread(thread.map((t, j) => (j === i ? e.target.value : t)))}
                  placeholder={`Tweet ${i + 2} of the thread…`}
                  className="min-h-16 pb-8 text-sm"
                  aria-invalid={part.length > limit}
                />
                <span className="absolute right-3 bottom-2">
                  <CharRing used={part.length} limit={limit} />
                </span>
              </div>
              <Button variant="ghost" size="icon-sm" aria-label="Remove from thread" onClick={() => setThread(thread.filter((_, j) => j !== i))}>
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </Button>
            </div>
          ))}

          {/* Toolbar */}
          <div className="flex items-center gap-1">
            <label className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'cursor-pointer text-primary')} title="Add image">
              <HugeiconsIcon icon={Image01Icon} strokeWidth={2} className="size-5" />
              <input type="file" accept="image/*" onChange={onPickImage} className="hidden" />
            </label>
            <Button variant="ghost" size="icon" className={cn('text-primary', showLink && 'bg-primary/10')} title="Add link" onClick={() => setShowLink((v) => !v)}>
              <HugeiconsIcon icon={Link01Icon} strokeWidth={2} className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-primary" title="Add to thread" onClick={() => setThread([...thread, ''])}>
              <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-primary" title="Rewrite with AI" disabled={!text.trim() || busy !== null} onClick={() => void rewrite()}>
              <HugeiconsIcon icon={MagicWand01Icon} strokeWidth={2} className={cn('size-5', busy === 'rewrite' && 'animate-pulse')} />
            </Button>
            <Button variant="ghost" size="icon" className={cn('text-primary', preview && 'bg-primary/10')} title="Preview" onClick={() => setPreview((v) => !v)}>
              <HugeiconsIcon icon={ViewIcon} strokeWidth={2} className="size-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className={cn('text-primary', showWhen && 'bg-primary/10')}
              title="Schedule options"
              aria-expanded={showWhen}
              onClick={() => setShowWhen((v) => !v)}
            >
              <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-5" />
            </Button>
            <div className="ml-auto">
              <Select
                items={ACCOUNT_ITEMS}
                value={account}
                onValueChange={(v) => {
                  if (!v) return;
                  if (v === 'free') state.update({ ...settings, xAccountPlan: 'free' });
                  else state.update({ ...settings, xAccountPlan: 'pro', postLength: v.slice(4) as typeof settings.postLength });
                }}
              >
                <SelectTrigger size="sm" className="h-8 rounded-full text-xs" aria-label="Your X account">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="end">
                  {ACCOUNT_ITEMS.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {preview && <XPreview text={text} link={link} image={image?.dataUrl} thread={threadParts} handle={state.ownHandle} />}
        </div>
      )}

      {/* When — opened from the clock in the toolbar */}
      {showWhen && (
      <div className="flex flex-col gap-2.5 rounded-3xl bg-muted/50 p-3 animate-in fade-in slide-in-from-top-1">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
          <HugeiconsIcon icon={Clock01Icon} strokeWidth={2} className="size-3.5" />
          When should it go out?
        </p>
        <div className="no-scrollbar -mx-3 flex gap-1.5 overflow-x-auto px-3">
          {quick.map((q) => (
            <Chip key={q.ms} on={Math.abs(when - q.ms) < 60_000} onClick={() => pickWhen(q.ms)}>
              {q.best && <span aria-hidden>⭐</span>}
              {whenLabel(q.ms)}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2">
          <Input
            type="date"
            value={toDateInputValue(new Date(when))}
            min={toDateInputValue(new Date())}
            onChange={(e) => e.target.value && pickWhen(localDateTime(e.target.value, toTimeInputValue(new Date(when))))}
            className="h-9 flex-1 bg-background"
          />
          <Input
            type="time"
            value={toTimeInputValue(new Date(when))}
            onChange={(e) => e.target.value && pickWhen(localDateTime(toDateInputValue(new Date(when)), e.target.value))}
            className="h-9 w-28 bg-background"
          />
        </div>
        {state.bestTimes && (
          <p className="text-[11px] leading-snug text-muted-foreground">
            ⭐ {state.bestTimes.personalised ? 'Your best time, from your own posts.' : 'A good default until I learn your audience.'} Posts go out
            through your X session — if the browser is closed then, it posts when you next open it.
          </p>
        )}
      </div>
      )}

      {atLimit && (
        <p className="rounded-2xl bg-casper-attention/10 px-3 py-2 text-xs text-casper-attention">
          All {state.max} slots are full. Delete or post one to add another.
        </p>
      )}

      <div className="flex gap-2">
        <Button className="h-12 flex-1 text-[15px]" disabled={busy !== null || atLimit || !text.trim() || over} onClick={() => void schedule(false)}>
          <HugeiconsIcon icon={PencilEdit02Icon} strokeWidth={2} data-icon="inline-start" />
          {busy === 'schedule' ? 'Scheduling…' : `Schedule · ${whenLabel(when)}`}
        </Button>
        <Button
          className="h-12"
          variant="secondary"
          disabled={busy !== null || atLimit || !text.trim() || over}
          onClick={() => void schedule(true)}
          title="Post right now"
        >
          <HugeiconsIcon icon={SentIcon} strokeWidth={2} data-icon="inline-start" />
          {busy === 'now' ? '…' : 'Now'}
        </Button>
      </div>
    </section>
  );
};
