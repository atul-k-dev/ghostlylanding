"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TimeseriesDay } from "@/lib/api";

const AXIS = { stroke: "#56565f", fontSize: 10, tickLine: false, axisLine: false } as const;

const tooltipStyle = {
  background: "#232329",
  border: "1px solid #33333d",
  borderRadius: 6,
  fontSize: 12,
  color: "#fff",
} as const;

// recharts colors tooltip rows by series by default (often too dark on our
// graphite surface). Force readable light text for the label and each item.
const labelStyle = { color: "#a6a6b0", marginBottom: 2 } as const;
const itemStyle = { color: "#ffffff" } as const;

const shortDate = (iso: string) => {
  const d = new Date(iso);
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

/** Stacked area of daily actions (likes/comments/follows). */
export function ActionsAreaChart({ data }: { data: TimeseriesDay[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="gLike" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#bbdef2" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#bbdef2" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gComment" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d1aad7" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#d1aad7" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="gFollow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#72ce7b" stopOpacity={0.5} />
            <stop offset="100%" stopColor="#72ce7b" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={24} />
        <YAxis {...AXIS} width={36} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={labelStyle}
          itemStyle={itemStyle}
          labelFormatter={shortDate}
        />
        <Area type="monotone" dataKey="like" stackId="1" stroke="#bbdef2" fill="url(#gLike)" />
        <Area type="monotone" dataKey="comment" stackId="1" stroke="#d1aad7" fill="url(#gComment)" />
        <Area type="monotone" dataKey="follow" stackId="1" stroke="#72ce7b" fill="url(#gFollow)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Daily new-signups bars. */
export function SignupsBarChart({ data }: { data: TimeseriesDay[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={24} />
        <YAxis {...AXIS} width={36} allowDecimals={false} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={labelStyle}
          itemStyle={itemStyle}
          labelFormatter={shortDate}
          cursor={{ fill: "rgba(255,255,255,0.04)" }}
        />
        <Bar dataKey="signups" fill="#f44d60" radius={[2, 2, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Daily gross-revenue area (single series, brand red). */
export function RevenueAreaChart({
  data,
  currency = "usd",
}: {
  data: { date: string; amount: number }[];
  currency?: string;
}) {
  const fmt = (v: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 0,
    }).format(v);
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="gRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f44d60" stopOpacity={0.55} />
            <stop offset="100%" stopColor="#f44d60" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" tickFormatter={shortDate} {...AXIS} minTickGap={24} />
        <YAxis {...AXIS} width={52} tickFormatter={fmt} />
        <Tooltip
          contentStyle={tooltipStyle}
          labelStyle={labelStyle}
          itemStyle={itemStyle}
          labelFormatter={shortDate}
          formatter={(v: number) => [fmt(v), "Revenue"]}
        />
        <Area type="monotone" dataKey="amount" stroke="#f44d60" strokeWidth={2} fill="url(#gRevenue)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ["#bbdef2", "#d1aad7", "#72ce7b"];

/** Action mix donut (like/comment/follow totals) with count + percentage. */
export function ActionMixDonut({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  return (
    <div>
      <div className="relative">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={84}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={tooltipStyle}
              labelStyle={labelStyle}
              itemStyle={itemStyle}
              formatter={(v: number, name: string) => [
                `${v.toLocaleString()} · ${pct(v)}%`,
                name,
              ]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight">{total.toLocaleString()}</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-iron-slate">total</span>
        </div>
      </div>

      {/* Legend with count + percentage */}
      <div className="mt-3 space-y-1.5">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center gap-2 text-xs">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
            />
            <span className="text-iron-slate">{d.name}</span>
            <span className="ml-auto tabular-nums font-medium text-subtle-gray">
              {d.value.toLocaleString()}
            </span>
            <span className="w-10 text-right tabular-nums text-iron-slate">{pct(d.value)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
