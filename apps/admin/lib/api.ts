"use client";

import { getToken, clearSession } from "./auth";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

/** Authenticated fetch against the Ghostly247 server. Returns the unwrapped
 *  { ok, data } | { ok, error } envelope. On 401/403 it clears the session. */
export async function api<T>(
  path: string,
  opts: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: opts.method ?? "GET",
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    return { ok: false, error: { code: "network_error", message: "Cannot reach the server" } };
  }

  if (res.status === 401 || res.status === 403) {
    if (typeof window !== "undefined") clearSession();
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return { ok: false, error: { code: "bad_response", message: `HTTP ${res.status}` } };
  }
  return json as ApiResult<T>;
}

/** POST /api/auth/login — returns the JWT + user (with isAdmin). */
export async function login(
  email: string,
  password: string,
): Promise<ApiResult<{ token: string; user: AdminUser }>> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  }).catch(() => null);
  if (!res) return { ok: false, error: { code: "network_error", message: "Cannot reach the server" } };
  const json = (await res.json().catch(() => null)) as
    | ApiResult<{ token: string; user: AdminUser }>
    | null;
  if (!json) return { ok: false, error: { code: "bad_response", message: `HTTP ${res.status}` } };
  return json;
}

// ---- Shared response shapes (mirror the server's admin DTOs) --------------

export interface AdminUser {
  id: string;
  email: string;
  isAdmin?: boolean;
  subscriptionStatus?: string;
}

export type Platform = "twitter" | "linkedin";
export type ActionType = "like" | "comment" | "follow";

export interface Stats {
  users: {
    total: number;
    pro: number;
    free: number;
    admins: number;
    newToday: number;
    newLast7d: number;
    newLast30d: number;
  };
  actions: {
    total: number;
    today: number;
    last7d: number;
    byType: Record<ActionType, number>;
    successRate: number;
  };
  drafts: { total: number; pending: number; posted: number };
}

export interface TimeseriesDay {
  date: string;
  like: number;
  comment: number;
  follow: number;
  actions: number;
  signups: number;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  isBanned: boolean;
  subscriptionStatus: string;
  subscriptionPlan: string;
  isPro: boolean;
  lifetimeActionCount: number;
  createdAt: string;
}

export interface UserComment {
  id: string;
  platform: Platform;
  postUrl: string;
  draftText: string;
  tone: string;
  status: string;
  createdAt: string;
}

export interface UserDetail {
  user: UserRow & { currentPeriodEnd: string | null; keywords: string[] };
  actionCounts: Record<ActionType, number>;
  recentActions: ActionRow[];
  recentComments: UserComment[];
}

export interface ActionRow {
  id: string;
  user?: { id: string; email: string; name: string } | null;
  platform: Platform;
  actionType: ActionType;
  targetUrl: string;
  targetHandle: string | null;
  success: boolean;
  errorMessage: string | null;
  timestamp: string;
}

export interface DraftRow {
  id: string;
  user: { id: string; email: string } | null;
  platform: Platform;
  postUrl: string;
  draftText: string;
  tone: string;
  status: string;
  createdAt: string;
}

export interface RevenuePayment {
  id: string;
  amount: number;
  currency: string;
  email: string | null;
  created: string;
  status: string;
  refunded: boolean;
}

export interface RevenueOverview {
  configured: boolean;
  currency: string;
  mrr: number;
  arpu: number;
  subscriptions: { active: number; trialing: number; pastDue: number; total: number };
  revenue: { today: number; last7d: number; last30d: number; lifetime: number };
  timeseries: { date: string; amount: number }[];
  recentPayments: RevenuePayment[];
}

export interface HealthIssue {
  kind: string;
  context: string;
  count: number;
  /** Distinct users hit — the number that separates an outage from one bad browser. */
  affectedUsers: number;
  /** Same measure over the preceding window of equal length. */
  previousCount: number;
  lastAt: string;
}

export interface HealthResponse {
  hours: number;
  since: string;
  byKind: Record<string, number>;
  issues: HealthIssue[];
  selectorConfig: {
    version: string;
    overrideCount: number;
    overrides: Record<string, string>;
  };
}

export interface UsersResponse {
  users: UserRow[];
  total: number;
  page: number;
  limit: number;
}
export interface ActionsResponse {
  actions: ActionRow[];
  total: number;
  page: number;
  limit: number;
}
export interface DraftsResponse {
  drafts: DraftRow[];
  total: number;
  page: number;
  limit: number;
}
