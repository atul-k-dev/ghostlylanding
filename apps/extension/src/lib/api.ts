import type { ApiResponse } from '@casper/shared';
import { getAuth, setAuth, appendDiagnostic } from './storage.js';

// `import.meta.env` is injected by Vite at build time and is undefined when this
// module is loaded by plain Node (the smoke scripts), so read it defensively.
const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL ?? 'http://localhost:4000';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'DELETE' | 'PATCH';
  body?: unknown;
  auth?: boolean;
  /**
   * Attempts for transient failures (network blips, 502/503/504). Defaults to 3
   * for GETs and 1 for writes.
   *
   * Writes are NOT retried by default because most of ours aren't safe to
   * repeat blindly. `/api/actions/log` is the exception — it carries a per-entry
   * dedupe key — so it opts in explicitly.
   */
  retries?: number;
  /** Don't record a network failure in Diagnostics — for background syncs
   *  where being offline is expected and nothing is lost. */
  quiet?: boolean;
}

const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Worth trying again? Only server-side transients and network failures. */
const isTransient = (status: number): boolean =>
  status === 408 || status === 429 || status === 502 || status === 503 || status === 504;

/** Exponential backoff with jitter, so retries from many installs don't align. */
const backoffMs = (attempt: number): number =>
  Math.round(400 * 2 ** (attempt - 1) * (0.75 + Math.random() * 0.5));

/**
 * Single HTTP entrypoint for the extension. Attaches Bearer JWT when auth=true
 * and auto-clears local auth on 401 so the popup can re-prompt for login.
 */
export const apiFetch = async <T>(path: string, opts: FetchOptions = {}): Promise<ApiResponse<T>> => {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (opts.auth !== false) {
    const auth = await getAuth();
    if (auth) headers.authorization = `Bearer ${auth.token}`;
  }

  const method = opts.method ?? 'GET';
  const attempts = Math.max(1, opts.retries ?? (method === 'GET' ? 3 : 1));

  let res: Response | null = null;
  let lastNetworkError = 'Network unreachable';

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      res = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers,
        body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      });
      // A transient server error is worth another go; anything else — including
      // every 4xx — is the server's real answer and must not be repeated.
      if (!isTransient(res.status) || attempt === attempts) break;
    } catch (err) {
      lastNetworkError = err instanceof Error ? err.message : 'Network unreachable';
      res = null;
      if (attempt === attempts) break;
    }
    await sleep(backoffMs(attempt));
  }

  if (!res) {
    // Only report once the retries are spent, so one flaky moment doesn't
    // produce three diagnostics for a single logical failure.
    if (!opts.quiet) void appendDiagnostic({ kind: 'network_error', context: path, detail: lastNetworkError });
    return {
      ok: false,
      error: { code: 'network_error', message: lastNetworkError },
    };
  }

  let json: ApiResponse<T>;
  try {
    json = (await res.json()) as ApiResponse<T>;
  } catch {
    return {
      ok: false,
      error: { code: 'invalid_response', message: `Non-JSON response (status ${res.status})` },
    };
  }

  if (res.status === 401) {
    await setAuth(null);
  }
  if (
    res.status === 404 &&
    !json.ok &&
    json.error.code === 'user_not_found'
  ) {
    // Server says this JWT's user is gone — force re-login.
    await setAuth(null);
  }
  return json;
};

export const API_BASE = API_BASE_URL;
