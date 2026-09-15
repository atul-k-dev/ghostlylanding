"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CrownIcon, DollarSignIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import {
  api,
  type Stats,
  type TimeseriesDay,
  type RevenueOverview,
  type UserRow,
  type UsersResponse,
} from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Delta,
  EmptyState,
  ErrorCard,
  FLUSH_TABLE,
  MetricRow,
  SectionCard,
  Spinner,
  StatCard,
  StatGrid,
  StatusBadge,
  formatMoney,
  type Tone,
} from "@/components/admin-ui";
import { PageHeader } from "@/components/Shell";
import {
  ActionMixDonut,
  ActionsAreaChart,
  CHART_COLORS,
  SeriesLegend,
} from "@/components/charts";
import { SignupsOverTime } from "@/components/signups-over-time";

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
        <PageHeader title="Dashboard" />
        <ErrorCard>{error}</ErrorCard>
      </>
    );
  }
  if (!stats || !series) {
    return (
      <>
        <PageHeader title="Dashboard" />
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
        title="Dashboard"
        subtitle="Live snapshot of revenue, users, and activity"
      />

      {/* Headline metrics */}
      <StatGrid>
        <StatCard
          label="Total users"
          value={stats.users.total}
          icon={<UsersIcon />}
          hint={<Delta value={stats.users.newLast30d} label="this month" />}
        />
        <StatCard
          label="Pro subscribers"
          value={revenue?.configured ? revenue.subscriptions.active : stats.users.pro}
          icon={<CrownIcon />}
          hint={
            revenue?.configured
              ? `${revenue.subscriptions.active} active subscription${revenue.subscriptions.active === 1 ? "" : "s"}`
              : `${stats.users.pro} on Pro plan`
          }
        />
        <StatCard
          label="Total revenue"
          value={revenue?.configured ? formatMoney(revenue.revenue.lifetime, cur) : "—"}
          icon={<DollarSignIcon />}
          hint={
            revenue?.configured
              ? `${formatMoney(revenue.revenue.last30d, cur)} this month`
              : "Stripe not configured"
          }
        />
        <StatCard
          label="New users today"
          value={stats.users.newToday}
          icon={<UserPlusIcon />}
          hint={<Delta value={stats.users.newLast7d} label="this week" />}
        />
      </StatGrid>

      {/* Recent signups */}
      <SectionCard
        flush
        title="Recent signups"
        description="Newest accounts"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/users">View all</Link>
          </Button>
        }
      >
        {recent === null ? (
          <Spinner />
        ) : recent.length === 0 ? (
          <EmptyState>No users yet.</EmptyState>
        ) : (
          <Table className={FLUSH_TABLE}>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.map((u) => (
                <SignupRow key={u.id} u={u} />
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>

      {/* Signups over time — range-switchable */}
      <SignupsOverTime />

      {/* Activity charts */}
      <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-3">
        <SectionCard
          className="@4xl/main:col-span-2"
          title="Actions over time"
          description="Last 14 days"
          action={
            <SeriesLegend
              items={[
                { label: "Likes", color: CHART_COLORS.like },
                { label: "Comments", color: CHART_COLORS.comment },
                { label: "Follows", color: CHART_COLORS.follow },
              ]}
            />
          }
        >
          <ActionsAreaChart data={series} />
        </SectionCard>

        <SectionCard title="Action mix" description="All-time breakdown">
          <ActionMixDonut data={mix} />
        </SectionCard>
      </div>

      <SectionCard title="AI comment drafts" description="Generation pipeline">
        <div className="grid grid-cols-1 gap-3 @xl/main:grid-cols-3 @xl/main:gap-8">
          <MetricRow label="Total generated" value={stats.drafts.total} />
          <MetricRow label="Pending" value={stats.drafts.pending} tone="warn" />
          <MetricRow label="Posted" value={stats.drafts.posted} tone="pro" />
        </div>
      </SectionCard>
    </>
  );
}

const STATUS_TONE: Record<string, { tone: Tone; label: string }> = {
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
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{u.name || "—"}</p>
            <p className="truncate text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        {u.isPro ? <StatusBadge tone="pro">Pro</StatusBadge> : <StatusBadge>Free</StatusBadge>}
      </TableCell>
      <TableCell className="tabular-nums">{u.lifetimeActionCount.toLocaleString()}</TableCell>
      <TableCell>
        <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
      </TableCell>
      <TableCell className="text-right text-muted-foreground">
        {new Date(u.createdAt).toLocaleDateString()}
      </TableCell>
    </TableRow>
  );
}
