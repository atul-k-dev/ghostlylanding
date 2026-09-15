"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { SearchIcon } from "lucide-react";
import { api, type UserRow, type UsersResponse } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
          <>
            <form
              className="relative"
              onSubmit={(e) => {
                e.preventDefault();
                setPage(1);
                setSearch(searchInput.trim());
              }}
            >
              <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search email or name…"
                className="h-8 w-56 pl-8"
              />
            </form>
            <FilterSelect
              label="Plan"
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
          </>
        }
      />

      <SectionCard flush>
        {rows === null ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <EmptyState>No users match.</EmptyState>
        ) : (
          <Table className={FLUSH_TABLE}>
            <TableHeader className="bg-muted/50">
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Actions</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>
                  <span className="sr-only">Manage</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((u) => (
                <TableRow key={u.id}>
                  <TableCell>
                    <Link
                      href={`/users/${u.id}`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {u.email}
                    </Link>
                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span>{u.name}</span>
                      {u.isAdmin && <StatusBadge tone="info">admin</StatusBadge>}
                      {u.isBanned && <StatusBadge tone="fail">banned</StatusBadge>}
                    </div>
                  </TableCell>
                  <TableCell>
                    {u.isPro ? (
                      <StatusBadge tone="pro">Pro · {u.subscriptionPlan}</StatusBadge>
                    ) : (
                      <StatusBadge>Free</StatusBadge>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums">
                    {u.lifetimeActionCount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{timeAgo(u.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={u.isPro ? "destructive" : "default"}
                      disabled={busyId === u.id}
                      onClick={() => togglePro(u)}
                    >
                      {busyId === u.id ? "…" : u.isPro ? "Revoke Pro" : "Grant Pro"}
                    </Button>
                  </TableCell>
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
