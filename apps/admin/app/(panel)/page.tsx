"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  api,
  type Stats,
  type TimeseriesDay,
  type RevenueOverview,
  type UserRow,
  type UsersResponse,
} from "@/lib/api";
import { Panel, Eyebrow, Spinner, Badge, EmptyState, formatMoney } from "@/components/ui";
import { PageHeader } from "@/components/Shell";
import { IconBadge, Icons } from "@/components/icons";
import { ActionsAreaChart, SignupsBarChart, ActionMixDonut } from "@/components/charts";

type Tone = "blue" | "violet" | "gold" | "green" | "red";

function StatCard({
  label,
  value,
  icon,
  tone = "blue",
  delta,
  deltaLabel,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: Tone;
  delta?: number;
  deltaLabel?: string;
  hint?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Eyebrow>{label}</Eyebrow>
          <p
            className={`mt-2 text-[28px] font-light leading-none tracking-tight ${
              accent ? "text-casper-red" : ""
            }`}
          >
            {typeof value === "number" ? value.toLocaleString() : value}
          </p>
        </div>
        <IconBadge tone={tone}>{icon}</IconBadge>
      </div>
      <div className="mt-3 text-[11px] text-iron-slate">
        {delta !== undefined ? (
          <>
            <span
              className={`font-semibold ${delta > 0 ? "text-emerald-green" : "text-iron-slate"}`}
            >
              {delta > 0 ? "+" : ""}
              {delta.toLocaleString()}
            </span>{" "}
            {deltaLabel}
          </>
        ) : (
          hint
        )}
      </div>
    </Panel>
  );
}

export default function OverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [series, setSeries] = useState<TimeseriesDay[] | null>(null);
  const [revenue, setRevenue] = useState<RevenueOverview | null>(null);
  const [recent, setRecent] = useState<UserRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const [s, t, r, u] = await Promise.all([
        api<Stats>("/api/admin/stats"),
        api<{ days: TimeseriesDay[] }>("/api/admin/stats/timeseries?days=14"),
        api<RevenueOverview>("/api/admin/revenue?days=30"),
        api<UsersResponse>("/api/admin/users?page=1&limit=6"),
      ]);
      if (s.ok) setStats(s.data);
      else setError(s.error.message);
      if (t.ok) setSeries(t.data.days);
      if (r.ok) setRevenue(r.data);
      if (u.ok) setRecent(u.data.users);
    })();
  }, []);

  if (error) {
    return (
      <>
        <PageHeader title="Overview" />
        <Panel className="p-6 text-sm text-vivid-crimson">{error}</Panel>
      </>
    );
  }
  if (!stats || !series) {
    return (
      <>
        <PageHeader title="Overview" />
        <Spinner />
      </>
    );
  }

  const mix = [
    { name: "Likes", value: stats.actions.byType.like },
    { name: "Comments", value: stats.actions.byType.comment },
    { name: "Follows", value: stats.actions.byType.follow },
  ];

  const cur = revenue?.currency ?? "usd";

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle="Live snapshot of revenue, users, and activity"
      />

      {/* Headline metrics */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total users"
          value={stats.users.total}
          icon={Icons.users}
          tone="blue"
          delta={stats.users.newLast30d}
          deltaLabel="this month"
        />
        <StatCard
          label="Pro subscribers"
          value={revenue?.configured ? revenue.subscriptions.active : stats.users.pro}
          icon={Icons.crown}
          tone="gold"
          hint={
            revenue?.configured
              ? `${revenue.subscriptions.active} active subscription${revenue.subscriptions.active === 1 ? "" : "s"}`
              : `${stats.users.pro} on Pro plan`
          }
        />
        <StatCard
          label="Total revenue"
          value={revenue?.configured ? formatMoney(revenue.revenue.lifetime, cur) : "—"}
          icon={Icons.dollar}
          tone="green"
          hint={
            revenue?.configured
              ? `${formatMoney(revenue.revenue.last30d, cur)} this month`
              : "Stripe not configured"
          }
        />
        <StatCard
          label="New users today"
          value={stats.users.newToday}
          icon={Icons.userPlus}
          tone="red"
          delta={stats.users.newLast7d}
          deltaLabel="this week"
        />
      </div>

      {/* Recent signups */}
      <Panel className="mt-4">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div className="flex items-center gap-2.5">
            <IconBadge tone="red">{Icons.userPlus}</IconBadge>
            <h3 className="text-sm font-semibold">Recent signups</h3>
          </div>
          <Link
            href="/users"
            className="text-[12px] font-medium text-casper-red transition hover:opacity-80"
          >
            View all →
          </Link>
        </div>
        {recent === null ? (
          <Spinner />
        ) : recent.length === 0 ? (
          <EmptyState>No users yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.14em] text-iron-slate">
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Plan</th>
                <th className="px-5 py-3 font-medium">Actions</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Joined</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((u) => (
                <SignupRow key={u.id} u={u} />
              ))}
            </tbody>
          </table>
        )}
      </Panel>

      {/* Activity charts */}
      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Actions over time</h3>
              <p className="text-[11px] text-iron-slate">Last 14 days</p>
            </div>
            <div className="flex gap-3 text-[10px] text-iron-slate">
              <Legend color="#bbdef2" label="Likes" />
              <Legend color="#d1aad7" label="Comments" />
              <Legend color="#72ce7b" label="Follows" />
            </div>
          </div>
          <ActionsAreaChart data={series} />
        </Panel>

        <Panel className="p-5">
          <h3 className="text-sm font-semibold">Action mix</h3>
          <p className="text-[11px] text-iron-slate">All-time breakdown</p>
          <div className="mt-2">
            <ActionMixDonut data={mix} />
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-2">
          <h3 className="text-sm font-semibold">Signups over time</h3>
          <p className="text-[11px] text-iron-slate">User registration trend · last 14 days</p>
          <div className="mt-2">
            <SignupsBarChart data={series} />
          </div>
        </Panel>
        <Panel className="p-5">
          <h3 className="text-sm font-semibold">AI comment drafts</h3>
          <p className="mb-3 text-[11px] text-iron-slate">Generation pipeline</p>
          <div className="space-y-3">
            <Row label="Total generated" value={stats.drafts.total} />
            <Row label="Pending" value={stats.drafts.pending} tone="warn" />
            <Row label="Posted" value={stats.drafts.posted} tone="pro" />
          </div>
        </Panel>
      </div>
    </>
  );
}

const STATUS_TONE: Record<string, { tone: string; label: string }> = {
  active: { tone: "success", label: "Active" },
  trialing: { tone: "info", label: "Trial" },
  past_due: { tone: "fail", label: "Past due" },
  canceled: { tone: "default", label: "Canceled" },
  free: { tone: "success", label: "Active" },
};

function SignupRow({ u }: { u: UserRow }) {
  const initial = (u.name || u.email || "?").trim().charAt(0).toUpperCase();
  const status = STATUS_TONE[u.subscriptionStatus] ?? STATUS_TONE.free;
  return (
    <tr className="border-b border-line/60 transition hover:bg-white/[0.02]">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-iridescent-glow/12 text-xs font-semibold text-iridescent-glow">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium">{u.name || "—"}</p>
            <p className="truncate text-[11px] text-iron-slate">{u.email}</p>
          </div>
        </div>
      </td>
      <td className="px-5 py-3.5">
        {u.isPro ? <Badge tone="pro">Pro</Badge> : <Badge>Free</Badge>}
      </td>
      <td className="px-5 py-3.5 tabular-nums text-subtle-gray">
        {u.lifetimeActionCount.toLocaleString()}
      </td>
      <td className="px-5 py-3.5">
        <Badge tone={status.tone}>{status.label}</Badge>
      </td>
      <td className="px-5 py-3.5 text-right text-iron-slate">
        {new Date(u.createdAt).toLocaleDateString()}
      </td>
    </tr>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}

function Row({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-iron-slate">{label}</span>
      <span className="text-sm font-medium">
        {tone ? <Badge tone={tone}>{value.toLocaleString()}</Badge> : value.toLocaleString()}
      </span>
    </div>
  );
}
