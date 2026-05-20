/**
 * Casper background service worker.
 * Owns auth state, scheduler alarm, and message routing.
 */
import type {
  ApiResponse,
  User,
  ActionType,
  Platform,
  TonePreset,
} from '@casper/shared';
import { ACTION_TYPES, PLATFORMS, TONE_PRESETS } from '@casper/shared';
import { apiFetch, API_BASE } from '../lib/api.js';
import {
  getAuth,
  setAuth,
  appendDiagnostic,
  type StoredAuth,
} from '../lib/storage.js';
import { installScheduler, handleTick, SCHEDULER_ALARM } from '../scheduler/scheduler.js';
import { enqueue, stats as queueStats } from '../scheduler/queue.js';
import { flushActionLog } from '../scheduler/action-log.js';
import { ensureToday } from '../scheduler/counters.js';
import { getSettings, getTargetState, setTargetState } from '../lib/storage.js';

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
  REQUEST_CODE: handleRequestCode as AsyncHandler<unknown, unknown>,
  VERIFY_CODE: handleVerifyCode as AsyncHandler<unknown, unknown>,
  LOGOUT: handleLogout as AsyncHandler<unknown, unknown>,
  PING: handlePing as AsyncHandler<unknown, unknown>,
  DEV_ENQUEUE_STUB_TASKS: handleEnqueueStub as AsyncHandler<unknown, unknown>,
  FLUSH_ACTION_BUFFER: handleFlush as AsyncHandler<unknown, unknown>,
  GET_QUEUE_STATS: handleQueueStats as AsyncHandler<unknown, unknown>,
  ENSURE_COUNTERS: handleEnsureCounters as AsyncHandler<unknown, unknown>,
  SCAN_TARGET_NOW: handleScanTargetNow as AsyncHandler<unknown, unknown>,
  SCAN_FOLLOWERS_NOW: handleScanFollowersNow as AsyncHandler<unknown, unknown>,
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

async function handleRequestCode(payload: unknown) {
  const { email } = (payload ?? {}) as { email?: string };
  if (!email || typeof email !== 'string') {
    return { type: 'CODE_SENT', payload: { sent: false, error: 'invalid_email' } };
  }
  const resp = await apiFetch<{
    sent: boolean;
    via: string;
    ttlMinutes: number;
    devCode?: string;
  }>('/api/auth/request-code', { method: 'POST', body: { email }, auth: false });
  if (!resp.ok) {
    if (resp.error.code === 'rate_limited') {
      await appendDiagnostic({
        kind: 'rate_limited',
        context: 'request-code',
        detail: resp.error.message,
      });
    }
    return { type: 'CODE_SENT', payload: { sent: false, error: resp.error.message } };
  }
  return { type: 'CODE_SENT', payload: resp.data };
}

async function handleVerifyCode(payload: unknown) {
  const { email, code } = (payload ?? {}) as { email?: unknown; code?: unknown };
  if (typeof email !== 'string' || typeof code !== 'string') {
    return { type: 'CODE_VERIFIED', payload: { ok: false, error: 'invalid_payload' } };
  }
  const resp = await apiFetch<{ token: string; user: User }>(
    '/api/auth/verify-code',
    { method: 'POST', body: { email, code }, auth: false },
  );
  if (!resp.ok) {
    if (resp.error.code === 'invalid' || resp.error.code === 'expired' || resp.error.code === 'locked') {
      await appendDiagnostic({
        kind: 'auth_failure',
        context: 'verify-code',
        detail: resp.error.message,
      });
    }
    return { type: 'CODE_VERIFIED', payload: { ok: false, error: resp.error.message } };
  }
  const stored: StoredAuth = {
    token: resp.data.token,
    user: resp.data.user,
    savedAt: new Date().toISOString(),
  };
  await setAuth(stored);
  console.log('[casper] auth stored for', stored.user.email);
  return { type: 'CODE_VERIFIED', payload: { ok: true } };
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

async function handleEnqueueStub(payload: unknown) {
  const { count = 10 } = (payload ?? {}) as { count?: number };
  const safeCount = Math.max(1, Math.min(50, Math.floor(count)));
  const platforms: Platform[] = [...PLATFORMS];
  const actions: ActionType[] = [...ACTION_TYPES];
  const enqueued: string[] = [];
  for (let i = 0; i < safeCount; i++) {
    const platform = platforms[i % platforms.length]!;
    const action = actions[i % actions.length]!;
    const task = await enqueue(platform, action, {
      targetHandle: `@stub_user_${i}`,
      seed: i,
    });
    enqueued.push(task.id);
  }
  return { ok: true, data: { enqueued: enqueued.length } };
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
  if (!plan || !['monthly', 'quarterly', 'annual'].includes(plan)) {
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
