"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { api, type UserRow, type UsersResponse } from "@/lib/api";
import {
  Panel,
  Badge,
  Button,
  Spinner,
  EmptyState,
  Select,
  Pagination,
  timeAgo,
} from "@/components/ui";
import { PageHeader } from "@/components/Shell";

const LIMIT = 25;

export default function UsersPage() {
  const [rows, setRows] = useState<UserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [plan, setPlan] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRows(null);
    const qs = new URLSearchParams({
      page: String(page),
      limit: String(LIMIT),
      plan,
      ...(search ? { search } : {}),
    });
    const res = await api<UsersResponse>(`/api/admin/users?${qs}`);
    if (res.ok) {
      setRows(res.data.users);
      setTotal(res.data.total);
    } else {
      setRows([]);
    }
  }, [page, plan, search]);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePro = async (u: UserRow) => {
    setBusyId(u.id);
    const res = await api(`/api/admin/users/${u.id}/pro`, {
      method: "PATCH",
      body: { pro: !u.isPro },
    });
    if (res.ok) {
      setRows((prev) =>
        prev?.map((r) =>
          r.id === u.id
            ? {
                ...r,
                isPro: !u.isPro,
                subscriptionStatus: !u.isPro ? "active" : "free",
                subscriptionPlan: !u.isPro ? "monthly" : "free",
              }
            : r,
        ) ?? null,
      );
    }
    setBusyId(null);
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle={`${total.toLocaleString()} total`}
        right={
          <div className="flex items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                setSearch(searchInput.trim());
              }}
            >
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search email or name…"
                className="w-56 rounded-lg border border-line bg-panel-2 px-3 py-1.5 text-xs outline-none focus:border-iron-slate"
              />
            </form>
            <Select
              value={plan}
              onChange={(v) => {
                setPage(1);
                setPlan(v);
              }}
              options={[
                { value: "all", label: "All plans" },
                { value: "pro", label: "Pro only" },
                { value: "free", label: "Free only" },
              ]}
            />
          </div>
        }
      />

      <Panel>
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState>No users match.</EmptyState>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-[10px] uppercase tracking-[0.14em] text-iron-slate">
                <th className="px-4 py-3 font-medium">User</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Actions</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rows.map((u) => (
                <tr
                  key={u.id}
                  className="border-b border-line/60 transition hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <Link href={`/users/${u.id}`} className="group text-left">
                      <span className="block font-medium group-hover:text-casper-red">
                        {u.email}
                      </span>
                      <span className="block text-[11px] text-iron-slate">
                        {u.name}
                        {u.isAdmin && (
                          <span className="ml-1.5">
                            <Badge tone="info">admin</Badge>
                          </span>
                        )}
                        {u.isBanned && (
                          <span className="ml-1.5">
                            <Badge tone="fail">banned</Badge>
                          </span>
                        )}
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {u.isPro ? (
                      <Badge tone="pro">Pro · {u.subscriptionPlan}</Badge>
                    ) : (
                      <Badge>Free</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 tabular-nums text-subtle-gray">
                    {u.lifetimeActionCount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-iron-slate">{timeAgo(u.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant={u.isPro ? "danger" : "primary"}
                      disabled={busyId === u.id}
                      onClick={() => togglePro(u)}
                    >
                      {busyId === u.id ? "…" : u.isPro ? "Revoke Pro" : "Grant Pro"}
                    </Button>
                  </td>
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
