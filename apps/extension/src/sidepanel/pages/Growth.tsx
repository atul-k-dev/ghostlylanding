import { useEffect, useState } from 'react';
import type {
  GrowthSummary,
  GrowthDelta,
  PostOutcome,
  GrowthMilestone,
  TargetPerformance,
  TopicPerformance,
} from '@casper/shared';
import type { HeatmapCell } from '../../lib/best-times.js';
import { sendToBackground } from '../../lib/messages.js';
import { getSettings, setSettings, getGrowthMilestones, setPanelIntent } from '../../lib/storage.js';
import type { PanelTarget } from '../navigation.js';
import { fmtNum } from './_shared.js';

/**
 * Growth — followers over time, and why (updateplan 5.1).
 *
 * Rebuilt around attribution: change markers on the chart, where the
 * engagement is actually coming from, which targets/topics are earning their
 * keep, the best-time heatmap, and the best posts with a one-click "write
 * another like this". Every number here is real — either a follower count,
 * or a count of actions the action log actually recorded. There is
 * deliberately no per-target or per-topic FOLLOWER figure: X gives no way to
 * attribute an individual new follower to an individual past action, and
 * this product refuses to invent one.
 */

const MS_DAY = 86_400_000;

/** Follower trend with change markers (updateplan 5.1). Uniform-scaled
 *  points; a single reading renders as a dot. */
const Sparkline = ({
  points,
  dates,
  milestones,
}: {
  points: number[];
  dates: string[];
  milestones: GrowthMilestone[];
}) => {
  const W = 400;
  const H = 64;
  const PAD = 6;
  if (points.length === 0) return null;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const x = (i: number): number => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
  const y = (v: number): number =>
    max === min ? H / 2 : H - PAD - ((v - min) / span) * (H - PAD * 2);

  const line = points.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');

  // A milestone lands on the sparkline at the nearest snapshot date, never
  // interpolated — it marks "this happened around here", not an exact pixel.
  const markers = dates.length > 1
    ? milestones
        .map((m) => {
          const at = Date.parse(m.at);
          if (!Number.isFinite(at)) return null;
          let nearest = 0;
          let nearestDist = Infinity;
          dates.forEach((d, i) => {
            const dist = Math.abs(Date.parse(d) - at);
            if (dist < nearestDist) {
              nearestDist = dist;
              nearest = i;
            }
          });
          // Don't mark a milestone that happened well outside the visible window.
          if (nearestDist > MS_DAY * 3) return null;
          return { ...m, xPos: x(nearest) };
        })
        .filter((m): m is GrowthMilestone & { xPos: number } => m !== null)
    : [];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="h-16 w-full overflow-visible"
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
      {markers.map((m, i) => (
        <line
          key={i}
          x1={m.xPos}
          x2={m.xPos}
          y1={0}
          y2={H}
          stroke="#e6a53a"
          strokeWidth="1"
          strokeDasharray="2 2"
          vectorEffect="non-scaling-stroke"
        >
          <title>{m.detail}</title>
        </line>
      ))}
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

const TopReply = ({
  post,
  onWriteLike,
}: {
  post: PostOutcome;
  onWriteLike: (text: string) => void;
}) => (
  <div className="rounded-xl border border-casper-border bg-casper-surface p-2.5">
    <a href={post.url} target="_blank" rel="noreferrer" className="block transition hover:opacity-80">
      <div className="mb-1 flex items-center gap-3 text-xs">
        <span className="font-semibold text-casper-violet">♥ {fmtNum(post.likes)}</span>
        <span className="text-casper-ink/50">💬 {fmtNum(post.replies)}</span>
        {post.reposts > 0 && <span className="text-casper-ink/50">🔁 {fmtNum(post.reposts)}</span>}
        {post.views !== null && (
          <span className="ml-auto text-xs text-casper-ink/35">{fmtNum(post.views)} views</span>
        )}
      </div>
      <p className="line-clamp-2 text-xs leading-snug text-casper-ink/70">
        {post.text || (post.isReply ? '(reply)' : '(post)')}
      </p>
    </a>
    {!post.isReply && post.text && (
      <button
        type="button"
        onClick={() => onWriteLike(post.text)}
        className="mt-2 text-xs text-casper-violet transition hover:opacity-80"
      >
        Write another like this →
      </button>
    )}
  </div>
);

/** Where the engagement is coming from (5.1). Follow-backs is a real
 *  FOLLOWER figure; the posts/replies split is an ENGAGEMENT figure — there
 *  is no honest way to attribute a follower to one post or reply. */
const SourcesCard = ({ summary }: { summary: GrowthSummary }) => {
  const { postsLikes, repliesLikes } = summary.sources;
  const total = postsLikes + repliesLikes;
  const latest = summary.latest;
  return (
    <div className="rounded-2xl border border-casper-border bg-casper-surface p-3">
      <p className="mb-2 text-xs font-semibold">Where the attention is coming from</p>
      {total > 0 ? (
        <>
          <div className="flex h-2 overflow-hidden rounded-full bg-casper-cloud">
            <div
              className="h-full bg-casper-violet"
              style={{ width: `${(postsLikes / total) * 100}%` }}
            />
            <div
              className="h-full bg-casper-coral"
              style={{ width: `${(repliesLikes / total) * 100}%` }}
            />
          </div>
          <div className="mt-2 flex justify-between text-xs text-casper-ink/60">
            <span>
              <span className="inline-block h-2 w-2 rounded-full bg-casper-violet" /> Posts ·{' '}
              {fmtNum(postsLikes)} likes
            </span>
            <span>
              Replies · {fmtNum(repliesLikes)} likes{' '}
              <span className="inline-block h-2 w-2 rounded-full bg-casper-coral" />
            </span>
          </div>
        </>
      ) : (
        <p className="text-xs text-casper-ink/40">Nothing measured yet.</p>
      )}
      {latest?.followedBack !== null && latest?.followedBackSample ? (
        <p className="mt-2 border-t border-casper-border pt-2 text-xs text-casper-ink/70">
          <span className="font-semibold text-casper-violet">{fmtNum(latest.followedBack)}</span> of
          your last {fmtNum(latest.followedBackSample)} followers are accounts Ghostly followed
          first — a real follower count, unlike the split above.
        </p>
      ) : null}
    </div>
  );
};

const StaleBadge = () => (
  <span className="rounded-full bg-casper-attention/15 px-1.5 py-0.5 text-[10px] font-medium text-casper-attention">
    quiet
  </span>
);

const TargetsTable = ({
  targets,
  onDrop,
}: {
  targets: TargetPerformance[];
  onDrop: (handle: string) => void;
}) => {
  if (targets.length === 0) {
    return (
      <p className="py-2 text-center text-xs text-casper-ink/40">
        No replies to a target creator's post yet.
      </p>
    );
  }
  return (
    <div className="space-y-1.5">
      {targets.map((t) => (
        <div
          key={t.handle}
          className="flex items-center gap-2 rounded-lg bg-casper-cloud px-2 py-1.5 text-xs"
        >
          <span className="flex-1 truncate">
            @{t.handle} {t.stale && <StaleBadge />}
          </span>
          <span className="tabular-nums text-casper-ink/50">{t.repliesSent} replies</span>
          <span className="tabular-nums text-casper-ink/50">♥{fmtNum(t.engagement.likes)}</span>
          {t.stale && (
            <button
              type="button"
              onClick={() => onDrop(t.handle)}
              className="rounded px-2 py-0.5 text-rose-400 hover:bg-rose-500/10"
            >
              Drop
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

const TopicsTable = ({ topics }: { topics: TopicPerformance[] }) => {
  if (topics.length === 0) {
    return (
      <p className="py-2 text-center text-xs text-casper-ink/40">
        No keyword-matched replies yet.
      </p>
    );
  }
  return (
    <div className="space-y-1.5">
      {topics.map((t) => (
        <div
          key={t.keyword}
          className="flex items-center gap-2 rounded-lg bg-casper-cloud px-2 py-1.5 text-xs"
        >
          <span className="flex-1 truncate">
            "{t.keyword}" {t.stale && <StaleBadge />}
          </span>
          <span className="tabular-nums text-casper-ink/50">{t.repliesSent} replies</span>
        </div>
      ))}
    </div>
  );
};

/** A compact 7×24 heatmap. Cell intensity is relative to the grid's own max
 *  score, so it always reads clearly regardless of the account's scale. */
const Heatmap = ({ cells, personalised }: { cells: HeatmapCell[]; personalised: boolean }) => {
  const max = Math.max(1, ...cells.map((c) => c.score));
  const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  return (
    <div>
      <div className="grid grid-cols-[16px_repeat(24,1fr)] gap-[2px]">
        {Array.from({ length: 7 }).map((_, wd) => (
          <>
            <div key={`d${wd}`} className="flex items-center text-[9px] text-casper-ink/40">
              {days[wd]}
            </div>
            {Array.from({ length: 24 }).map((_, h) => {
              const cell = cells.find((c) => c.weekday === wd && c.hour === h);
              const intensity = cell && cell.active ? cell.score / max : 0;
              return (
                <div
                  key={`${wd}-${h}`}
                  title={cell ? `${days[wd]} ${h}:00 · score ${cell.score.toFixed(1)}` : undefined}
                  className="aspect-square rounded-[2px]"
                  style={{
                    background: cell?.active
                      ? `rgba(244, 77, 96, ${0.08 + intensity * 0.8})`
                      : 'rgba(255,255,255,0.03)',
                  }}
                />
              );
            })}
          </>
        ))}
      </div>
      <p className="mt-1.5 text-xs text-casper-ink/40">
        {personalised
          ? 'Darker = better performing hour, from your own history.'
          : 'Not personalised yet — needs 14 days and 8 posts of your own history. Shown as flat for now.'}
      </p>
    </div>
  );
};

export const Growth = ({ onNavigate }: { onNavigate?: (t: PanelTarget) => void }) => {
  const [summary, setSummary] = useState<GrowthSummary | null>(null);
  const [milestones, setMilestones] = useState<GrowthMilestone[]>([]);
  const [heatmap, setHeatmap] = useState<{ cells: HeatmapCell[]; personalised: boolean } | null>(
    null,
  );
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [growthResp, timesResp, ms] = await Promise.all([
        sendToBackground<
          { ok: true; data: GrowthSummary } | { ok: false; error: { message: string } | string }
        >({ type: 'GET_GROWTH', payload: { days: 30 } }),
        sendToBackground<
          | { ok: true; data: { heatmap: HeatmapCell[]; personalised: boolean } }
          | { ok: false; error: unknown }
        >({ type: 'GET_BEST_TIMES', payload: { count: 4 } }),
        getGrowthMilestones(),
      ]);
      if (growthResp.ok) {
        setSummary(growthResp.data);
        setError(null);
      } else {
        setError(typeof growthResp.error === 'string' ? growthResp.error : growthResp.error.message);
      }
      if (timesResp.ok) {
        setHeatmap({ cells: timesResp.data.heatmap, personalised: timesResp.data.personalised });
      }
      setMilestones(ms);
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

  const dropTarget = async (handle: string) => {
    const settings = await getSettings();
    await setSettings({
      ...settings,
      targetCreators: settings.targetCreators.filter(
        (t) => t.handle.toLowerCase() !== handle.toLowerCase(),
      ),
    });
    if (summary) {
      setSummary({ ...summary, targets: summary.targets.filter((t) => t.handle !== handle) });
    }
  };

  const writeLike = async (text: string) => {
    await setPanelIntent({ type: 'write-like', seedText: text });
    onNavigate?.('posts');
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
          {/* Headline: followers + trend + change markers */}
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
              <Sparkline
                points={series.map((p) => p.followers)}
                dates={series.map((p) => p.date)}
                milestones={milestones}
              />
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

          {summary && <SourcesCard summary={summary} />}

          {/* Which targets are working */}
          <div className="rounded-2xl border border-casper-border bg-casper-surface p-3">
            <p className="mb-2 text-xs font-semibold">Which targets are working</p>
            {summary && <TargetsTable targets={summary.targets} onDrop={dropTarget} />}
          </div>

          {/* Which topics are working */}
          <div className="rounded-2xl border border-casper-border bg-casper-surface p-3">
            <p className="mb-2 text-xs font-semibold">Which topics are working</p>
            {summary && <TopicsTable topics={summary.topics} />}
          </div>

          {/* Best times */}
          {heatmap && (
            <div className="rounded-2xl border border-casper-border bg-casper-surface p-3">
              <p className="mb-2 text-xs font-semibold">Best times to post</p>
              <Heatmap cells={heatmap.cells} personalised={heatmap.personalised} />
            </div>
          )}

          {/* Reply performance / best posts */}
          <div className="rounded-2xl border border-casper-border bg-casper-surface p-3">
            <div className="mb-2 flex items-baseline justify-between">
              <p className="text-xs font-semibold">Your best posts</p>
              <p className="text-xs text-casper-ink/40">
                {replies?.tracked ?? 0} measured · {fmtNum(replies?.totalLikes ?? 0)} likes · avg{' '}
                {replies?.avgLikes ?? 0}
              </p>
            </div>
            {replies && replies.top.length > 0 ? (
              <div className="space-y-2">
                {replies.top.map((post) => (
                  <TopReply key={post.tweetId} post={post} onWriteLike={writeLike} />
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
