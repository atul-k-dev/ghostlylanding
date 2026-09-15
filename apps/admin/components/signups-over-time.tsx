"use client";

import { useEffect, useState } from "react";
import { api, type TimeseriesDay } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FilterSelect, SectionCard, Spinner } from "@/components/admin-ui";
import { SignupsBarChart } from "@/components/charts";

const RANGES = [
  { value: "365", label: "Last 12 months", description: "the last 12 months" },
  { value: "90", label: "Last 90 days", description: "the last 90 days" },
  { value: "30", label: "Last 30 days", description: "the last 30 days" },
  { value: "7", label: "Last 7 days", description: "the last 7 days" },
] as const;

type Range = (typeof RANGES)[number]["value"];
type Point = { date: string; signups: number };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Days from the 1st of the month 11 months ago through today (UTC), so the
 *  12-month view is exactly 12 whole calendar-month bars. */
const twelveMonthWindowDays = (): number => {
  const now = new Date();
  const start = Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11, 1);
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((today - start) / DAY_MS) + 1;
};

/** Roll daily rows up into calendar-month buckets keyed by the 1st. */
const byMonth = (days: TimeseriesDay[]): Point[] => {
  const months = new Map<string, number>();
  for (const d of days) {
    const key = `${d.date.slice(0, 7)}-01`;
    months.set(key, (months.get(key) ?? 0) + d.signups);
  }
  return [...months].map(([date, signups]) => ({ date, signups }));
};

/** Full-width signups bar chart with a time-range switcher. */
export function SignupsOverTime() {
  const [range, setRange] = useState<Range>("30");
  const [data, setData] = useState<Point[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setData(null);
    setError(null);
    const monthly = range === "365";
    const days = monthly ? twelveMonthWindowDays() : Number(range);
    void api<{ days: TimeseriesDay[] }>(`/api/admin/stats/timeseries?days=${days}`).then((res) => {
      if (cancelled) return;
      if (!res.ok) setError(res.error.message);
      else setData(monthly ? byMonth(res.data.days) : res.data.days);
    });
    return () => {
      cancelled = true;
    };
  }, [range]);

  const current = RANGES.find((r) => r.value === range) ?? RANGES[2];

  return (
    <SectionCard
      className="@container/card"
      title="Signups over time"
      description={`User registrations for ${current.description}`}
      action={
        <>
          <div className="hidden overflow-hidden rounded-lg border @[640px]/card:flex">
            {RANGES.map((r) => (
              <Button
                key={r.value}
                variant="ghost"
                size="sm"
                aria-pressed={range === r.value}
                onClick={() => setRange(r.value)}
                className={cn(
                  "rounded-none border-l px-3 first:border-l-0",
                  range === r.value && "bg-muted text-foreground",
                )}
              >
                {r.label}
              </Button>
            ))}
          </div>
          <div className="@[640px]/card:hidden">
            <FilterSelect
              label="Time range"
              value={range}
              onChange={(v) => setRange(v as Range)}
              options={RANGES.map(({ value, label }) => ({ value, label }))}
            />
          </div>
        </>
      }
    >
      {error ? (
        <div className="flex h-[280px] items-center justify-center text-sm text-destructive">
          {error}
        </div>
      ) : data === null ? (
        <div className="flex h-[280px] items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <SignupsBarChart data={data} granularity={range === "365" ? "month" : "day"} />
      )}
    </SectionCard>
  );
}
