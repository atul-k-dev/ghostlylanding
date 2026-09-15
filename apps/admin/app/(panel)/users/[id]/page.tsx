"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ActivityIcon,
  ArrowLeftIcon,
  HeartIcon,
  MessageSquareIcon,
  TagIcon,
  UserPlusIcon,
} from "lucide-react";
import { api, type UserDetail, type ActionRow, type UserComment } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  EmptyState,
  ErrorCard,
  IconTile,
  SectionCard,
  Spinner,
  StatCard,
  StatGrid,
  StatusBadge,
  timeAgo,
} from "@/components/admin-ui";

const ACTION_ICON: Record<string, React.ReactNode> = {
  like: <HeartIcon />,
  comment: <MessageSquareIcon />,
  follow: <UserPlusIcon />,
};

const STATUS_TONE: Record<string, string> = {
  pending: "warn",
  approved: "info",
  posted: "pro",
  rejected: "default",
  failed: "fail",
};

export default function UserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await api<UserDetail>(`/api/admin/users/${id}`);
    if (res.ok) setDetail(res.data);
    else setError(res.error.message);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePro = async () => {
    if (!detail) return;
    setBusy(true);
    const res = await api(`/api/admin/users/${id}/pro`, {
      method: "PATCH",
      body: { pro: !detail.user.isPro },
    });
    if (res.ok) await load();
    setBusy(false);
  };

  const toggleBan = async () => {
    if (!detail) return;
    const banning = !detail.user.isBanned;
    if (banning && !confirm(`Ban ${detail.user.email}? They’ll be signed out and blocked from Ghostly247.`))
      return;
    setBusy(true);
    const res = await api(`/api/admin/users/${id}/ban`, {
      method: "PATCH",
      body: { banned: banning },
    });
    if (res.ok) await load();
    else if (!res.ok) alert(res.error.message);
    setBusy(false);
  };

  if (error) {
    return (
      <>
        <BackLink />
        <ErrorCard>{error}</ErrorCard>
      </>
    );
  }
  if (!detail) {
    return (
      <>
        <BackLink />
        <Spinner />
      </>
    );
  }

  const u = detail.user;
  const initial = (u.name || u.email || "?").trim().charAt(0).toUpperCase();

  return (
    <>
      <BackLink />

      {/* Profile header */}
      <Card className={cn(u.isBanned && "ring-destructive/40")}>
        <CardContent className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar className="size-14 rounded-xl">
              <AvatarFallback className="rounded-xl text-xl font-semibold">{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <h2 className="truncate text-xl font-semibold tracking-tight">{u.email}</h2>
              <p className="text-sm text-muted-foreground">{u.name || "—"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {u.isBanned && <StatusBadge tone="fail">Suspended</StatusBadge>}
                {u.isPro ? (
                  <StatusBadge tone="pro">Pro · {u.subscriptionPlan}</StatusBadge>
                ) : (
                  <StatusBadge>Free</StatusBadge>
                )}
                {u.isAdmin && <StatusBadge tone="info">admin</StatusBadge>}
                <StatusBadge>{u.lifetimeActionCount.toLocaleString()} lifetime actions</StatusBadge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={u.isPro ? "destructive" : "default"}
              disabled={busy}
              onClick={togglePro}
            >
              {busy ? "…" : u.isPro ? "Revoke Pro" : "Grant Pro"}
            </Button>
            <Button
              variant={u.isBanned ? "default" : "destructive"}
              disabled={busy || (!u.isBanned && u.isAdmin)}
              onClick={toggleBan}
            >
              {busy ? "…" : u.isBanned ? "Reinstate" : "Ban user"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Action breakdown */}
      <StatGrid columns={3}>
        <StatCard label="Likes" value={detail.actionCounts.like} icon={<HeartIcon />} />
        <StatCard label="Comments" value={detail.actionCounts.comment} icon={<MessageSquareIcon />} />
        <StatCard label="Follows" value={detail.actionCounts.follow} icon={<UserPlusIcon />} />
      </StatGrid>

      {/* Account · Keywords */}
      <div className="grid grid-cols-1 gap-4 @4xl/main:grid-cols-3">
        <SectionCard title="Account">
          <dl className="space-y-2.5 text-sm">
            <Info label="Plan" value={u.isPro ? `Pro · ${u.subscriptionPlan}` : "Free"} />
            <Info label="Status" value={u.isBanned ? "Suspended" : u.subscriptionStatus} />
            <Info label="Joined" value={new Date(u.createdAt).toLocaleDateString()} />
            {u.currentPeriodEnd && (
              <Info label="Renews" value={new Date(u.currentPeriodEnd).toLocaleDateString()} />
            )}
          </dl>
        </SectionCard>

        <SectionCard
          className="@4xl/main:col-span-2"
          title="Keywords"
          action={
            <IconTile>
              <TagIcon />
            </IconTile>
          }
        >
          {u.keywords.length === 0 ? (
            <p className="text-sm text-muted-foreground">No keywords set.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {u.keywords.map((k) => (
                <Badge key={k} variant="secondary">
                  {k}
                </Badge>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      {/* Recent activity — full width row */}
      <SectionCard
        flush
        title="Recent activity"
        description={`Last ${detail.recentActions.length} actions`}
        action={
          <IconTile>
            <ActivityIcon />
          </IconTile>
        }
      >
        {detail.recentActions.length === 0 ? (
          <EmptyState>No actions yet.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2">
            {detail.recentActions.map((a) => (
              <ActivityRow key={a.id} a={a} />
            ))}
          </div>
        )}
      </SectionCard>

      {/* Comments — full width row */}
      <SectionCard
        flush
        title="Comments"
        description={`${detail.recentComments.length} most recent AI replies`}
        action={
          <IconTile>
            <MessageSquareIcon />
          </IconTile>
        }
      >
        {detail.recentComments.length === 0 ? (
          <EmptyState>No comments generated yet.</EmptyState>
        ) : (
          <div className="max-h-[460px] divide-y overflow-y-auto">
            {detail.recentComments.map((c) => (
              <CommentRow key={c.id} c={c} />
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}

function BackLink() {
  return (
    <Button variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground" asChild>
      <Link href="/users">
        <ArrowLeftIcon />
        Back to users
      </Link>
    </Button>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  );
}

function CommentRow({ c }: { c: UserComment }) {
  return (
    <div className="px-4 py-3.5">
      <div className="mb-1.5 flex items-center gap-2 text-xs text-muted-foreground">
        <StatusBadge tone={STATUS_TONE[c.status] ?? "default"}>{c.status}</StatusBadge>
        <span>{c.platform}</span>
        <span>·</span>
        <span>{c.tone}</span>
        <span className="ml-auto">{timeAgo(c.createdAt)}</span>
      </div>
      <p className="text-sm leading-relaxed">{c.draftText}</p>
      <a
        href={c.postUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block max-w-full truncate text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        title={c.postUrl}
      >
        {c.postUrl} ↗
      </a>
    </div>
  );
}

function ActivityRow({ a }: { a: ActionRow }) {
  return (
    <div className="flex items-center gap-3 border-b px-4 py-3">
      <IconTile>{ACTION_ICON[a.actionType] ?? <ActivityIcon />}</IconTile>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize">{a.actionType}</span>
          <span className="text-xs text-muted-foreground">{a.platform}</span>
          {!a.success && <StatusBadge tone="fail">failed</StatusBadge>}
        </div>
        {a.targetHandle && (
          <a
            href={a.targetUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            @{a.targetHandle}
          </a>
        )}
      </div>
      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(a.timestamp)}</span>
    </div>
  );
}
