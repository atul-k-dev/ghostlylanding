/**
 * Casper background service worker.
 * Owns auth state, scheduler alarm, and message routing.
 */
import type { ApiResponse, User, ActionType, Platform } from '@casper/shared';
import { ACTION_TYPES, PLATFORMS } from '@casper/shared';
import { apiFetch, API_BASE } from '../lib/api.js';
import { getAuth, setAuth, type StoredAuth } from '../lib/storage.js';
import { installScheduler, handleTick, SCHEDULER_ALARM } from '../scheduler/scheduler.js';
import { enqueue, stats as queueStats } from '../scheduler/queue.js';
import { flushActionLog } from '../scheduler/action-log.js';
import { ensureToday } from '../scheduler/counters.js';
import { getSettings } from '../lib/storage.js';

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
  REQUEST_MAGIC_LINK: handleRequestMagicLink as AsyncHandler<unknown, unknown>,
  AUTH_FROM_WEB: handleAuthFromWeb as AsyncHandler<unknown, unknown>,
  LOGOUT: handleLogout as AsyncHandler<unknown, unknown>,
  PING: handlePing as AsyncHandler<unknown, unknown>,
  DEV_ENQUEUE_STUB_TASKS: handleEnqueueStub as AsyncHandler<unknown, unknown>,
  FLUSH_ACTION_BUFFER: handleFlush as AsyncHandler<unknown, unknown>,
  GET_QUEUE_STATS: handleQueueStats as AsyncHandler<unknown, unknown>,
  ENSURE_COUNTERS: handleEnsureCounters as AsyncHandler<unknown, unknown>,
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

async function handleRequestMagicLink(payload: unknown) {
  const { email } = (payload ?? {}) as { email?: string };
  if (!email || typeof email !== 'string') {
    return { type: 'MAGIC_LINK_SENT', payload: { sent: false, error: 'invalid_email' } };
  }
  const resp = await apiFetch<{ sent: boolean; via: string; devVerifyUrl?: string }>(
    '/api/auth/request-magic-link',
    { method: 'POST', body: { email }, auth: false },
  );
  if (!resp.ok) {
    return { type: 'MAGIC_LINK_SENT', payload: { sent: false, error: resp.error.message } };
  }
  return { type: 'MAGIC_LINK_SENT', payload: resp.data };
}

async function handleAuthFromWeb(payload: unknown) {
  const { token, user } = (payload ?? {}) as { token?: unknown; user?: unknown };
  if (typeof token !== 'string' || typeof user !== 'object' || user === null) {
    return { ok: false, error: 'invalid_payload' };
  }
  const stored: StoredAuth = {
    token,
    user: user as User,
    savedAt: new Date().toISOString(),
  };
  await setAuth(stored);
  console.log('[casper] auth stored for', stored.user.email);
  return { ok: true };
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

export {};
