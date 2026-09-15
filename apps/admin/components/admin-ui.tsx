"use client";

import type { ReactNode } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  CircleCheckIcon,
  CircleDashedIcon,
  LoaderCircleIcon,
  TrendingUpIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** A titled card — the base surface for every section. `flush` drops the
 *  content padding so tables and lists run edge to edge. */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  flush = false,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean;
}) {
  const hasHeader = Boolean(title || description || action);
  return (
    <Card className={cn(flush && "gap-0 py-0", className)}>
      {hasHeader && (
        <CardHeader className={cn(flush && "border-b pt-(--card-spacing)")}>
          {title && <CardTitle>{title}</CardTitle>}
          {description && <CardDescription>{description}</CardDescription>}
          {action && <CardAction>{action}</CardAction>}
        </CardHeader>
      )}
      <CardContent className={cn(flush && "px-0")}>{children}</CardContent>
    </Card>
  );
}

/** Edge padding for a table inside a flush SectionCard. */
export const FLUSH_TABLE =
  "[&_td:first-child]:pl-4 [&_th:first-child]:pl-4 [&_td:last-child]:pr-4 [&_th:last-child]:pr-4";

const STAT_COLS = {
  3: "@xl/main:grid-cols-3",
  4: "@xl/main:grid-cols-2 @5xl/main:grid-cols-4",
} as const;

export function StatGrid({ children, columns = 4 }: { children: ReactNode; columns?: 3 | 4 }) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card *:data-[slot=card]:shadow-xs dark:*:data-[slot=card]:bg-card",
        STAT_COLS[columns],
      )}
    >
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon,
  hint,
}: {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
          {typeof value === "number" ? value.toLocaleString() : value}
        </CardTitle>
        {icon && (
          <CardAction>
            <IconTile>{icon}</IconTile>
          </CardAction>
        )}
      </CardHeader>
      {hint && (
        <CardFooter className="flex-col items-start gap-1.5 text-sm text-muted-foreground">
          {hint}
        </CardFooter>
      )}
    </Card>
  );
}

/** "+12 this month ↗" — a count change with its period. */
export function Delta({ value, label }: { value: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn("font-medium tabular-nums", value > 0 && "text-foreground")}>
        {value > 0 ? "+" : ""}
        {value.toLocaleString()}
      </span>
      {label}
      {value > 0 && <TrendingUpIcon className="size-4 text-foreground" />}
    </span>
  );
}

/** Small square frame for an icon. */
export function IconTile({ children }: { children: ReactNode }) {
  return (
    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground [&_svg]:size-4">
      {children}
    </span>
  );
}

export type Tone = "default" | "free" | "pro" | "success" | "fail" | "warn" | "info";

export function StatusBadge({
  tone = "default",
  children,
}: {
  tone?: Tone | (string & {});
  children: ReactNode;
}) {
  switch (tone) {
    case "success":
    case "pro":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <CircleCheckIcon className="fill-green-500 stroke-background dark:fill-green-400" />
          {children}
        </Badge>
      );
    case "fail":
      return <Badge variant="destructive">{children}</Badge>;
    case "warn":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <CircleDashedIcon />
          {children}
        </Badge>
      );
    case "info":
      return <Badge variant="secondary">{children}</Badge>;
    default:
      return (
        <Badge variant="outline" className="text-muted-foreground">
          {children}
        </Badge>
      );
  }
}

/** Label / value line, with the value optionally shown as a status badge. */
export function MetricRow({ label, value, tone }: { label: string; value: number; tone?: Tone }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">{label}</span>
      {tone ? (
        <StatusBadge tone={tone}>{value.toLocaleString()}</StatusBadge>
      ) : (
        <span className="text-sm font-medium tabular-nums">{value.toLocaleString()}</span>
      )}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
      <LoaderCircleIcon className="size-4 animate-spin" />
      {label ?? "Loading…"}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="py-12 text-center text-sm text-muted-foreground">{children}</div>;
}

export function ErrorCard({ children }: { children: ReactNode }) {
  return (
    <Card>
      <CardContent className="text-sm text-destructive">{children}</CardContent>
    </Card>
  );
}

export function FilterSelect({
  value,
  onChange,
  options,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  label: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger size="sm" className="w-40" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
    <div className="flex items-center justify-between gap-4 border-t px-4 py-3">
      <span className="text-sm text-muted-foreground tabular-nums">
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        <span className="mr-2 text-sm font-medium tabular-nums">
          Page {page} of {pages}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          className="hidden sm:flex"
          onClick={() => onPage(1)}
          disabled={page <= 1}
        >
          <span className="sr-only">Go to first page</span>
          <ChevronsLeftIcon />
        </Button>
        <Button variant="outline" size="icon-sm" onClick={() => onPage(page - 1)} disabled={page <= 1}>
          <span className="sr-only">Go to previous page</span>
          <ChevronLeftIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => onPage(page + 1)}
          disabled={page >= pages}
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRightIcon />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          className="hidden sm:flex"
          onClick={() => onPage(pages)}
          disabled={page >= pages}
        >
          <span className="sr-only">Go to last page</span>
          <ChevronsRightIcon />
        </Button>
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
