/**
 * Casper background service worker.
 * Owns auth state, scheduler alarm, and message routing.
 */
import type {
  ApiResponse,
  User,
  Platform,
  TonePreset,
} from '@casper/shared';
import { PLATFORMS, TONE_PRESETS } from '@casper/shared';
import { apiFetch, API_BASE } from '../lib/api.js';
import {
  getAuth,
  setAuth,
  appendDiagnostic,
  type StoredAuth,
} from '../lib/storage.js';
import { installScheduler, handleTick, SCHEDULER_ALARM } from '../scheduler/scheduler.js';
import { fetchGoogleIdToken } from './google-signin.js';
import { enqueue, stats as queueStats } from '../scheduler/queue.js';
import { flushActionLog } from '../scheduler/action-log.js';
import { ensureToday } from '../scheduler/counters.js';
import { getSettings, getTargetState, setTargetState, setQueue } from '../lib/storage.js';

const BUILD_STAMP = 'casper-build-2026-06-05-homefeed-v2';
console.log(`[casper] service worker booted — ${BUILD_STAMP}`);

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[casper] installed', details.reason);
  void installScheduler();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[casper] startup');
  void installScheduler();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SCHEDULER_ALARM) {
    void handleTick();
  }
});

// Install on initial SW boot too (some lifecycles skip onInstalled).
void installScheduler();

interface AsyncHandler<Req, Resp> {
  (payload: Req): Promise<Resp>;
}

const asyncHandlers: Record<string, AsyncHandler<unknown, unknown>> = {
  GET_AUTH: handleGetAuth as AsyncHandler<unknown, unknown>,
  SIGNUP: handleSignup as AsyncHandler<unknown, unknown>,
  LOGIN: handleLogin as AsyncHandler<unknown, unknown>,
  GOOGLE_LOGIN: handleGoogleLogin as AsyncHandler<unknown, unknown>,
  FORGOT_PASSWORD: handleForgotPassword as AsyncHandler<unknown, unknown>,
  RESET_PASSWORD: handleResetPassword as AsyncHandler<unknown, unknown>,
  LOGOUT: handleLogout as AsyncHandler<unknown, unknown>,
  PING: handlePing as AsyncHandler<unknown, unknown>,
  CLEAR_QUEUE: handleClearQueue as AsyncHandler<unknown, unknown>,
  FLUSH_ACTION_BUFFER: handleFlush as AsyncHandler<unknown, unknown>,
  GET_QUEUE_STATS: handleQueueStats as AsyncHandler<unknown, unknown>,
  ENSURE_COUNTERS: handleEnsureCounters as AsyncHandler<unknown, unknown>,
  SCAN_TARGET_NOW: handleScanTargetNow as AsyncHandler<unknown, unknown>,
  SCAN_FOLLOWERS_NOW: handleScanFollowersNow as AsyncHandler<unknown, unknown>,
  SCAN_HOME_NOW: handleScanHomeNow as AsyncHandler<unknown, unknown>,
  DRAFT_COMMENT: handleDraftComment as AsyncHandler<unknown, unknown>,
  LIST_DRAFTS: handleListDrafts as AsyncHandler<unknown, unknown>,
  APPROVE_DRAFT: handleApproveDraft as AsyncHandler<unknown, unknown>,
  REJECT_DRAFT: handleRejectDraft as AsyncHandler<unknown, unknown>,
  LIST_ACTION_LOG: handleListActionLog as AsyncHandler<unknown, unknown>,
  DELETE_ACCOUNT: handleDeleteAccount as AsyncHandler<unknown, unknown>,
  REFRESH_ME: handleRefreshMe as AsyncHandler<unknown, unknown>,
  START_CHECKOUT: handleStartCheckout as AsyncHandler<unknown, unknown>,
  OPEN_BILLING_PORTAL: handleOpenBillingPortal as AsyncHandler<unknown, unknown>,
};

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
    sendResponse({ ok: false, error: 'invalid_message' });
    return false;
  }
  const handler = asyncHandlers[message.type];
  if (!handler) {
    sendResponse({ ok: false, error: 'unknown_message_type' });
    return false;
  }
  handler(message.payload)
    .then(sendResponse)
    .catch((err) => {
      console.error('[casper] handler error', err);
      sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
    });
  return true;
});

async function handleGetAuth(): Promise<{
  type: 'AUTH_STATE';
  payload: { authenticated: boolean; user: User | null };
}> {
  const auth = await getAuth();
  return {
    type: 'AUTH_STATE',
    payload: { authenticated: auth !== null, user: auth?.user ?? null },
  };
}

const storeAuth = async (data: { token: string; user: User }): Promise<void> => {
  const stored: StoredAuth = {
    token: data.token,
    user: data.user,
    savedAt: new Date().toISOString(),
  };
  await setAuth(stored);
  console.log('[casper] auth stored for', stored.user.email);
};

const authResult = (resp: { ok: false; error: { code: string; message: string } }) => {
  if (
    resp.error.code === 'rate_limited' ||
    resp.error.code === 'invalid_credentials' ||
    resp.error.code === 'invalid_google_token'
  ) {
    void appendDiagnostic({
      kind: 'auth_failure',
      context: 'auth',
      detail: resp.error.message,
    });
  }
  return {
    type: 'AUTH_RESULT',
    payload: { ok: false, error: resp.error.message, errorCode: resp.error.code },
  };
};

async function handleSignup(payload: unknown) {
  const { name, email, password } = (payload ?? {}) as {
    name?: unknown;
    email?: unknown;
    password?: unknown;
  };
  if (typeof name !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return { type: 'AUTH_RESULT', payload: { ok: false, error: 'invalid_payload' } };
  }
  const resp = await apiFetch<{ token: string; user: User }>('/api/auth/signup', {
    method: 'POST',
    body: { name, email, password },
    auth: false,
  });
  if (!resp.ok) return authResult(resp);
  await storeAuth(resp.data);
  return { type: 'AUTH_RESULT', payload: { ok: true } };
}

async function handleLogin(payload: unknown) {
  const { email, password } = (payload ?? {}) as { email?: unknown; password?: unknown };
  if (typeof email !== 'string' || typeof password !== 'string') {
    return { type: 'AUTH_RESULT', payload: { ok: false, error: 'invalid_payload' } };
  }
  const resp = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  if (!resp.ok) return authResult(resp);
  await storeAuth(resp.data);
  return { type: 'AUTH_RESULT', payload: { ok: true } };
}

async function handleGoogleLogin() {
  let idToken: string;
  try {
    idToken = await fetchGoogleIdToken();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Google sign-in failed';
    await appendDiagnostic({ kind: 'auth_failure', context: 'google', detail: message });
    return { type: 'AUTH_RESULT', payload: { ok: false, error: message } };
  }
  const resp = await apiFetch<{ token: string; user: User }>('/api/auth/google', {
    method: 'POST',
    body: { idToken },
    auth: false,
  });
  if (!resp.ok) return authResult(resp);
  await storeAuth(resp.data);
  return { type: 'AUTH_RESULT', payload: { ok: true } };
}

async function handleForgotPassword(payload: unknown) {
  const { email } = (payload ?? {}) as { email?: unknown };
  if (typeof email !== 'string') {
    return { type: 'RESET_RESULT', payload: { ok: false, error: 'invalid_payload' } };
  }
  const resp = await apiFetch<{ sent: boolean; ttlMinutes: number }>(
    '/api/auth/forgot-password',
    { method: 'POST', body: { email }, auth: false },
  );
  if (!resp.ok) {
    return { type: 'RESET_RESULT', payload: { ok: false, error: resp.error.message } };
  }
  return { type: 'RESET_RESULT', payload: { ok: true, ttlMinutes: resp.data.ttlMinutes } };
}

async function handleResetPassword(payload: unknown) {
  const { email, code, password } = (payload ?? {}) as {
    email?: unknown;
    code?: unknown;
    password?: unknown;
  };
  if (typeof email !== 'string' || typeof code !== 'string' || typeof password !== 'string') {
    return { type: 'AUTH_RESULT', payload: { ok: false, error: 'invalid_payload' } };
  }
  const resp = await apiFetch<{ token: string; user: User }>('/api/auth/reset-password', {
    method: 'POST',
    body: { email, code, password },
    auth: false,
  });
  if (!resp.ok) return authResult(resp);
  await storeAuth(resp.data);
  return { type: 'AUTH_RESULT', payload: { ok: true } };
}

async function handleLogout() {
  await setAuth(null);
  return { type: 'LOGGED_OUT', payload: {} };
}

async function handlePing() {
  let apiOk = false;
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    const body = (await res.json()) as ApiResponse<unknown>;
    apiOk = body.ok === true;
  } catch {
    apiOk = false;
  }
  return { type: 'PONG', payload: { apiOk, timestamp: new Date().toISOString() } };
}

async function handleClearQueue() {
  const before = await queueStats();
  await setQueue([]);
  return { ok: true, data: { cleared: before.pending + before.running } };
}

async function handleFlush() {
  const r = await flushActionLog();
  return { ok: true, data: r };
}

async function handleQueueStats() {
  const stats = await queueStats();
  return { ok: true, data: stats };
}

async function handleEnsureCounters() {
  const settings = await getSettings();
  const counters = await ensureToday(settings);
  return { ok: true, data: counters };
}

interface DraftDoc {
  id: string;
  platform: Platform;
  postUrl: string;
  draftText: string;
  tone: TonePreset;
  status: 'pending' | 'approved' | 'rejected' | 'posted' | 'failed';
  createdAt: string;
  postedAt?: string | null;
  dedupe?: boolean;
}

async function handleDraftComment(payload: unknown) {
  const { platform, postText, postUrl } = (payload ?? {}) as {
    platform?: Platform;
    postText?: string;
    postUrl?: string;
  };
  if (!platform || !PLATFORMS.includes(platform) || !postText || !postUrl) {
    return { ok: false, error: { code: 'invalid_payload', message: 'platform/postText/postUrl required' } };
  }
  const settings = await getSettings();
  const tone: TonePreset = TONE_PRESETS.includes(settings.tone) ? settings.tone : 'friendly';
  const resp = await apiFetch<DraftDoc>('/api/comments/generate', {
    method: 'POST',
    body: { platform, postText, postUrl, tone },
  });
  return resp;
}

async function handleListDrafts(payload: unknown) {
  const { status } = (payload ?? {}) as { status?: string };
  const query = status ? `?status=${encodeURIComponent(status)}` : '';
  const resp = await apiFetch<{ drafts: DraftDoc[] }>(`/api/comments/drafts${query}`);
  return resp;
}

async function handleApproveDraft(payload: unknown) {
  const { id } = (payload ?? {}) as { id?: string };
  if (!id) return { ok: false, error: { code: 'missing_id', message: 'id required' } };
  // Fetch the draft to get postUrl + text
  const list = await apiFetch<{ drafts: DraftDoc[] }>(`/api/comments/drafts?status=pending`);
  if (!list.ok) return list;
  const draft = list.data.drafts.find((d) => d.id === id);
  if (!draft) {
    return { ok: false, error: { code: 'draft_not_found', message: 'No such pending draft' } };
  }
  const transition = await apiFetch<{ id: string; status: string }>(
    `/api/comments/drafts/${encodeURIComponent(id)}/approve`,
    { method: 'POST' },
  );
  if (!transition.ok) return transition;
  const task = await enqueue(draft.platform, 'comment', {
    draftId: id,
    postUrl: draft.postUrl,
    commentText: draft.draftText,
  });
  return { ok: true, data: { taskId: task.id } };
}

async function handleRejectDraft(payload: unknown) {
  const { id } = (payload ?? {}) as { id?: string };
  if (!id) return { ok: false, error: { code: 'missing_id', message: 'id required' } };
  return await apiFetch(
    `/api/comments/drafts/${encodeURIComponent(id)}/reject`,
    { method: 'POST' },
  );
}

async function handleScanTargetNow(payload: unknown) {
  const { platform, handle } = (payload ?? {}) as { platform?: Platform; handle?: string };
  if (!platform || !PLATFORMS.includes(platform) || !handle || typeof handle !== 'string') {
    return { ok: false, error: 'invalid_payload' };
  }
  const state = await getTargetState();
  const key = `${platform}:${handle.replace(/^@/, '')}`;
  const existing = state[key];
  if (existing) {
    existing.lastScannedAt = 0;
    state[key] = existing;
    await setTargetState(state);
  }
  const task = await enqueue(platform, 'scan-profile-likes', { handle });
  return { ok: true, data: { taskId: task.id } };
}

async function handleRefreshMe() {
  const resp = await apiFetch<User>('/api/me');
  if (resp.ok) {
    const current = await getAuth();
    if (current) {
      await setAuth({ ...current, user: resp.data });
    }
  }
  return resp;
}

async function handleStartCheckout(payload: unknown) {
  const { plan } = (payload ?? {}) as { plan?: string };
  if (!plan || !['monthly'].includes(plan)) {
    return { ok: false, error: { code: 'invalid_plan', message: 'plan required' } };
  }
  const resp = await apiFetch<{ url: string; sessionId: string }>(
    '/api/billing/checkout-session',
    { method: 'POST', body: { plan } },
  );
  if (resp.ok) {
    await chrome.tabs.create({ url: resp.data.url, active: true });
  }
  return resp;
}

async function handleOpenBillingPortal() {
  const resp = await apiFetch<{ url: string }>('/api/billing/portal', { method: 'POST' });
  if (resp.ok) {
    await chrome.tabs.create({ url: resp.data.url, active: true });
  }
  return resp;
}

async function handleListActionLog(payload: unknown) {
  const { limit = 50 } = (payload ?? {}) as { limit?: number };
  return await apiFetch(`/api/actions/log?limit=${limit}`);
}

async function handleDeleteAccount() {
  // Flush any buffered logs first so we don't lose history on the server
  try {
    await flushActionLog();
  } catch {
    /* best-effort */
  }
  const resp = await apiFetch('/api/account', { method: 'DELETE' });
  if (resp.ok) {
    // Wipe ALL local Casper state.
    await chrome.storage.local.clear();
  }
  return resp;
}

async function handleScanHomeNow(payload: unknown) {
  const { platform } = (payload ?? {}) as { platform?: Platform };
  if (!platform || !PLATFORMS.includes(platform)) {
    return { ok: false, error: 'invalid_payload' };
  }
  // Reset the home-scan cooldown so the refill loop / this call runs immediately.
  const state = await getTargetState();
  const key = `home:${platform}`;
  state[key] = { ...(state[key] ?? { lastScannedAt: 0 }), lastHomeScanAt: 0 };
  await setTargetState(state);
  const task = await enqueue(platform, 'scan-home-feed', {});
  return { ok: true, data: { taskId: task.id } };
}

async function handleScanFollowersNow(payload: unknown) {
  const { platform, handle } = (payload ?? {}) as { platform?: Platform; handle?: string };
  if (!platform || !PLATFORMS.includes(platform) || !handle || typeof handle !== 'string') {
    return { ok: false, error: 'invalid_payload' };
  }
  const state = await getTargetState();
  const key = `${platform}:${handle.replace(/^@/, '')}`;
  const existing = state[key];
  if (existing) {
    existing.lastFollowScanAt = 0;
    state[key] = existing;
    await setTargetState(state);
  }
  const task = await enqueue(platform, 'scan-profile-followers', { handle });
  return { ok: true, data: { taskId: task.id } };
}

export {};
