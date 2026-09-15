"use client";

import { useEffect, useState } from "react";
import { api, type RevenueOverview } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
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
  timeAgo,
} from "@/components/admin-ui";
import { PageHeader } from "@/components/Shell";
import { RevenueAreaChart } from "@/components/charts";

export default function RevenuePage() {
  const [data, setData] = useState<RevenueOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await api<RevenueOverview>("/api/admin/revenue?days=30");
      if (res.ok) setData(res.data);
      else setError(res.error.message);
    })();
  }, []);

  if (error) {
    return (
      <>
        <PageHeader title="Revenue" subtitle="Real-time Stripe data" />
        <ErrorCard>{error}</ErrorCard>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <PageHeader title="Revenue" subtitle="Real-time Stripe data" />
        <Spinner />
      </>
    );
  }

  if (!data.configured) {
    return (
      <>
        <PageHeader title="Revenue" subtitle="Real-time Stripe data" />
        <SectionCard>
          <EmptyState>
            Stripe isn’t configured on the server. Set{" "}
            <code className="rounded bg-muted px-1 font-mono text-foreground">STRIPE_SECRET_KEY</code>{" "}
            to see live revenue here.
          </EmptyState>
        </SectionCard>
      </>
    );
  }

  const c = data.currency;
  const subs = data.subscriptions;

  return (
    <>
      <PageHeader
        title="Revenue"
        subtitle="Live Stripe data · refreshes every minute"
      />

      <StatGrid>
        <StatCard
          label="MRR"
          value={formatMoney(data.mrr, c)}
          hint={`${formatMoney(data.arpu, c)} ARPU`}
        />
        <StatCard
          label="Active subscriptions"
          value={subs.active.toLocaleString()}
          hint={
            <span className="flex flex-wrap items-center gap-1.5">
              {subs.trialing > 0 && <StatusBadge tone="info">{subs.trialing} trialing</StatusBadge>}
              {subs.pastDue > 0 && <StatusBadge tone="fail">{subs.pastDue} past due</StatusBadge>}
              {subs.trialing === 0 && subs.pastDue === 0 && <span>all in good standing</span>}
            </span>
          }
        />
        <StatCard
          label="Revenue · 30d"
          value={formatMoney(data.revenue.last30d, c)}
          hint={`${formatMoney(data.revenue.last7d, c)} in last 7d`}
        />
        <StatCard
          label="Lifetime gross"
          value={formatMoney(data.revenue.lifetime, c)}
          hint={`${formatMoney(data.revenue.today, c)} today`}
        />
      </StatGrid>

      <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-3">
        <SectionCard
          className="@4xl/main:col-span-2"
          title="Gross revenue"
          description="Last 30 days"
          action={<Badge variant="outline">{c.toUpperCase()}</Badge>}
        >
          <RevenueAreaChart data={data.timeseries} currency={c} />
        </SectionCard>

        <SectionCard title="Subscription mix" description="Current Stripe subscriptions">
          <div className="space-y-3">
            <MetricRow label="Active" value={subs.active} tone="pro" />
            <MetricRow label="Trialing" value={subs.trialing} tone="info" />
            <MetricRow label="Past due" value={subs.pastDue} tone="fail" />
            <div className="border-t pt-3">
              <MetricRow label="Total" value={subs.total} />
            </div>
          </div>
        </SectionCard>
      </div>

      <SectionCard flush title="Recent payments" description="Latest Stripe charges">
        {data.recentPayments.length === 0 ? (
          <EmptyState>No payments yet.</EmptyState>
        ) : (
          <Table className={FLUSH_TABLE}>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.recentPayments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.email ?? "—"}</TableCell>
                  <TableCell className="font-medium tabular-nums">
                    {formatMoney(p.amount, p.currency)}
                  </TableCell>
                  <TableCell>
                    {p.refunded ? (
                      <StatusBadge tone="warn">refunded</StatusBadge>
                    ) : (
                      <StatusBadge tone="success">{p.status}</StatusBadge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{timeAgo(p.created)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </SectionCard>
    </>
  );
}
