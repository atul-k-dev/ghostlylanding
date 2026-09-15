"use client";

import { useCallback, useEffect, useState } from "react";
import { api, type ActionRow, type ActionsResponse } from "@/lib/api";
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
  Pagination,
  SectionCard,
  Spinner,
  StatusBadge,
  timeAgo,
} from "@/components/admin-ui";
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
          <>
            <FilterSelect
              label="Platform"
              value={platform}
              onChange={reset(setPlatform)}
              options={[
                { value: "all", label: "All platforms" },
                { value: "twitter", label: "Twitter" },
                { value: "linkedin", label: "LinkedIn" },
              ]}
            />
            <FilterSelect
              label="Action"
              value={actionType}
              onChange={reset(setActionType)}
              options={[
                { value: "all", label: "All actions" },
                { value: "like", label: "Likes" },
                { value: "comment", label: "Comments" },
                { value: "follow", label: "Follows" },
              ]}
            />
            <FilterSelect
              label="Result"
              value={success}
              onChange={reset(setSuccess)}
              options={[
                { value: "all", label: "Any result" },
                { value: "true", label: "Success" },
                { value: "false", label: "Failed" },
              ]}
            />
          </>
        }
      />

      <SectionCard flush>
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState>No actions match these filters.</EmptyState>
        ) : (
          <Table className={FLUSH_TABLE}>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Result</TableHead>
                <TableHead>When</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.user?.email ?? "—"}</TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2">
                      <StatusBadge tone="info">{a.actionType}</StatusBadge>
                      <span className="text-xs text-muted-foreground">{a.platform}</span>
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[260px]">
                    <a
                      href={a.targetUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block truncate underline-offset-4 hover:underline"
                      title={a.targetUrl}
                    >
                      {a.targetHandle ? `@${a.targetHandle}` : a.targetUrl}
                    </a>
                  </TableCell>
                  <TableCell>
                    {a.success ? (
                      <StatusBadge tone="success">ok</StatusBadge>
                    ) : (
                      <span title={a.errorMessage ?? ""}>
                        <StatusBadge tone="fail">failed</StatusBadge>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{timeAgo(a.timestamp)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {rows && rows.length > 0 && (
          <Pagination page={page} limit={LIMIT} total={total} onPage={setPage} />
        )}
      </SectionCard>
    </>
  );
}
