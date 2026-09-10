import { useEffect, useState } from 'react';
import type { ExtensionSettings } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import { toDateInputValue, toTimeInputValue, localDateTime } from '../../lib/schedule-time.js';
import {
  getSettings,
  setSettings,
  tweetLimitFor,
  effectivePostLength,
  STORAGE_KEYS,
  type ScheduledPost,
} from '../../lib/storage.js';
import { POST_LENGTHS, POST_STATUS, formatWhen, Section } from './_shared.js';
import { WeekStrip } from './WeekStrip.js';

/**
 * Posts — write, schedule, publish.
 *
 * Ported from `popup/views/Dashboard.tsx:1494-2058` in updateplan 1.6. The flat
 * list is now a week strip (see WeekStrip.tsx); everything else is the shipped
 * behaviour, which already handles threads, images, character limits and
 * failure states. Phase 3 makes it autonomous.
 */

const PostsInner = ({
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
  /** Day-start ms of the day being shown in the week strip, or null for all. */
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
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
        <p className="mt-1 text-xs leading-relaxed text-casper-ink/60">
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
            <p className="mb-1.5 font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
              Post length
            </p>
            <div className="flex gap-2">
              {POST_LENGTHS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => onChange({ ...settings, postLength: l.id })}
                  aria-pressed={settings.postLength === l.id}
                  className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium transition ${
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
        <label className="mb-1.5 block font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
          What's the post about?
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          placeholder="e.g. why I stopped using keyword filters and switched to intent-based targeting"
          className="w-full resize-none rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
        />

        <label className="mb-1.5 mt-3 block font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
          Link (optional)
        </label>
        <input
          type="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-lg border border-casper-ink/10 bg-casper-cloud px-2 py-1.5 text-xs focus:border-casper-violet focus:outline-none"
        />

        <label className="mb-1.5 mt-3 block font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
          Image (optional)
        </label>
        {image ? (
          <div className="flex items-center gap-2">
            <img
              src={image.dataUrl}
              alt="attachment"
              className="h-12 w-12 flex-none rounded-lg border border-casper-border object-cover"
            />
            <span className="flex-1 truncate text-xs text-casper-ink/50">{image.name}</span>
            <button
              type="button"
              onClick={() => setImage(null)}
              className="rounded px-2 py-0.5 text-xs text-rose-400 hover:bg-rose-500/10"
            >
              Remove
            </button>
          </div>
        ) : (
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-casper-ink/10 bg-casper-cloud px-3 py-1.5 text-xs text-casper-ink/70 transition hover:bg-white/5">
            Choose image
            <input type="file" accept="image/*" onChange={onPickImage} className="hidden" />
          </label>
        )}

        <button
          type="button"
          onClick={generate}
          disabled={generating || !description.trim()}
          className="mt-3 w-full rounded-lg bg-casper-violet/10 px-3 py-2 text-xs font-medium text-casper-violet transition hover:bg-casper-violet/20 disabled:opacity-50"
        >
          {generating ? 'Drafting…' : text ? 'Re-draft with AI' : 'Draft with AI ✨'}
        </button>

        <label className="mb-1.5 mt-3 flex items-center justify-between font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
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
          <p className="mt-1 text-xs text-rose-400">
            Over the {limit}-character limit
            {link.trim() ? ' (your link counts as 23 characters)' : ''} — trim it before scheduling.
          </p>
        ) : (
          link.trim() && (
            <p className="mt-1 text-xs text-casper-ink/40">
              Your link counts as 23 characters toward the {limit} limit.
            </p>
          )
        )}

        {/* Thread: each box is one more tweet after the opener. */}
        {thread.map((part, i) => (
          <div key={i} className="mt-2">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
                Thread · {i + 2}
              </span>
              <button
                type="button"
                onClick={() => setThread(thread.filter((_, j) => j !== i))}
                className="text-xs text-casper-ink/40 transition hover:text-casper-coral"
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
          className="mt-2 w-full rounded-lg border border-casper-border py-1.5 text-xs text-casper-ink/60 transition hover:bg-white/5"
        >
          + Add to thread
        </button>

        <div className="mt-3 border-t border-casper-border pt-3">
          <label className="mb-1.5 block font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
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
            className="w-full rounded-lg border border-casper-violet/40 bg-casper-violet/10 py-1.5 text-xs font-medium text-casper-violet transition hover:bg-casper-violet/20 disabled:opacity-40"
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
                  className="block w-full rounded-lg border border-casper-border bg-casper-cloud p-2 text-left text-xs leading-snug text-casper-ink/75 transition hover:bg-white/5"
                >
                  {idea.length > 220 ? `${idea.slice(0, 220)}…` : idea}
                </button>
              ))}
              <p className="text-xs text-casper-ink/40">
                Tap one to load it into the composer. Nothing is scheduled until you say so.
              </p>
            </div>
          )}
        </div>

        <label className="mb-1.5 mt-3 block font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
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
        <p className="mt-1 text-xs text-casper-ink/40">
          Goes out at this time, the next time your browser is open. If it's closed at that
          moment, it posts as soon as you open Ghostly247 afterwards.
        </p>

        {atLimit && (
          <p className="mt-2 text-xs text-amber-300">
            You've hit the {max}-post limit. Delete a scheduled post below to add another.
          </p>
        )}
        <button
          type="button"
          onClick={schedule}
          disabled={busy || atLimit || !text.trim() || over}
          className="mt-3 w-full rounded-lg bg-casper-violet px-3 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {busy ? 'Scheduling…' : 'Schedule post'}
        </button>
        {error && <p className="mt-2 text-xs text-rose-400">✗ {error}</p>}
        {notice && <p className="mt-2 text-xs text-emerald-300">{notice}</p>}
        {isPaused && pending.length > 0 && (
          <p className="mt-2 text-xs text-casper-ink/40">
            Heads up: scheduled posts still publish on their day even though the engine is paused.
          </p>
        )}
      </Section>

      {/*
        The week, not a list (updateplan 1.6). A chronological list answers
        "what is queued"; the question a creator actually needs answered is
        which days are EMPTY — that is the one that makes them write something.
      */}
      <Section title="Your week">
        <WeekStrip posts={pending} selected={selectedDay} onSelect={setSelectedDay} />
        {(() => {
          const shown = pending
            .slice()
            .filter(
              (p) =>
                selectedDay === null ||
                new Date(p.scheduledAt).toDateString() === new Date(selectedDay).toDateString(),
            )
            .sort((a, b) => a.scheduledAt - b.scheduledAt);
          if (shown.length === 0) {
            return (
              <p className="mt-3 text-xs leading-relaxed text-casper-muted">
                {selectedDay === null
                  ? 'Nothing scheduled yet. Write one above, or ask me for ideas.'
                  : 'Nothing on that day — which is the gap worth filling.'}
              </p>
            );
          }
          return (
            <ul className="mt-3 space-y-2">
              {shown.map((p) => (
                <PostRow key={p.id} post={p} onDelete={() => remove(p.id)} />
              ))}
            </ul>
          );
        })()}
      </Section>

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
          <p className="line-clamp-3 whitespace-pre-wrap text-xs text-casper-ink/80">
            {post.text}
          </p>
          {post.link && (
            <p className="mt-0.5 truncate text-xs text-casper-violet">{post.link}</p>
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
        <span className="text-xs text-casper-ink/40">
          {formatWhen(post.scheduledAt)}
          {post.thread && post.thread.length > 0 && (
            <span className="ml-1 text-casper-violet">· thread of {post.thread.length + 1}</span>
          )}
        </span>
        {post.status === 'failed' && post.error && (
          <span className="truncate text-xs text-rose-400/80" title={post.error}>
            · {post.error}
          </span>
        )}
      </div>
    </li>
  );
};

/**
 * Posts owns its own settings now. In the popup it was handed them by the
 * six-tab Dashboard; in the panel each page loads what it needs, so a page can
 * be opened directly by a condition card's button without the shell having to
 * know what that page happens to require.
 */
export const Posts = () => {
  const [settings, setLocal] = useState<ExtensionSettings | null>(null);

  useEffect(() => {
    void getSettings().then(setLocal);
  }, []);

  if (!settings) {
    return <p className="py-6 text-center text-xs text-casper-muted">Catching up…</p>;
  }

  return (
    <PostsInner
      settings={settings}
      onChange={(next) => {
        setLocal(next);
        void setSettings(next);
      }}
    />
  );
};
