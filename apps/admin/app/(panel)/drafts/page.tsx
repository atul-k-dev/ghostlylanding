"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type DraftRow, type DraftsResponse } from "@/lib/api";
import {
  EmptyState,
  FilterSelect,
  Pagination,
  SectionCard,
  Spinner,
  StatusBadge,
  timeAgo,
} from "@/components/admin-ui";
import { PageHeader } from "@/components/Shell";

const LIMIT = 50;

const STATUS_TONE: Record<string, string> = {
  pending: "warn",
  approved: "info",
  posted: "pro",
  rejected: "default",
  failed: "fail",
};

export default function DraftsPage() {
  const [rows, setRows] = useState<DraftRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("all");

  const load = useCallback(async () => {
    setRows(null);
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      status,
    });
    const res = await api<DraftsResponse>(`/api/admin/drafts?${qs}`);
    if (res.ok) {
      setRows(res.data.drafts);
      setTotal(res.data.total);
    } else {
      setRows([]);
    }
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <PageHeader
        title="Comment drafts"
        subtitle={`${total.toLocaleString()} AI-generated replies`}
        right={
          <FilterSelect
            label="Status"
            value={status}
            onChange={(v) => {
              setPage(1);
              setStatus(v);
            }}
            options={[
              { value: "all", label: "All statuses" },
              { value: "pending", label: "Pending" },
              { value: "approved", label: "Approved" },
              { value: "posted", label: "Posted" },
              { value: "rejected", label: "Rejected" },
              { value: "failed", label: "Failed" },
            ]}
          />
        }
      />

      <SectionCard flush>
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState>No drafts match.</EmptyState>
        ) : (
          <div className="divide-y">
            {rows.map((d) => (
              <div key={d.id} className="px-4 py-3.5">
                <div className="mb-1.5 flex items-center justify-between gap-3">
                  <span className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                    <StatusBadge tone={STATUS_TONE[d.status] ?? "default"}>{d.status}</StatusBadge>
                    <span>{d.platform}</span>
                    <span>·</span>
                    <span>{d.tone}</span>
                    <span>·</span>
                    <span className="truncate text-foreground">{d.user?.email ?? "—"}</span>
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {timeAgo(d.createdAt)}
                  </span>
                </div>
                <p className="text-sm leading-relaxed">{d.draftText}</p>
                <a
                  href={d.postUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block max-w-full truncate text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                  title={d.postUrl}
                >
                  {d.postUrl} ↗
                </a>
              </div>
            ))}
          </div>
        )}
        {rows && rows.length > 0 && (
          <Pagination page={page} limit={LIMIT} total={total} onPage={setPage} />
        )}
      </SectionCard>
    </>
  );
}
