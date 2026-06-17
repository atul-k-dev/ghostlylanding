"use client";

import type { ReactNode } from "react";

/** A raised panel — the base surface for every card/section. */
export function Panel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-line bg-[linear-gradient(180deg,#1e1e25_0%,#191920_100%)] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05),0_10px_30px_-18px_rgba(0,0,0,0.8)] ${className}`}
    >
      {children}
    </div>
  );
}

/** Small uppercase label used above values and section titles. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-iron-slate">
      {children}
    </p>
  );
}

const TONE: Record<string, string> = {
  default: "bg-white/5 text-iron-slate border-line",
  pro: "bg-emerald-green/10 text-emerald-green border-emerald-green/25",
  free: "bg-white/5 text-iron-slate border-line",
  success: "bg-emerald-green/10 text-emerald-green border-emerald-green/25",
  fail: "bg-vivid-crimson/10 text-vivid-crimson border-vivid-crimson/25",
  warn: "bg-goldenrod/10 text-goldenrod border-goldenrod/25",
  info: "bg-iridescent-glow/10 text-iridescent-glow border-iridescent-glow/25",
};

export function Badge({
  children,
  tone = "default",
}: {
  children: ReactNode;
  tone?: keyof typeof TONE | string;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
        TONE[tone] ?? TONE.default
      }`}
    >
      {children}
    </span>
  );
}

export function Button({
  children,
  onClick,
  variant = "primary",
  disabled,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const styles: Record<string, string> = {
    primary:
      "bg-ghost-white text-deep-space hover:opacity-90 disabled:opacity-40",
    ghost:
      "border border-line text-subtle-gray hover:bg-white/5 disabled:opacity-40",
    danger:
      "border border-casper-red/40 text-casper-red hover:bg-casper-red/12 disabled:opacity-40",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${styles[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-xs text-iron-slate">
      <span className="h-3 w-3 animate-spin rounded-full border border-iron-slate/30 border-t-casper-red" />
      {label ?? "Loading…"}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="py-12 text-center text-xs text-iron-slate">{children}</div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <Eyebrow>{label}</Eyebrow>
      {children}
    </label>
  );
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-lg border border-line bg-panel-2 px-2.5 py-1.5 text-xs text-subtle-gray outline-none transition focus:border-casper-red/60"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-panel">
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Pagination({
  page,
  limit,
  total,
  onPage,
}: {
  page: number;
  limit: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(total, page * limit);
  return (
    <div className="flex items-center justify-between border-t border-line px-4 py-3 text-xs text-iron-slate">
      <span>
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="rounded-md border border-line px-2 py-1 transition hover:bg-white/5 disabled:opacity-30"
        >
          ← Prev
        </button>
        <span className="tabular-nums">
          {page} / {pages}
        </span>
        <button
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
          className="rounded-md border border-line px-2 py-1 transition hover:bg-white/5 disabled:opacity-30"
        >
          Next →
        </button>
      </div>
    </div>
  );
}

/** Format a major-unit amount as currency, e.g. 1234.5 → "$1,234.50". */
export function formatMoney(amount: number, currency = "usd"): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: amount >= 1000 ? 0 : 2,
    }).format(amount);
  } catch {
    return `${currency.toUpperCase()} ${amount.toLocaleString()}`;
  }
}

/** Relative-time formatter, e.g. "3m ago", "2d ago". */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
