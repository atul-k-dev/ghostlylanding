"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { getToken, getEmail, clearSession } from "@/lib/auth";
import { Icons } from "@/components/icons";

const NAV = [
  { href: "/", label: "Overview", icon: Icons.grid },
  { href: "/revenue", label: "Revenue", icon: Icons.dollar },
  { href: "/users", label: "Users", icon: Icons.users },
  { href: "/actions", label: "Action log", icon: Icons.activity },
  { href: "/drafts", label: "Comment drafts", icon: Icons.message },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setEmail(getEmail());
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-xs text-iron-slate">
        <span className="h-3 w-3 animate-spin rounded-full border border-iron-slate/30 border-t-casper-red" />
      </div>
    );
  }

  const logout = () => {
    clearSession();
    router.replace("/login");
  };

  const initial = (email ?? "?").trim().charAt(0).toUpperCase();

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col border-r border-line bg-[linear-gradient(180deg,#1c1c22_0%,#161619_100%)] px-3 py-5">
        {/* Brand */}
        <div className="mb-8 flex items-center gap-3 px-2">
          <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-casper-red text-[26px] leading-none text-white shadow-[0_0_22px_-4px_rgba(244,77,96,0.75)] ring-1 ring-white/10">
            👻
          </span>
          <div className="leading-tight">
            <p className="text-[17px] font-semibold tracking-tight">Ghostly247</p>
            <p className="iridescent-text text-[10px] font-semibold uppercase tracking-[0.24em]">
              Admin Panel
            </p>
          </div>
        </div>

        <p className="mb-2 px-3 font-mono text-[9px] uppercase tracking-[0.2em] text-iron-slate/55">
          Menu
        </p>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map((item) => {
            const active =
              item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${
                  active
                    ? "bg-[linear-gradient(90deg,rgba(244,77,96,0.16),rgba(244,77,96,0.04))] text-ghost-white ring-1 ring-casper-red/20"
                    : "text-iron-slate hover:bg-white/[0.04] hover:text-subtle-gray"
                }`}
              >
                <span
                  className={`transition-colors ${
                    active
                      ? "text-casper-red"
                      : "text-iron-slate/70 group-hover:text-subtle-gray"
                  }`}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User card */}
        <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-line bg-panel-2/50 p-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-casper-red/15 text-xs font-semibold text-casper-red ring-1 ring-casper-red/20">
            {initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] font-medium text-subtle-gray" title={email ?? ""}>
              {email}
            </p>
            <p className="text-[10px] text-iron-slate">Administrator</p>
          </div>
          <button
            onClick={logout}
            title="Sign out"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-iron-slate transition hover:bg-white/5 hover:text-casper-red"
          >
            {Icons.logout}
          </button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-8 py-7">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-light tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-iron-slate">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
