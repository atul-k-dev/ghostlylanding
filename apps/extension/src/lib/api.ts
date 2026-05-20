import type { ApiResponse } from '@casper/shared';
import { getAuth, setAuth } from './storage.js';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

interface FetchOptions {
  method?: 'GET' | 'POST' | 'DELETE' | 'PATCH';
  body?: unknown;
  auth?: boolean;
}

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

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'network_error',
        message: err instanceof Error ? err.message : 'Network unreachable',
      },
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
  return json;
};

export const API_BASE = API_BASE_URL;
