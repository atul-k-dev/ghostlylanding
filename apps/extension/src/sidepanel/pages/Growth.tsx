import { useEffect, useState } from 'react';
import type { GrowthSummary, GrowthDelta, PostOutcome } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import { fmtNum } from './_shared.js';

/**
 * Growth — followers over time and what earned them.
 *
 * Ported unchanged from `popup/views/Dashboard.tsx:1113-1380` in updateplan 1.6,
 * exactly as the plan asks. Phase 5.1 rebuilds it around attribution; until then
 * changing it here would be two rewrites of the same screen.
 */

/** Follower trend. Uniform-scaled points; a single reading renders as a dot. */
const Sparkline = ({ points }: { points: number[] }) => {
  const W = 400;
  const H = 64;
  const PAD = 6;
  if (points.length === 0) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  // A flat line (no growth yet) would divide by zero — park it mid-height.
  const span = max - min || 1;
  const x = (i: number): number => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
  const y = (v: number): number =>
    max === min ? H / 2 : H - PAD - ((v - min) / span) * (H - PAD * 2);

  const line = points.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-16 w-full"
      role="img"
      aria-label={`Follower trend over the last ${points.length} readings`}
    >
      <defs>
        <linearGradient id="ghostly-spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f44d60" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#f44d60" stopOpacity="0" />
        </linearGradient>
      </defs>
      {points.length > 1 && (
        <>
          <polygon points={`0,${H} ${line} ${W},${H}`} fill="url(#ghostly-spark)" />
          <polyline
            points={line}
            fill="none"
            stroke="#f44d60"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        </>
      )}
      <circle
        cx={x(points.length - 1)}
        cy={y(points[points.length - 1] ?? 0)}
        r="3"
        fill="#f44d60"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
};

/** One follower-change tile. Honest about short history: a 3-day-old install
 *  reports "+12 · 3d", never a made-up month. */
const DeltaTile = ({ label, delta }: { label: string; delta: GrowthDelta }) => {
  const has = delta.change !== null;
  const up = (delta.change ?? 0) > 0;
  const down = (delta.change ?? 0) < 0;
  return (
    <div className="rounded-xl border border-casper-border bg-casper-surface p-3">
      <p className="font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold ${
          up ? 'text-emerald-300' : down ? 'text-rose-300' : 'text-casper-ink'
        }`}
      >
        {has ? `${up ? '+' : ''}${fmtNum(delta.change ?? 0)}` : '—'}
      </p>
      <p className="text-xs text-casper-ink/40">
        {has ? `over ${delta.days}d` : 'needs 2 readings'}
      </p>
    </div>
  );
};

const TopReply = ({ post }: { post: PostOutcome }) => (
  <a
    href={post.url}
    target="_blank"
    rel="noreferrer"
    className="block rounded-xl border border-casper-border bg-casper-surface p-2.5 transition hover:bg-white/5"
  >
    <div className="mb-1 flex items-center gap-3 text-xs">
      <span className="font-semibold text-casper-violet">♥ {fmtNum(post.likes)}</span>
      <span className="text-casper-ink/50">💬 {fmtNum(post.replies)}</span>
      {post.reposts > 0 && <span className="text-casper-ink/50">🔁 {fmtNum(post.reposts)}</span>}
      {post.views !== null && (
        <span className="ml-auto text-xs text-casper-ink/35">
          {fmtNum(post.views)} views
        </span>
      )}
    </div>
    <p className="line-clamp-2 text-xs leading-snug text-casper-ink/70">
      {post.text || (post.isReply ? '(reply)' : '(post)')}
    </p>
  </a>
);


export const Growth = () => {
  const [summary, setSummary] = useState<GrowthSummary | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const resp = await sendToBackground<
        { ok: true; data: GrowthSummary } | { ok: false; error: { message: string } | string }
      >({ type: 'GET_GROWTH', payload: { days: 30 } });
      if (resp.ok) {
        setSummary(resp.data);
        setError(null);
      } else {
        setError(typeof resp.error === 'string' ? resp.error : resp.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setLoaded(true);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  /** Reads the profile now. Takes a minute or two — the scan opens (background)
   *  tabs for the profile, the followers sample, and the replies timeline. */
  const refresh = async () => {
    setRefreshing(true);
    setError(null);
    try {
      const resp = await sendToBackground<
        { ok: true; data: { message: string } } | { ok: false; error: { message: string } | string }
      >({ type: 'REFRESH_GROWTH', payload: {} });
      if (!resp.ok) {
        setError(typeof resp.error === 'string' ? resp.error : resp.error.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'refresh failed');
    } finally {
      setRefreshing(false);
      await load();
    }
  };

  if (!loaded) {
    return <p className="py-4 text-center text-xs text-casper-ink/40">Loading…</p>;
  }

  const latest = summary?.latest ?? null;
  const series = summary?.series ?? [];
  const replies = summary?.replies;

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-300">{error}</div>
      )}

      {latest === null ? (
        <div className="flex h-[300px] flex-col items-center justify-center px-6 text-center">
          <div className="mb-2 text-3xl" aria-hidden>
            📈
          </div>
          <p className="text-xs text-casper-ink/70">No readings yet.</p>
          <p className="mt-1 text-xs leading-relaxed text-casper-ink/40">
            Ghostly checks your profile once a day and notes your followers, plus how the replies
            it left actually performed. Take the first reading now and come back tomorrow to see
            the line move.
          </p>
          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="mt-4 rounded-lg bg-casper-violet px-4 py-2 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {refreshing ? 'Reading your profile…' : 'Take the first reading'}
          </button>
        </div>
      ) : (
        <>
          {/* Headline: followers + trend */}
          <div className="rounded-2xl border border-casper-border bg-casper-surface p-3">
            <div className="flex items-baseline justify-between">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.12em] text-casper-ink/40">
                  Followers
                </p>
                <p className="text-2xl font-semibold">{fmtNum(latest.followers)}</p>
              </div>
              <p className="text-right text-xs text-casper-ink/40">
                {fmtNum(latest.following)} following
                {latest.posts !== null && <> · {fmtNum(latest.posts)} posts</>}
                <span className="block">read {latest.date}</span>
              </p>
            </div>
            <div className="mt-2">
              <Sparkline points={series.map((p) => p.followers)} />
            </div>
          </div>

          {/* Deltas */}
          {summary && (
            <div className="grid grid-cols-3 gap-2">
              <DeltaTile label="Today" delta={summary.deltas.day} />
              <DeltaTile label="7 days" delta={summary.deltas.week} />
              <DeltaTile label="30 days" delta={summary.deltas.month} />
            </div>
          )}

          {/* Follow-back payoff */}
          {latest.followedBack !== null && latest.followedBackSample ? (
            <div className="rounded-xl border border-casper-border bg-casper-surface p-3">
              <p className="text-xs text-casper-ink/70">
                <span className="font-semibold text-casper-violet">
                  {fmtNum(latest.followedBack)}
                </span>{' '}
                of your last {fmtNum(latest.followedBackSample)} followers are accounts Ghostly
                followed first.
              </p>
            </div>
          ) : null}

          {/* Reply performance */}
          <div className="rounded-2xl border border-casper-border bg-casper-surface p-3">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-xs font-semibold">Your replies</p>
              <p className="text-xs text-casper-ink/40">
                {replies?.tracked ?? 0} measured · {fmtNum(replies?.totalLikes ?? 0)} likes · avg{' '}
                {replies?.avgLikes ?? 0}
              </p>
            </div>
            {replies && replies.top.length > 0 ? (
              <div className="space-y-2">
                {replies.top.map((post) => (
                  <TopReply key={post.tweetId} post={post} />
                ))}
              </div>
            ) : (
              <p className="py-3 text-center text-xs text-casper-ink/40">
                Nothing measured yet — replies show up here after the next daily reading.
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={refresh}
            disabled={refreshing}
            className="w-full rounded-lg border border-casper-border py-2 text-xs font-medium text-casper-ink/70 transition hover:bg-white/5 disabled:opacity-50"
          >
            {refreshing ? 'Reading your profile…' : 'Refresh now'}
          </button>
        </>
      )}
    </div>
  );
};

