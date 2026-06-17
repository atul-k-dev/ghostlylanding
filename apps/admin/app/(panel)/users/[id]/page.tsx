"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api, type UserDetail, type ActionRow, type UserComment } from "@/lib/api";
import { Panel, Eyebrow, Spinner, Badge, Button, EmptyState, timeAgo } from "@/components/ui";
import { IconBadge, Icons } from "@/components/icons";

const ACTION_META: Record<string, { icon: React.ReactNode; tone: "red" | "blue" | "green" }> = {
  like: { icon: Icons.heart, tone: "red" },
  comment: { icon: Icons.message, tone: "blue" },
  follow: { icon: Icons.userPlus, tone: "green" },
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
    if (banning && !confirm(`Ban ${detail.user.email}? They’ll be signed out and blocked from Casper.`))
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
        <Panel className="p-6 text-sm text-vivid-crimson">{error}</Panel>
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
      <Panel className={`mb-4 p-6 ${u.isBanned ? "ring-1 ring-casper-red/30" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-casper-red/15 text-xl font-semibold text-casper-red ring-1 ring-casper-red/20">
              {initial}
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold tracking-tight">{u.email}</h1>
              <p className="text-sm text-iron-slate">{u.name || "—"}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {u.isBanned && <Badge tone="fail">Suspended</Badge>}
                {u.isPro ? (
                  <Badge tone="pro">Pro · {u.subscriptionPlan}</Badge>
                ) : (
                  <Badge>Free</Badge>
                )}
                {u.isAdmin && <Badge tone="info">admin</Badge>}
                <Badge>{u.lifetimeActionCount.toLocaleString()} lifetime actions</Badge>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant={u.isPro ? "danger" : "primary"}
              disabled={busy}
              onClick={togglePro}
              className="px-4 py-2 text-[13px]"
            >
              {busy ? "…" : u.isPro ? "Revoke Pro" : "Grant Pro"}
            </Button>
            <Button
              variant={u.isBanned ? "primary" : "danger"}
              disabled={busy || (!u.isBanned && u.isAdmin)}
              onClick={toggleBan}
              className="px-4 py-2 text-[13px]"
            >
              {busy ? "…" : u.isBanned ? "Reinstate" : "Ban user"}
            </Button>
          </div>
        </div>
      </Panel>

      {/* Action breakdown */}
      <div className="mb-4 grid grid-cols-3 gap-4">
        <StatCard label="Likes" value={detail.actionCounts.like} icon={Icons.heart} tone="red" />
        <StatCard
          label="Comments"
          value={detail.actionCounts.comment}
          icon={Icons.message}
          tone="blue"
        />
        <StatCard
          label="Follows"
          value={detail.actionCounts.follow}
          icon={Icons.userPlus}
          tone="green"
        />
      </div>

      {/* Account · Keywords */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel className="p-5">
          <h3 className="mb-3 text-sm font-semibold">Account</h3>
          <dl className="space-y-2.5 text-sm">
            <Info label="Plan" value={u.isPro ? `Pro · ${u.subscriptionPlan}` : "Free"} />
            <Info label="Status" value={u.isBanned ? "Suspended" : u.subscriptionStatus} />
            <Info label="Joined" value={new Date(u.createdAt).toLocaleDateString()} />
            {u.currentPeriodEnd && (
              <Info label="Renews" value={new Date(u.currentPeriodEnd).toLocaleDateString()} />
            )}
          </dl>
        </Panel>

        <Panel className="p-5 lg:col-span-2">
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold">Keywords</h3>
            <span className="text-iron-slate">{Icons.tag}</span>
          </div>
          {u.keywords.length === 0 ? (
            <p className="text-xs text-iron-slate">No keywords set.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {u.keywords.map((k) => (
                <Badge key={k}>{k}</Badge>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Recent activity — full width row */}
      <Panel className="mt-4">
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <IconBadge tone="violet">{Icons.activity}</IconBadge>
          <div>
            <h3 className="text-sm font-semibold">Recent activity</h3>
            <p className="text-[11px] text-iron-slate">Last {detail.recentActions.length} actions</p>
          </div>
        </div>
        {detail.recentActions.length === 0 ? (
          <EmptyState>No actions yet.</EmptyState>
        ) : (
          <div className="grid grid-cols-1 divide-y divide-line/60 md:grid-cols-2 md:divide-y-0">
            {detail.recentActions.map((a) => (
              <ActivityRow key={a.id} a={a} />
            ))}
          </div>
        )}
      </Panel>

      {/* Comments — full width row */}
      <Panel className="mt-4">
        <div className="flex items-center gap-2.5 border-b border-line px-5 py-4">
          <IconBadge tone="blue">{Icons.message}</IconBadge>
          <div>
            <h3 className="text-sm font-semibold">Comments</h3>
            <p className="text-[11px] text-iron-slate">
              {detail.recentComments.length} most recent AI replies
            </p>
          </div>
        </div>
        {detail.recentComments.length === 0 ? (
          <EmptyState>No comments generated yet.</EmptyState>
        ) : (
          <div className="thin-scroll max-h-[460px] divide-y divide-line/60 overflow-y-auto">
            {detail.recentComments.map((c) => (
              <CommentRow key={c.id} c={c} />
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}

function BackLink() {
  return (
    <Link
      href="/users"
      className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-iron-slate transition hover:text-subtle-gray"
    >
      {Icons.arrowLeft}
      Back to users
    </Link>
  );
}

function StatCard({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: "red" | "blue" | "green";
}) {
  return (
    <Panel className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <Eyebrow>{label}</Eyebrow>
          <p className="mt-2 text-3xl font-light tracking-tight">{value.toLocaleString()}</p>
        </div>
        <IconBadge tone={tone}>{icon}</IconBadge>
      </div>
    </Panel>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-iron-slate">{label}</dt>
      <dd className="font-medium capitalize">{value}</dd>
    </div>
  );
}

function CommentRow({ c }: { c: UserComment }) {
  return (
    <div className="px-5 py-3.5">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] text-iron-slate">
        <Badge tone={STATUS_TONE[c.status] ?? "default"}>{c.status}</Badge>
        <span>{c.platform}</span>
        <span>·</span>
        <span>{c.tone}</span>
        <span className="ml-auto">{timeAgo(c.createdAt)}</span>
      </div>
      <p className="text-sm leading-relaxed text-subtle-gray">{c.draftText}</p>
      <a
        href={c.postUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-1 inline-block max-w-full truncate text-[11px] text-iridescent-glow hover:underline"
        title={c.postUrl}
      >
        {c.postUrl} ↗
      </a>
    </div>
  );
}

function ActivityRow({ a }: { a: ActionRow }) {
  const meta = ACTION_META[a.actionType] ?? { icon: Icons.activity, tone: "blue" as const };
  return (
    <div className="flex items-center gap-3 border-b border-line/60 px-5 py-3">
      <IconBadge tone={meta.tone}>{meta.icon}</IconBadge>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium capitalize">{a.actionType}</span>
          <span className="text-[11px] text-iron-slate">{a.platform}</span>
          {!a.success && <Badge tone="fail">failed</Badge>}
        </div>
        {a.targetHandle && (
          <a
            href={a.targetUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-iridescent-glow hover:underline"
          >
            @{a.targetHandle}
          </a>
        )}
      </div>
      <span className="shrink-0 text-[11px] text-iron-slate">{timeAgo(a.timestamp)}</span>
    </div>
  );
}
