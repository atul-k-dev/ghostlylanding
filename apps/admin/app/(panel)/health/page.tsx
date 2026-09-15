"use client";

/**
 * Fleet health. Diagnostics arrive from every extension, so this is where an X
 * DOM change becomes visible — a `selector_miss` on one context jumping from a
 * handful of users to most of them — instead of arriving as support email days
 * later. The selector override at the bottom is the fix for exactly that.
 */

import { useCallback, useEffect, useState } from "react";
import { TriangleAlertIcon } from "lucide-react";
import { api, type HealthResponse, type HealthIssue } from "@/lib/api";
import { cn } from "@/lib/utils";
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
  FilterSelect,
  FLUSH_TABLE,
  SectionCard,
  Spinner,
  StatusBadge,
  timeAgo,
} from "@/components/admin-ui";
import { PageHeader } from "@/components/Shell";

const KIND_TONE: Record<string, string> = {
  selector_miss: "fail",
  tab_load_timeout: "warn",
  network_error: "warn",
  auth_failure: "fail",
  rate_limited: "info",
  auto_pause: "default",
};

/** A jump in affected users is the alarm — raw counts are noisy because one
 *  stuck browser can retry all day. */
function severityOf(issue: HealthIssue): "critical" | "elevated" | null {
  const grew = issue.previousCount === 0 ? issue.count >= 5 : issue.count >= issue.previousCount * 3;
  if (issue.kind === "selector_miss" && issue.affectedUsers >= 5 && grew) return "critical";
  if (grew && issue.affectedUsers >= 3) return "elevated";
  return null;
}

const codeClass = "rounded bg-muted px-1 py-0.5 font-mono text-xs text-foreground";

export default function HealthPage() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [hours, setHours] = useState("24");

  const load = useCallback(async () => {
    setData(null);
    const res = await api<HealthResponse>(`/api/admin/health?hours=${hours}`);
    if (res.ok) setData(res.data);
    else setData({ hours: Number(hours), since: "", byKind: {}, issues: [], selectorConfig: { version: "—", overrideCount: 0, overrides: {} } });
  }, [hours]);

  useEffect(() => {
    void load();
  }, [load]);

  const critical = data?.issues.filter((i) => severityOf(i) === "critical") ?? [];

  return (
    <>
      <PageHeader
        title="Fleet health"
        subtitle="What's breaking inside users' browsers, right now"
        right={
          <FilterSelect
            label="Time window"
            value={hours}
            onChange={setHours}
            options={[
              { value: "6", label: "Last 6 hours" },
              { value: "24", label: "Last 24 hours" },
              { value: "72", label: "Last 3 days" },
              { value: "168", label: "Last 7 days" },
            ]}
          />
        }
      />

      {!data ? (
        <Spinner label="Loading diagnostics…" />
      ) : (
        <>
          {critical.length > 0 && (
            <div className="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">
                  {critical.length === 1 ? "A selector looks broken" : `${critical.length} selectors look broken`}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {critical.map((c) => c.context).join(", ")} — rising sharply across multiple users.
                  This is what an X DOM change looks like. Push a corrected selector below; users pick
                  it up within 6 hours or on their next browser restart.
                </p>
              </div>
            </div>
          )}

          <SectionCard title="Selector config">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-muted-foreground">Serving version</span>
              <code className={codeClass}>{data.selectorConfig.version}</code>
              <span className="text-muted-foreground">
                {data.selectorConfig.overrideCount === 0
                  ? "no overrides — everyone is on the bundled map"
                  : `${data.selectorConfig.overrideCount} override(s) active`}
              </span>
            </div>
            {data.selectorConfig.overrideCount > 0 && (
              <dl className="mt-3 space-y-1 text-xs">
                {Object.entries(data.selectorConfig.overrides).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <dt className="w-48 shrink-0 text-muted-foreground">{key}</dt>
                    <dd className="font-mono break-all">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              Push a fix with <code className={codeClass}>PUT /api/admin/selectors</code> — body{" "}
              <code className={codeClass}>{'{ "selectors": { "likeButton": "…" } }'}</code>. Send an
              empty object to clear it.
            </p>
          </SectionCard>

          <SectionCard title="By kind">
            {Object.keys(data.byKind).length === 0 ? (
              <EmptyState>Nothing reported in this window — everything is working.</EmptyState>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.byKind)
                  .sort((a, b) => b[1] - a[1])
                  .map(([kind, count]) => (
                    <StatusBadge key={kind} tone={KIND_TONE[kind] ?? "default"}>
                      {kind} · {count.toLocaleString()}
                    </StatusBadge>
                  ))}
              </div>
            )}
          </SectionCard>

          <SectionCard
            flush
            title="Issues"
            description="Ranked by volume, compared with the previous window of the same length."
          >
            {data.issues.length === 0 ? (
              <EmptyState>No diagnostics reported.</EmptyState>
            ) : (
              <Table className={FLUSH_TABLE}>
                <TableHeader className="bg-muted/50">
                  <TableRow>
                    <TableHead>Kind</TableHead>
                    <TableHead>Where</TableHead>
                    <TableHead className="text-right">Events</TableHead>
                    <TableHead className="text-right">Users</TableHead>
                    <TableHead className="text-right">Previous</TableHead>
                    <TableHead>Last seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.issues.map((issue) => {
                    const severity = severityOf(issue);
                    return (
                      <TableRow
                        key={`${issue.kind}:${issue.context}`}
                        className={cn(severity === "critical" && "bg-destructive/5")}
                      >
                        <TableCell>
                          <StatusBadge tone={KIND_TONE[issue.kind] ?? "default"}>{issue.kind}</StatusBadge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">{issue.context}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {issue.count.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {issue.affectedUsers.toLocaleString()}
                          {severity && (
                            <span
                              className={cn(
                                "ml-2",
                                severity === "critical" ? "text-destructive" : "text-amber-500",
                              )}
                            >
                              ▲
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground tabular-nums">
                          {issue.previousCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{timeAgo(issue.lastAt)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </SectionCard>
        </>
      )}
    </>
  );
}
