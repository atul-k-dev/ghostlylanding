"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ActionRow, type ActionsResponse } from "@/lib/api";
import {
  Panel,
  Badge,
  Spinner,
  EmptyState,
  Select,
  Pagination,
  timeAgo,
} from "@/components/ui";
import { PageHeader } from "@/components/Shell";

const LIMIT = 50;

export default function ActionsPage() {
  const [rows, setRows] = useState<ActionRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [platform, setPlatform] = useState("all");
  const [actionType, setActionType] = useState("all");
  const [success, setSuccess] = useState("all");

  const load = useCallback(async () => {
    setRows(null);
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      platform,
      actionType,
      success,
    });
    const res = await api<ActionsResponse>(`/api/admin/actions?${qs}`);
    if (res.ok) {
      setRows(res.data.actions);
      setTotal(res.data.total);
    } else {
      setRows([]);
    }
  }, [page, platform, actionType, success]);

  useEffect(() => {
    void load();
  }, [load]);

  const reset = (setter: (v: string) => void) => (v: string) => {
    setPage(1);
    setter(v);
  };

  return (
    <>
      <PageHeader
        title="Action log"
        subtitle={`${total.toLocaleString()} matching events`}
        right={
          <div className="flex items-center gap-2">
            <Select
              value={platform}
              onChange={reset(setPlatform)}
              options={[
                { value: "all", label: "All platforms" },
                { value: "twitter", label: "Twitter" },
                { value: "linkedin", label: "LinkedIn" },
              ]}
            />
            <Select
              value={actionType}
              onChange={reset(setActionType)}
              options={[
                { value: "all", label: "All actions" },
                { value: "like", label: "Likes" },
                { value: "comment", label: "Comments" },
                { value: "follow", label: "Follows" },
              ]}
            />
            <Select
              value={success}
              onChange={reset(setSuccess)}
              options={[
                { value: "all", label: "Any result" },
                { value: "true", label: "Success" },
                { value: "false", label: "Failed" },
              ]}
            />
          </div>
        }
      />

      <Panel>
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState>No actions match these filters.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.14em] text-iron-slate">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Action</th>
                <th className="px-4 py-3 font-medium">Target</th>
                <th className="px-4 py-3 font-medium">Result</th>
                <th className="px-4 py-3 font-medium">When</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((a) => (
                <tr key={a.id} className="border-b border-line/60">
                  <td className="px-4 py-3">
                    <span className="text-subtle-gray">{a.user?.email ?? "—"}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2">
                      <Badge tone="info">{a.actionType}</Badge>
                      <span className="text-[11px] text-iron-slate">{a.platform}</span>
                    </span>
                  </td>
                  <td className="max-w-[260px] px-4 py-3">
                    <a
                      href={a.targetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate text-iridescent-glow hover:underline"
                      title={a.targetUrl}
                    >
                      {a.targetHandle ? `@${a.targetHandle}` : a.targetUrl}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    {a.success ? (
                      <Badge tone="success">ok</Badge>
                    ) : (
                      <span title={a.errorMessage ?? ""}>
                        <Badge tone="fail">failed</Badge>
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-iron-slate">{timeAgo(a.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {rows && rows.length > 0 && (
          <Pagination page={page} limit={LIMIT} total={total} onPage={setPage} />
        )}
      </Panel>
    </>
  );
}
