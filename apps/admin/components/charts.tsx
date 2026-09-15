"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { TimeseriesDay } from "@/lib/api";

/** Series colours — the admin's original chart palette, identical in light
 *  and dark mode. Everything around the series uses the shadcn theme tokens. */
export const CHART_COLORS = {
  like: "#bbdef2",
  comment: "#d1aad7",
  follow: "#72ce7b",
  brand: "#f44d60",
} as const;

const PIE_COLORS = [CHART_COLORS.like, CHART_COLORS.comment, CHART_COLORS.follow];

const AXIS = { tickLine: false, axisLine: false, tickMargin: 8 } as const;

const shortDate = (value: unknown) => {
  const d = new Date(String(value));
  return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
};

function TooltipRow({ color, label, value }: { color: string; label: ReactNode; value: string }) {
  return (
    <div className="flex w-full items-center gap-2">
      <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-auto pl-3 font-mono font-medium text-foreground tabular-nums">{value}</span>
    </div>
  );
}

/** Coloured-dot legend for a chart card header. */
export function SeriesLegend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: item.color }} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

const actionsConfig = {
  like: { label: "Likes", color: CHART_COLORS.like },
  comment: { label: "Comments", color: CHART_COLORS.comment },
  follow: { label: "Follows", color: CHART_COLORS.follow },
} satisfies ChartConfig;

const ACTION_KEYS = Object.keys(actionsConfig);

/** Stacked area of daily actions (likes/comments/follows). */
export function ActionsAreaChart({ data }: { data: TimeseriesDay[] }) {
  return (
    <ChartContainer config={actionsConfig} className="aspect-auto h-[240px] w-full">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <defs>
          {ACTION_KEYS.map((key) => (
            <linearGradient key={key} id={`fill-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={`var(--color-${key})`} stopOpacity={0.5} />
              <stop offset="100%" stopColor={`var(--color-${key})`} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...AXIS} />
        <YAxis width={36} allowDecimals={false} {...AXIS} />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent labelFormatter={shortDate} indicator="dot" />}
        />
        {ACTION_KEYS.map((key) => (
          <Area
            key={key}
            type="monotone"
            dataKey={key}
            stackId="1"
            stroke={`var(--color-${key})`}
            fill={`url(#fill-${key})`}
          />
        ))}
      </AreaChart>
    </ChartContainer>
  );
}

const signupsConfig = {
  signups: { label: "Signups", color: CHART_COLORS.brand },
} satisfies ChartConfig;

/** Daily new-signups bars. */
export function SignupsBarChart({ data }: { data: TimeseriesDay[] }) {
  return (
    <ChartContainer config={signupsConfig} className="aspect-auto h-[200px] w-full">
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...AXIS} />
        <YAxis width={36} allowDecimals={false} {...AXIS} />
        <ChartTooltip content={<ChartTooltipContent labelFormatter={shortDate} indicator="dot" />} />
        <Bar dataKey="signups" fill="var(--color-signups)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

const revenueConfig = {
  amount: { label: "Revenue", color: CHART_COLORS.brand },
} satisfies ChartConfig;

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
    <ChartContainer config={revenueConfig} className="aspect-auto h-[260px] w-full">
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
        <defs>
          <linearGradient id="fill-amount" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-amount)" stopOpacity={0.55} />
            <stop offset="100%" stopColor="var(--color-amount)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...AXIS} />
        <YAxis width={52} tickFormatter={(v) => fmt(Number(v))} {...AXIS} />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              labelFormatter={shortDate}
              formatter={(value) => (
                <TooltipRow color={CHART_COLORS.brand} label="Revenue" value={fmt(Number(value))} />
              )}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="amount"
          stroke="var(--color-amount)"
          strokeWidth={2}
          fill="url(#fill-amount)"
        />
      </AreaChart>
    </ChartContainer>
  );
}

/** Action mix donut (like/comment/follow totals) with count + percentage. */
export function ActionMixDonut({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
  const slices = data.map((d, i) => ({ ...d, fill: PIE_COLORS[i % PIE_COLORS.length] }));
  const colorOf = (name: unknown) =>
    slices.find((s) => s.name === name)?.fill ?? PIE_COLORS[0];

  return (
    <div>
      <div className="relative">
        <ChartContainer
          config={{ value: { label: "Actions" } }}
          className="aspect-auto h-[200px] w-full"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => (
                    <TooltipRow
                      color={colorOf(name)}
                      label={String(name)}
                      value={`${Number(value).toLocaleString()} · ${pct(Number(value))}%`}
                    />
                  )}
                />
              }
            />
            <Pie
              data={slices}
              dataKey="value"
              nameKey="name"
              innerRadius={58}
              outerRadius={84}
              paddingAngle={2}
              stroke="none"
            />
          </PieChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-semibold tracking-tight tabular-nums">
            {total.toLocaleString()}
          </span>
          <span className="text-xs text-muted-foreground">total</span>
        </div>
      </div>

      <div className="mt-3 space-y-1.5">
        {slices.map((d) => (
          <div key={d.name} className="flex items-center gap-2 text-sm">
            <span className="size-2.5 shrink-0 rounded-[2px]" style={{ background: d.fill }} />
            <span className="text-muted-foreground">{d.name}</span>
            <span className="ml-auto font-medium tabular-nums">{d.value.toLocaleString()}</span>
            <span className="w-10 text-right text-muted-foreground tabular-nums">{pct(d.value)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}
