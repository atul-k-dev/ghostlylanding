import { useRef, useState } from 'react';
import type { GrowthMilestone, GrowthPoint } from '@casper/shared';
import { HugeiconsIcon } from '@hugeicons/react';
import { Analytics01Icon, RefreshIcon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import { fmtNum } from '../pages/_shared.js';
import type { Growth } from './useGrowth';
import { Muted, Segmented, Widget } from './Widget';

/**
 * Followers — the number, how it moved over the chosen range, and a smooth
 * area chart you can scrub. Change markers (a preset switch, a target added)
 * sit on the line where they happened.
 */
type Range = '7d' | '30d';
const RANGES = [
  { id: '7d', label: '7D' },
  { id: '30d', label: '30D' },
] as const;

const W = 320;
const H = 120;
const PAD_Y = 12;

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? 'Today'
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

/** Horizontal-tangent cubic curve through the points — smooth, never overshoots vertically. */
const smooth = (pts: [number, number][]) =>
  pts.reduce((d, [x, y], i, a) => {
    if (i === 0) return `M ${x},${y}`;
    const [px, py] = a[i - 1]!;
    const cx = (px + x) / 2;
    return `${d} C ${cx},${py} ${cx},${y} ${x},${y}`;
  }, '');

const Chart = ({ points, milestones }: { points: GrowthPoint[]; milestones: GrowthMilestone[] }) => {
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const values = points.map((p) => p.followers);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const x = (i: number) => (points.length === 1 ? W / 2 : (i / (points.length - 1)) * W);
  const y = (v: number) => (max === min ? H / 2 : H - PAD_Y - ((v - min) / (max - min)) * (H - PAD_Y * 2));
  const xy = points.map((p, i) => [x(i), y(p.followers)] as [number, number]);
  const line = smooth(xy);
  const last = points.length - 1;
  const focus = hover ?? last;
  const f = points[focus]!;

  // Markers land on the nearest reading, and only inside the visible range.
  const marks = milestones
    .map((m) => {
      const at = Date.parse(m.at);
      let best = -1;
      let dist = Infinity;
      points.forEach((p, i) => {
        const d = Math.abs(Date.parse(p.date) - at);
        if (d < dist) {
          dist = d;
          best = i;
        }
      });
      return best >= 0 && dist < 3 * 86_400_000 ? { ...m, i: best } : null;
    })
    .filter((m): m is GrowthMilestone & { i: number } => m !== null);

  const onMove = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || points.length < 2) return;
    setHover(Math.round(Math.min(1, Math.max(0, (clientX - r.left) / r.width)) * last));
  };

  const pct = (i: number) => `${(x(i) / W) * 100}%`;
  const top = (v: number) => `${(y(v) / H) * 100}%`;

  return (
    <div>
      <div
        ref={box}
        className="relative h-[120px] w-full touch-none"
        onPointerMove={(e) => onMove(e.clientX)}
        onPointerDown={(e) => onMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
          <defs>
            <linearGradient id="ghostly-followers" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" className="[stop-color:var(--primary)]" stopOpacity="0.28" />
              <stop offset="100%" className="[stop-color:var(--primary)]" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((g) => (
            <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} className="stroke-foreground/6" strokeDasharray="3 4" vectorEffect="non-scaling-stroke" />
          ))}
          {points.length > 1 && (
            <>
              <path d={`${line} L ${W},${H} L 0,${H} Z`} fill="url(#ghostly-followers)" />
              <path d={line} fill="none" className="stroke-primary" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            </>
          )}
          {hover !== null && (
            <line x1={x(focus)} x2={x(focus)} y1="0" y2={H} className="stroke-foreground/20" vectorEffect="non-scaling-stroke" />
          )}
        </svg>

        {/* Dots and markers are HTML so they stay round on a stretched chart. */}
        {marks.map((m) => (
          <span
            key={`${m.at}-${m.detail}`}
            title={m.detail}
            className="absolute bottom-0 size-2 -translate-x-1/2 rounded-full bg-casper-attention ring-2 ring-card"
            style={{ left: pct(m.i) }}
          />
        ))}
        <span
          className="pointer-events-none absolute size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-4 ring-primary/20 transition-all duration-150"
          style={{ left: pct(focus), top: top(f.followers) }}
        />
        {hover !== null && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full rounded-xl bg-foreground px-2.5 py-1.5 text-center text-background shadow-lg"
            style={{ left: `clamp(40px, ${pct(focus)}, calc(100% - 40px))` }}
          >
            <p className="font-display text-sm font-bold tabular-nums">{fmtNum(f.followers)}</p>
            <p className="text-[10px] opacity-70">{shortDate(f.date)}</p>
          </div>
        )}
      </div>
      <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
        <span>{shortDate(points[0]!.date)}</span>
        <span>{shortDate(points[last]!.date)}</span>
      </div>
    </div>
  );
};

const Stat = ({ value, label }: { value: string; label: string }) => (
  <div className="rounded-2xl bg-muted/60 px-3 py-2.5">
    <p className="font-display text-[17px] font-bold tabular-nums">{value}</p>
    <p className="text-[11px] text-muted-foreground">{label}</p>
  </div>
);

export const FollowersCard = ({ growth }: { growth: Growth }) => {
  const [range, setRange] = useState<Range>('7d');
  const { summary, milestones } = growth;
  const latest = summary?.latest ?? null;

  const refreshButton = (
    <button
      type="button"
      onClick={() => void growth.refresh()}
      disabled={growth.refreshing}
      aria-label="Read my profile now"
      title="Read my profile now"
      className="grid size-8 shrink-0 cursor-pointer place-items-center rounded-full bg-muted text-muted-foreground transition hover:text-foreground disabled:opacity-60"
    >
      <HugeiconsIcon icon={RefreshIcon} strokeWidth={2} className={cn('size-4', growth.refreshing && 'animate-spin')} />
    </button>
  );

  if (!latest) {
    return (
      <Widget title="Followers" action={refreshButton}>
        {growth.loading ? (
          <Muted>Catching up…</Muted>
        ) : (
          <div className="flex flex-col items-center gap-3 py-2 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-primary/12 text-primary">
              <HugeiconsIcon icon={Analytics01Icon} strokeWidth={2} className="size-7" />
            </span>
            <div>
              <p className="font-display text-lg font-bold">No readings yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                I check your profile once a day. Take the first reading now and the line starts tomorrow.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void growth.refresh()}
              disabled={growth.refreshing}
              className="h-11 cursor-pointer rounded-full bg-primary px-5 font-display text-sm font-bold text-primary-foreground transition hover:bg-primary/85 disabled:opacity-60"
            >
              {growth.refreshing ? 'Reading your profile…' : 'Take the first reading'}
            </button>
            {growth.error && <p className="text-xs text-destructive">{growth.error}</p>}
          </div>
        )}
      </Widget>
    );
  }

  const series = summary?.series ?? [];
  const cutoff = Date.now() - (range === '7d' ? 7 : 30) * 86_400_000;
  const inRange = series.filter((p) => Date.parse(p.date) >= cutoff - 86_400_000);
  const points = inRange.length >= 2 ? inRange : series;
  const change = points.length >= 2 ? points[points.length - 1]!.followers - points[0]!.followers : null;
  const up = (change ?? 0) > 0;
  const down = (change ?? 0) < 0;

  const followBacks =
    latest.followedBack !== null && latest.followedBackSample
      ? `${fmtNum(latest.followedBack)}/${fmtNum(latest.followedBackSample)}`
      : '—';

  return (
    <Widget
      title="Followers"
      subtitle={`Updated ${shortDate(latest.date)}`}
      action={
        <div className="flex items-center gap-2">
          <Segmented value={range} options={RANGES} onChange={setRange} />
          {refreshButton}
        </div>
      }
    >
      <div className="flex items-end gap-3">
        <p className="font-display text-[36px] leading-none font-extrabold tracking-tight tabular-nums">
          {fmtNum(latest.followers)}
        </p>
        {change !== null && (
          <span
            className={cn(
              'mb-1 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums',
              up ? 'bg-casper-working/15 text-casper-working' : down ? 'bg-destructive/12 text-destructive' : 'bg-muted text-muted-foreground',
            )}
          >
            {up ? '+' : ''}
            {fmtNum(change)} · {range === '7d' ? '7 days' : '30 days'}
          </span>
        )}
      </div>

      {points.length >= 2 ? (
        <Chart points={points} milestones={milestones} />
      ) : (
        <Muted>One reading so far — the line starts with the next one.</Muted>
      )}

      <div className="grid grid-cols-3 gap-2">
        <Stat value={fmtNum(latest.following)} label="following" />
        <Stat value={latest.posts !== null ? fmtNum(latest.posts) : '—'} label="posts" />
        <Stat value={followBacks} label="from my follows" />
      </div>
    </Widget>
  );
};
