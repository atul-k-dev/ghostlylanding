"use client";

/**
 * Fleet health. Diagnostics arrive from every extension, so this is where an X
 * DOM change becomes visible — a `selector_miss` on one context jumping from a
 * handful of users to most of them — instead of arriving as support email days
 * later. The selector override at the bottom is the fix for exactly that.
 */

import { useCallback, useEffect, useState } from "react";
import { api, type HealthResponse, type HealthIssue } from "@/lib/api";
import { Panel, Badge, Eyebrow, Spinner, EmptyState, Select, timeAgo } from "@/components/ui";
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
          <Select
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
        <div className="space-y-4">
          {critical.length > 0 && (
            <div className="rounded-lg border border-vivid-crimson/40 bg-vivid-crimson/10 p-4">
              <p className="text-sm font-semibold text-vivid-crimson">
                {critical.length === 1 ? "A selector looks broken" : `${critical.length} selectors look broken`}
              </p>
              <p className="mt-1 text-xs text-iron-slate">
                {critical.map((c) => c.context).join(", ")} — rising sharply across multiple users.
                This is what an X DOM change looks like. Push a corrected selector below; users pick
                it up within 6 hours or on their next browser restart.
              </p>
            </div>
          )}

          <Panel className="p-4">
            <Eyebrow>Selector config</Eyebrow>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm">
              <span className="text-iron-slate">Serving version</span>
              <code className="rounded bg-white/5 px-2 py-0.5 text-xs">
                {data.selectorConfig.version}
              </code>
              <span className="text-iron-slate">
                {data.selectorConfig.overrideCount === 0
                  ? "no overrides — everyone is on the bundled map"
                  : `${data.selectorConfig.overrideCount} override(s) active`}
              </span>
            </div>
            {data.selectorConfig.overrideCount > 0 && (
              <dl className="mt-3 space-y-1 text-xs">
                {Object.entries(data.selectorConfig.overrides).map(([key, value]) => (
                  <div key={key} className="flex gap-2">
                    <dt className="w-48 shrink-0 text-iron-slate">{key}</dt>
                    <dd className="break-all font-mono">{value}</dd>
                  </div>
                ))}
              </dl>
            )}
            <p className="mt-3 text-xs text-iron-slate">
              Push a fix with <code className="rounded bg-white/5 px-1">PUT /api/admin/selectors</code>{" "}
              — body <code className="rounded bg-white/5 px-1">{'{ "selectors": { "likeButton": "…" } }'}</code>.
              Send an empty object to clear it.
            </p>
          </Panel>

          <Panel className="p-4">
            <Eyebrow>By kind</Eyebrow>
            <div className="mt-2" />
            {Object.keys(data.byKind).length === 0 ? (
              <EmptyState>Nothing reported in this window — everything is working.</EmptyState>
            ) : (
              <div className="flex flex-wrap gap-2">
                {Object.entries(data.byKind)
                  .sort((a, b) => b[1] - a[1])
                  .map(([kind, count]) => (
                    <Badge key={kind} tone={KIND_TONE[kind] ?? "default"}>
                      {kind} · {count.toLocaleString()}
                    </Badge>
                  ))}
              </div>
            )}
          </Panel>

          <Panel className="p-4">
            <Eyebrow>Issues</Eyebrow>
            <p className="mb-2 mt-1 text-xs text-iron-slate">
              Ranked by volume, compared with the previous window of the same length.
            </p>
            {data.issues.length === 0 ? (
              <EmptyState>No diagnostics reported.</EmptyState>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-xs uppercase tracking-wider text-iron-slate">
                    <tr>
                      <th className="py-2 pr-4">Kind</th>
                      <th className="py-2 pr-4">Where</th>
                      <th className="py-2 pr-4 text-right">Events</th>
                      <th className="py-2 pr-4 text-right">Users</th>
                      <th className="py-2 pr-4 text-right">Previous</th>
                      <th className="py-2 pr-4">Last seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.issues.map((issue) => {
                      const severity = severityOf(issue);
                      return (
                        <tr
                          key={`${issue.kind}:${issue.context}`}
                          className={`border-t border-white/5 ${
                            severity === "critical" ? "bg-vivid-crimson/5" : ""
                          }`}
                        >
                          <td className="py-2 pr-4">
                            <Badge tone={KIND_TONE[issue.kind] ?? "default"}>{issue.kind}</Badge>
                          </td>
                          <td className="py-2 pr-4 font-mono text-xs">{issue.context}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {issue.count.toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {issue.affectedUsers.toLocaleString()}
                            {severity && (
                              <span
                                className={
                                  severity === "critical"
                                    ? "ml-2 text-vivid-crimson"
                                    : "ml-2 text-goldenrod"
                                }
                              >
                                ▲
                              </span>
                            )}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums text-iron-slate">
                            {issue.previousCount.toLocaleString()}
                          </td>
                          <td className="py-2 pr-4 text-iron-slate">{timeAgo(issue.lastAt)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}
