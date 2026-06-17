"use client";

import { useEffect, useState } from "react";
import { api, type RevenueOverview } from "@/lib/api";
import { Panel, Eyebrow, Spinner, Badge, EmptyState, formatMoney, timeAgo } from "@/components/ui";
import { PageHeader } from "@/components/Shell";
import { RevenueAreaChart } from "@/components/charts";

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: React.ReactNode;
  accent?: boolean;
}) {
  return (
    <Panel className="p-4">
      <Eyebrow>{label}</Eyebrow>
      <p
        className={`mt-1 text-3xl font-light tracking-tight ${
          accent ? "text-casper-red" : ""
        }`}
      >
        {value}
      </p>
      {hint && <div className="mt-1 text-[11px] text-iron-slate">{hint}</div>}
    </Panel>
  );
}

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
        <Panel className="p-6 text-sm text-vivid-crimson">{error}</Panel>
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
        <Panel className="p-10">
          <EmptyState>
            Stripe isn’t configured on the server. Set <code className="text-subtle-gray">STRIPE_SECRET_KEY</code> to
            see live revenue here.
          </EmptyState>
        </Panel>
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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="MRR"
          value={formatMoney(data.mrr, c)}
          accent
          hint={`${formatMoney(data.arpu, c)} ARPU`}
        />
        <StatCard
          label="Active subscriptions"
          value={subs.active.toLocaleString()}
          hint={
            <span className="flex flex-wrap items-center gap-1.5">
              {subs.trialing > 0 && <Badge tone="info">{subs.trialing} trialing</Badge>}
              {subs.pastDue > 0 && <Badge tone="fail">{subs.pastDue} past due</Badge>}
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
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <Eyebrow>Gross revenue · last 30 days</Eyebrow>
            <span className="text-[11px] text-iron-slate">{c.toUpperCase()}</span>
          </div>
          <RevenueAreaChart data={data.timeseries} currency={c} />
        </Panel>

        <Panel className="p-5">
          <Eyebrow>Subscription mix</Eyebrow>
          <div className="mt-3 space-y-3">
            <Row label="Active" value={subs.active} tone="pro" />
            <Row label="Trialing" value={subs.trialing} tone="info" />
            <Row label="Past due" value={subs.pastDue} tone="fail" />
            <div className="border-t border-line pt-3">
              <Row label="Total" value={subs.total} />
            </div>
          </div>
        </Panel>
      </div>

      <Panel className="mt-4">
        <div className="border-b border-line px-4 py-3">
          <Eyebrow>Recent payments</Eyebrow>
        </div>
        {data.recentPayments.length === 0 ? (
          <EmptyState>No payments yet.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.14em] text-iron-slate">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {data.recentPayments.map((p) => (
                <tr key={p.id} className="border-b border-line/60">
                  <td className="px-4 py-3 text-subtle-gray">{p.email ?? "—"}</td>
                  <td className="px-4 py-3 tabular-nums font-medium">
                    {formatMoney(p.amount, p.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {p.refunded ? (
                      <Badge tone="warn">refunded</Badge>
                    ) : (
                      <Badge tone="success">{p.status}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-iron-slate">{timeAgo(p.created)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Panel>
    </>
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
