/**
 * Ghostly247 background service worker.
 * Owns auth state, scheduler alarm, and message routing.
 */
import type {
  ApiResponse,
  User,
  Platform,
  TonePreset,
  ActionType,
  ExtensionSettings,
  SafetyPresetName,
} from '@casper/shared';
import {
  PLATFORMS,
  ACTION_TYPES,
  TONE_PRESETS,
  PAID_PLANS,
  VOICE_LIMITS,
  isPro,
  bumpMonthly,
  monthlyActionsUsed,
  FREE_TIER,
} from '@casper/shared';
import type { PendingReply } from '@casper/shared';
import { apiFetch, API_BASE } from '../lib/api.js';
import {
  getAuth,
  setAuth,
  appendDiagnostic,
  markLiked,
  markCommented,
  markDrafted,
  markFollowed,
  markQuoted,
  getPendingReplies,
  queuePendingReply,
  takePendingReply,
  getOwnHandle,
  setOwnHandle,
  type StoredAuth,
} from '../lib/storage.js';
import {
  installScheduler,
  handleTick,
  runGrowthScanNow,
  SCHEDULER_ALARM,
} from '../scheduler/scheduler.js';
import { fetchGoogleIdToken } from './google-signin.js';
import { driveTab } from '../platforms/common/tab-driver.js';
import { readAccountForSetup, getSetupRead } from './setup-read.js';
import { runDryRun } from '../scheduler/dry-run.js';
import { mostDistinctiveTerm } from '../lib/topics.js';
import { appendRejectedDraft, appendCorrectedDraft } from '../lib/storage.js';
import { requestCommentDraft } from '../lib/comment-draft.js';
import { refreshSelectorConfig, SELECTOR_REFRESH_MS } from '../lib/selector-config.js';
import { enqueue, stats as queueStats } from '../scheduler/queue.js';
import { flushActionLog, appendActionLog } from '../scheduler/action-log.js';
import { ensureToday, incrementCounter, incrementSearchCounter, isUnderCap } from '../scheduler/counters.js';
import { canActNow } from '../scheduler/rate-limit.js';
import {
  getSettings,
  setSettings,
  getTargetState,
  setTargetState,
  setQueue,
  getSchedulerState,
  setSchedulerState,
  getScheduledPosts,
  setScheduledPosts,
  getPostOutcomes,
  MAX_SCHEDULED_POSTS,
  tweetLimitFor,
  effectivePostLength,
  appendGrowthMilestone,
  getStandingInstructions,
  addStandingInstruction,
  removeStandingInstruction,
  getVoiceTuneState,
  setVoiceTuneState,
  getCorrectedDrafts,
  type ScheduledPost,
} from '../lib/storage.js';
import { applyPreset } from '../lib/presets.js';
import { decideVoiceTune } from '../lib/voice-tune.js';
import {
  bestTimes,
  describeSlot,
  scoreGrid,
  MIN_DAYS as BEST_TIMES_MIN_DAYS,
} from '../lib/best-times.js';
import {
  recordApproval,
  answerOffer,
  revokeTrust,
  hasOpenOffer,
  isTrusted,
  normalizeTrust,
} from '../lib/trust.js';
import { maybeAutoDraft } from '../scheduler/auto-posting.js';
import { requestPostIdeas } from '../lib/ideas.js';

const BUILD_STAMP = 'casper-build-2026-06-05-homefeed-v2';
console.log(`[casper] service worker booted — ${BUILD_STAMP}`);

/**
 * Make a toolbar-icon click open the side panel. There is no `default_popup`
 * any more (updateplan 1.1), so without this the icon does nothing at all.
 *
 * Called from onInstalled AND from the SW boot below, because some service
 * worker lifecycles never fire onInstalled — the same reason installScheduler
 * is called twice. It is idempotent.
 */
const installSidePanelBehavior = async (): Promise<void> => {
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch (err) {
    // Older Chrome without sidePanel support: the extension still runs headless
    // (the scheduler is what does the work), so log it rather than throwing and
    // taking the whole service worker down with it.
    console.warn('[casper] side panel behavior not set —', err);
  }
};

/**
 * Recompute (and, if it differs, re-persist) today's effective caps on every
 * boot. `ensureToday` freezes the day's caps in storage so they don't drift
 * hour to hour — correct — but that used to mean a same-day fix to the ramp
 * math, or a preset switch, sat invisibly in storage until local midnight,
 * because nothing ever re-ran the computation for a day that already had a
 * counter. Reloading the extension (exactly what happens after installing a
 * new build) restarts the service worker, so doing it here means a fix like
 * D17 reaches the UI on the very next load — not tomorrow — whether or not
 * the engine happens to be Active.
 */
const refreshTodaysCaps = async (): Promise<void> => {
  try {
    await ensureToday(await getSettings());
  } catch (err) {
    console.warn('[casper] could not refresh today\'s caps on boot —', err);
  }
};

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[casper] installed', details.reason);
  void installScheduler();
  void installSidePanelBehavior();
  void refreshTodaysCaps();
});

chrome.runtime.onStartup.addListener(() => {
  console.log('[casper] startup');
  void installScheduler();
  void installSidePanelBehavior();
  void refreshTodaysCaps();
});

const SELECTOR_ALARM = 'casper.selectors.refresh';

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === SCHEDULER_ALARM) {
    void handleTick();
    // Weekly, gated internally — cheap to check every 30s (updateplan 6.3).
    void runVoiceTuneIfDue();
  }
  if (alarm.name === SELECTOR_ALARM) {
    void refreshSelectorConfig().catch(() => {
      /* stale config is fine — the bundled selectors still work */
    });
  }
});

/**
 * Keep the remote selector map fresh: once on every service-worker boot (so a
 * fix reaches a user the moment their browser wakes up) and every few hours
 * after that. Failures are ignored — the bundled selectors are the floor.
 */
const installSelectorRefresh = async (): Promise<void> => {
  void refreshSelectorConfig().catch(() => undefined);
  const existing = await chrome.alarms.get(SELECTOR_ALARM);
  if (!existing) {
    const periodInMinutes = SELECTOR_REFRESH_MS / 60_000;
    await chrome.alarms.create(SELECTOR_ALARM, { delayInMinutes: periodInMinutes, periodInMinutes });
  }
};

/** The server's Stripe success_url path (e.g. http://localhost:4000/r/success). */
const CHECKOUT_SUCCESS_PATH = '/r/success';
/** Guards against onUpdated firing twice for the same tab navigation. */
const finishingCheckout = new Set<number>();

/**
 * After payment, Stripe redirects the checkout tab to `/r/success` — a server
 * page, not the extension. We watch for that and bring the user back: pull the
 * (now Pro) user, close the dead tab, and pop the extension open.
 *
 * Registered at the TOP LEVEL on purpose: filling out the Stripe form can take
 * minutes, which lets Chrome evict the service worker. Top-level listeners are
 * re-registered on SW restart and wake the worker for their event — a listener
 * added later (inside a handler) would be lost and never fire. `changeInfo.url`
 * is delivered because the API origin is in host_permissions (for apiFetch).
 */
chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.url && changeInfo.url.includes(CHECKOUT_SUCCESS_PATH)) {
    console.log('[casper] checkout success detected via tabs.onUpdated', tabId);
    void finishCheckout(tabId, sessionIdFromUrl(changeInfo.url));
  }
});

/** Pull Stripe's `session_id` out of the /r/success URL (used to confirm Pro). */
const sessionIdFromUrl = (url: string): string | undefined => {
  try {
    return new URL(url).searchParams.get('session_id') ?? undefined;
  } catch {
    return undefined;
  }
};

// Install on initial SW boot too (some lifecycles skip onInstalled).
void installScheduler();
void refreshTodaysCaps();
void installSelectorRefresh();
void installSidePanelBehavior();

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
  SCAN_SEARCH_NOW: handleScanSearchNow as AsyncHandler<unknown, unknown>,
  FOLLOW_BACK_NOW: handleFollowBackNow as AsyncHandler<unknown, unknown>,
  RECORD_ACTION: handleRecordAction as AsyncHandler<unknown, unknown>,
  CAN_REPLY: handleCanReply as AsyncHandler<unknown, unknown>,
  RECORD_CORRECTION: handleRecordCorrection as AsyncHandler<unknown, unknown>,
  UPDATE_PREFERENCES: handleUpdatePreferences as AsyncHandler<unknown, unknown>,
  DRAFT_COMMENT: handleDraftComment as AsyncHandler<unknown, unknown>,
  GENERATE_POST: handleGeneratePost as AsyncHandler<unknown, unknown>,
  GENERATE_IDEAS: handleGenerateIdeas as AsyncHandler<unknown, unknown>,
  LIST_SCHEDULED_POSTS: handleListScheduledPosts as AsyncHandler<unknown, unknown>,
  SCHEDULE_POST: handleSchedulePost as AsyncHandler<unknown, unknown>,
  DELETE_SCHEDULED_POST: handleDeleteScheduledPost as AsyncHandler<unknown, unknown>,
  LIST_DRAFTS: handleListDrafts as AsyncHandler<unknown, unknown>,
  APPROVE_DRAFT: handleApproveDraft as AsyncHandler<unknown, unknown>,
  REJECT_DRAFT: handleRejectDraft as AsyncHandler<unknown, unknown>,
  LIST_ACTION_LOG: handleListActionLog as AsyncHandler<unknown, unknown>,
  GET_GROWTH: handleGetGrowth as AsyncHandler<unknown, unknown>,
  QUEUE_REPLY: handleQueueReply as AsyncHandler<unknown, unknown>,
  TRAIN_VOICE: handleTrainVoice as AsyncHandler<unknown, unknown>,
  CLEAR_VOICE: handleClearVoice as AsyncHandler<unknown, unknown>,
  REFRESH_GROWTH: handleRefreshGrowth as AsyncHandler<unknown, unknown>,
  DELETE_ACCOUNT: handleDeleteAccount as AsyncHandler<unknown, unknown>,
  REFRESH_ME: handleRefreshMe as AsyncHandler<unknown, unknown>,
  SETUP_READ_ACCOUNT: handleSetupReadAccount as AsyncHandler<unknown, unknown>,
  DRY_RUN: handleDryRun as AsyncHandler<unknown, unknown>,
  DRY_RUN_REJECT: handleDryRunReject as AsyncHandler<unknown, unknown>,
  GET_SETUP_READ: handleGetSetupRead as AsyncHandler<unknown, unknown>,
  START_CHECKOUT: handleStartCheckout as AsyncHandler<unknown, unknown>,
  OPEN_BILLING_PORTAL: handleOpenBillingPortal as AsyncHandler<unknown, unknown>,
  // Phase 3 — auto-posting, the content pipeline, and graduated trust.
  RECORD_APPROVAL: handleRecordApproval as AsyncHandler<unknown, unknown>,
  ANSWER_TRUST_OFFER: handleAnswerTrustOffer as AsyncHandler<unknown, unknown>,
  REVOKE_TRUST: handleRevokeTrust as AsyncHandler<unknown, unknown>,
  GET_BEST_TIMES: handleGetBestTimes as AsyncHandler<unknown, unknown>,
  UPDATE_SCHEDULED_POST: handleUpdateScheduledPost as AsyncHandler<unknown, unknown>,
  APPROVE_SCHEDULED_POST: handleApproveScheduledPost as AsyncHandler<unknown, unknown>,
  REWRITE_POST: handleRewritePost as AsyncHandler<unknown, unknown>,
  AUTO_DRAFT_NOW: handleAutoDraftNow as AsyncHandler<unknown, unknown>,
  // Phase 5.2 — Ask, the copilot.
  ASK: handleAsk as AsyncHandler<unknown, unknown>,
  ASK_APPLY_DIFF: handleAskApplyDiff as AsyncHandler<unknown, unknown>,
  GET_STANDING_INSTRUCTIONS: handleGetStandingInstructions as AsyncHandler<unknown, unknown>,
};

/**
 * Alt+G — the keyboard route to the side panel (updateplan 2.5's fallback).
 *
 * A command is a user gesture beyond argument, so this path works whatever
 * Chrome decides about content-script clicks. It is also just a good shortcut.
 */
chrome.commands?.onCommand.addListener((command) => {
  if (command !== 'open-side-panel') return;
  void (async () => {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (typeof tab?.id === 'number') await chrome.sidePanel.open({ tabId: tab.id });
    } catch (err) {
      console.warn('[casper] Alt+G could not open the side panel —', err);
    }
  })();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
    sendResponse({ ok: false, error: 'invalid_message' });
    return false;
  }
  // Sent by the checkout-return content script ON the /r/success page. We need
  // the sender's tab id (the content script can't get its own), so it's handled
  // here rather than in the payload-only asyncHandlers map.
  if (message.type === 'CHECKOUT_RETURN') {
    console.log('[casper] checkout success detected via content script', sender.tab?.id);
    const sessionId = (message.payload as { sessionId?: string } | undefined)?.sessionId;
    void finishCheckout(sender.tab?.id, sessionId);
    sendResponse({ ok: true });
    return false;
  }
  /**
   * The floating panel's `⤢ expand` (updateplan 2.5).
   *
   * Chrome requires a user gesture to open the side panel, and whether a
   * content-script click carries that gesture through a message hop is the one
   * thing in this design that cannot be settled by reading code. So:
   *
   *   · `open()` is called SYNCHRONOUSLY here — any await first would drop the
   *     gesture even if it did survive the hop
   *   · the response is the TRUTH, not an acknowledgement: it waits for the
   *     promise, so the panel knows whether to fall back to the keyboard
   *     shortcut instead of leaving the user pressing a button that does nothing
   *
   * Handled here rather than in asyncHandlers because it needs `sender.tab.id`,
   * which a content script cannot read for itself.
   */
  if (message.type === 'OPEN_SIDE_PANEL') {
    const tabId = sender.tab?.id;
    if (typeof tabId !== 'number') {
      sendResponse({ ok: false, error: 'no_tab_id' });
      return false;
    }
    try {
      const opening = chrome.sidePanel.open({ tabId }) as unknown as Promise<void> | undefined;
      void Promise.resolve(opening)
        .then(() => sendResponse({ ok: true }))
        .catch((err: unknown) => {
          console.warn('[casper] sidePanel.open() rejected —', err);
          sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
        });
      // Keep the channel open for the real answer.
      return true;
    } catch (err) {
      console.warn('[casper] sidePanel.open() threw —', err);
      sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
      return false;
    }
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
      // An unhandled throw in a message handler used to exist only in a console
      // nobody reads. Record it so it reaches the fleet-health view like every
      // other failure.
      void appendDiagnostic({
        kind: 'crash',
        context: `background:${message.type}`,
        detail: err instanceof Error ? `${err.message}\n${(err.stack ?? '').slice(0, 400)}` : String(err),
      });
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
  // Seed the user's saved keywords from the server so they don't have to
  // re-enter them after a reinstall or on a new device.
  await seedKeywordsFromServer(data.user);
};

/** Copy the server-saved keywords into local home-feed settings (only when the
 *  server has some and they differ), so the popup shows them ready to go. */
const seedKeywordsFromServer = async (user: User): Promise<void> => {
  const serverKeywords = user.preferences?.keywords ?? [];
  if (serverKeywords.length === 0) return;
  const settings = await getSettings();
  const local = settings.homeFeed.keywords;
  const same =
    local.length === serverKeywords.length && local.every((k, i) => k === serverKeywords[i]);
  if (same) return;
  await setSettings({
    ...settings,
    homeFeed: { ...settings.homeFeed, keywords: serverKeywords },
  });
};

/**
 * Record ONE autopilot action the moment it lands (sent by the home-feed content
 * script during a long session) — so the dashboard counters move live instead of
 * only when the whole session ends. Marks de-dupe, buffers the action log,
 * increments today's counter, and bumps the free-tier monthly count.
 */
async function handleRecordAction(payload: unknown) {
  const { platform, actionType, postUrl, postId, handle, profileUrl, draftId, source } = (payload ??
    {}) as {
    platform?: Platform;
    actionType?: ActionType;
    postUrl?: string;
    postId?: string;
    handle?: string;
    profileUrl?: string;
    draftId?: string;
    /** Set by a search-feed session (updateplan 6.7 — D8) — routes the
     *  counter increment to the search budget instead of the shared one. */
    source?: 'search';
  };
  if (
    !platform ||
    !PLATFORMS.includes(platform) ||
    !actionType ||
    !ACTION_TYPES.includes(actionType)
  ) {
    return { ok: false, error: 'invalid_payload' };
  }

  // De-dupe marks so the same post/handle isn't acted on again.
  if (actionType === 'like' && postId) await markLiked(platform, postId);
  if (actionType === 'comment' && postId) await markCommented(platform, postId);
  if (actionType === 'follow' && handle) await markFollowed(platform, handle);
  if (actionType === 'quote' && postId) await markQuoted(platform, postId);
  if ((actionType === 'comment' || actionType === 'quote') && draftId) {
    try {
      await apiFetch(`/api/comments/drafts/${encodeURIComponent(draftId)}/posted`, {
        method: 'POST',
      });
    } catch {
      /* best-effort */
    }
  }

  // Action log (buffered; the scheduler flushes it to the server periodically).
  await appendActionLog({
    platform,
    actionType,
    targetUrl: postUrl ?? profileUrl ?? (handle ? `https://x.com/${handle}` : ''),
    ...(handle ? { targetHandle: handle } : {}),
    success: true,
    timestamp: new Date().toISOString(),
  });

  // Live daily counter — this is what the dashboard polls every 2s. A
  // search-feed action spends from its own budget (6.7 — D8), not the one
  // home/profile sessions share.
  const settings = await getSettings();
  if (source === 'search') {
    await incrementSearchCounter(settings, platform, actionType);
  } else {
    await incrementCounter(settings, platform, actionType);
  }

  // Free tier: keep the local monthly count moving (rolling over at the month
  // boundary) so the cap stays enforced between server syncs.
  const auth = await getAuth();
  if (auth && !isPro(auth.user.subscriptionStatus ?? 'free')) {
    await setAuth({
      ...auth,
      user: { ...auth.user, ...bumpMonthly(auth.user) },
    });
  }

  return { ok: true };
}

async function handleUpdatePreferences(payload: unknown) {
  const { keywords } = (payload ?? {}) as { keywords?: string[] };
  const resp = await apiFetch<User>('/api/me/preferences', {
    method: 'PATCH',
    body: { keywords },
  });
  if (resp.ok) {
    // Keep stored auth + local keywords in sync with what the server saved.
    const auth = await getAuth();
    if (auth) await setAuth({ ...auth, user: resp.data });
    if (Array.isArray(keywords)) {
      const settings = await getSettings();
      await setSettings({ ...settings, homeFeed: { ...settings.homeFeed, keywords } });
    }
  }
  return resp;
}

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

/**
 * May a reply go out right now? (updateplan 2.4)
 *
 * "Reply for me" is a button the user pressed, but it is still a reply posted by
 * this extension under their name, so it passes the same three gates the
 * autopilot passes: the daily cap, the free-tier monthly allowance, and the
 * rolling hourly ceiling. A manual action that skipped them would make every
 * safety number in the product a lie the moment someone clicked twice.
 *
 * Being PAUSED is deliberately not a gate: pause stops the engine acting on its
 * own, and this is the user acting.
 */
async function handleCanReply() {
  const settings = await getSettings();
  const counters = await ensureToday(settings);
  if (!isUnderCap(counters, 'twitter', 'comment')) {
    return { ok: true, data: { allowed: false, reason: 'caps-spent' as const } };
  }
  const auth = await getAuth();
  const pro = isPro(auth?.user.subscriptionStatus ?? 'free');
  if (!pro && monthlyActionsUsed(auth?.user) >= FREE_TIER.monthlyActions) {
    return { ok: true, data: { allowed: false, reason: 'free-cap' as const } };
  }
  if (!(await canActNow())) {
    return { ok: true, data: { allowed: false, reason: 'hourly' as const } };
  }
  return { ok: true, data: { allowed: true } };
}

/**
 * Keep a (generated, corrected) pair (updateplan 2.4).
 *
 * The user edited a draft before sending it. That edit is the strongest
 * statement about their voice the product ever gets — stronger than a tone
 * preset, stronger than a rejection — and Phase 6.3 trains on it.
 */
async function handleRecordCorrection(payload: unknown) {
  const { postText, generated, corrected } = (payload ?? {}) as {
    postText?: string;
    generated?: string;
    corrected?: string;
  };
  if (!generated || !corrected || generated.trim() === corrected.trim()) {
    return { ok: true, data: { stored: false } };
  }
  await appendCorrectedDraft({
    postText: postText ?? '',
    generated,
    corrected,
    at: new Date().toISOString(),
  });
  return { ok: true, data: { stored: true } };
}

async function handleEnsureCounters() {
  const settings = await getSettings();
  const counters = await ensureToday(settings);
  return { ok: true, data: counters };
}

async function handleDraftComment(payload: unknown) {
  const { platform, postText, postUrl, threadContext } = (payload ?? {}) as {
    platform?: Platform;
    postText?: string;
    postUrl?: string;
    /** Thread context for a reply-in-a-thread draft (updateplan 4.2). */
    threadContext?: string;
  };
  if (!platform || !PLATFORMS.includes(platform) || !postText || !postUrl) {
    return { ok: false, error: { code: 'invalid_payload', message: 'platform/postText/postUrl required' } };
  }
  return requestCommentDraft({
    platform,
    postText,
    postUrl,
    ...(threadContext ? { threadContext } : {}),
  });
}

/**
 * Draft several post ideas at once — in the user's trained voice, informed by
 * which of their own posts performed best. Suggestions only: they land in the
 * composer, not on the schedule.
 */
async function handleGenerateIdeas(payload: unknown) {
  const { count, seedText } = (payload ?? {}) as { count?: number; seedText?: string };
  // The request itself moved to `lib/ideas.ts` in updateplan 3.2 so the
  // auto-draft loop asks for ideas the same way this handler does — one call
  // site, one set of topics, one moderation pass.
  return await requestPostIdeas({
    count: count ?? 3,
    // "Write more like this" (5.1) — the best post's own text, fed in as one
    // more topic hint for THIS call only, never persisted to contentTopics.
    ...(seedText ? { seedText } : {}),
  });
}

/** Draft an original tweet from a short description via the server (OpenAI). */
async function handleGeneratePost(payload: unknown) {
  const { description, link } = (payload ?? {}) as { description?: string; link?: string };
  if (!description || typeof description !== 'string' || description.trim().length === 0) {
    return { ok: false, error: { code: 'invalid_payload', message: 'description required' } };
  }
  const settings = await getSettings();
  const tone: TonePreset = TONE_PRESETS.includes(settings.tone) ? settings.tone : 'friendly';
  const maxChars = tweetLimitFor(settings.xAccountPlan, settings.postLength);
  const resp = await apiFetch<{ text: string }>('/api/posts/generate', {
    method: 'POST',
    body: {
      description: description.trim().slice(0, 1_000),
      tone,
      maxChars,
      ...(link && typeof link === 'string' && link.trim() ? { link: link.trim() } : {}),
    },
  });
  return resp;
}

async function handleListScheduledPosts() {
  const posts = await getScheduledPosts();
  return { ok: true, data: { posts, max: MAX_SCHEDULED_POSTS } };
}

/** Add a post to the local schedule, enforcing the max-scheduled cap. */
async function handleSchedulePost(payload: unknown) {
  const { text, link, imageDataUrl, scheduledAt, thread, status, generated } = (payload ??
    {}) as {
    text?: string;
    link?: string;
    imageDataUrl?: string | null;
    scheduledAt?: number;
    thread?: string[];
    /** 'draft' parks it on the calendar without permission to publish (3.2). */
    status?: 'draft' | 'scheduled';
    /** What the model wrote, when Ghostly wrote it — the trust streak's input. */
    generated?: string;
  };
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { ok: false, error: { code: 'invalid_payload', message: 'Post text is required.' } };
  }
  // Enforce X's char limit as the source of truth — the free/pro limit from the
  // user's account setting — counting the attached link the way X does (23 chars),
  // so a post can never be scheduled that would exceed the limit once published,
  // even if the UI check were bypassed.
  const settings = await getSettings();
  const limit = tweetLimitFor(settings.xAccountPlan, settings.postLength);
  const linkStr = link && typeof link === 'string' ? link.trim() : '';
  if (effectivePostLength(text.trim(), linkStr) > limit) {
    return {
      ok: false,
      error: { code: 'too_long', message: `Post exceeds the ${limit}-character limit.` },
    };
  }
  if (typeof scheduledAt !== 'number' || !Number.isFinite(scheduledAt)) {
    return { ok: false, error: { code: 'invalid_time', message: 'Pick a valid schedule time.' } };
  }
  // Every thread tweet is published as its own post, so each must fit the limit
  // on its own. Checked here as well as in the UI so a bypassed client can't
  // queue a thread that will fail halfway through.
  const threadParts = Array.isArray(thread)
    ? thread.filter((t): t is string => typeof t === 'string').map((t) => t.trim()).filter(Boolean)
    : [];
  if (threadParts.length > 24) {
    return {
      ok: false,
      error: { code: 'thread_too_long', message: 'A thread can have at most 25 tweets.' },
    };
  }
  if (threadParts.some((t) => t.length > limit)) {
    return {
      ok: false,
      error: {
        code: 'too_long',
        message: `Every tweet in a thread must fit the ${limit}-character limit.`,
      },
    };
  }
  if (imageDataUrl && typeof imageDataUrl === 'string' && imageDataUrl.length > 4_000_000) {
    return { ok: false, error: { code: 'image_too_big', message: 'Image is too large (max ~3 MB).' } };
  }

  const posts = await getScheduledPosts();
  const pending = posts.filter((p) => p.status === 'scheduled' || p.status === 'publishing');
  if (pending.length >= MAX_SCHEDULED_POSTS) {
    return {
      ok: false,
      error: {
        code: 'limit_reached',
        message: `You can have up to ${MAX_SCHEDULED_POSTS} posts scheduled at once. Delete one first.`,
      },
    };
  }

  const post: ScheduledPost = {
    id: crypto.randomUUID(),
    text: text.trim(),
    link: link && typeof link === 'string' ? link.trim() : '',
    imageDataUrl: imageDataUrl && typeof imageDataUrl === 'string' ? imageDataUrl : null,
    ...(threadParts.length > 0 ? { thread: threadParts } : {}),
    scheduledAt,
    // Anything but an explicit 'draft' is a post the user asked for by name and
    // is therefore publishable; a draft waits for a yes it hasn't been given.
    status: status === 'draft' ? 'draft' : 'scheduled',
    createdAt: Date.now(),
    ...(status === 'draft' ? { origin: 'auto' as const } : {}),
    ...(typeof generated === 'string' && generated.trim()
      ? { generated: generated.trim() }
      : status === 'draft'
        ? { generated: text.trim() }
        : {}),
  };
  await setScheduledPosts([...posts, post]);

  // If it's already due (past time), kick a tick so it publishes promptly. A
  // draft never is: it has no permission to publish at any time.
  if (post.status === 'scheduled' && scheduledAt <= Date.now()) void handleTick();

  return { ok: true, data: { post } };
}

async function handleDeleteScheduledPost(payload: unknown) {
  const { id } = (payload ?? {}) as { id?: string };
  if (!id || typeof id !== 'string') {
    return { ok: false, error: { code: 'missing_id', message: 'id required' } };
  }
  const posts = await getScheduledPosts();
  await setScheduledPosts(posts.filter((p) => p.id !== id));
  return { ok: true, data: { id } };
}

/* -- Reply approval queue --------------------------------------------------
 * Drafts wait in LOCAL storage, not on the server: judging a reply means seeing
 * the post it answers, and the server keeps only that post's hash. The server's
 * CommentDraft stays the status record, transitioned on approve/reject.
 * ---------------------------------------------------------------------- */

/** Park a freshly generated draft for review. Sent by the content script. */
async function handleQueueReply(payload: unknown) {
  const p = (payload ?? {}) as Partial<PendingReply>;
  if (
    !p.id ||
    !p.platform ||
    !PLATFORMS.includes(p.platform) ||
    !p.postId ||
    !p.postUrl ||
    !p.draftText
  ) {
    return { ok: false, error: { code: 'invalid_payload', message: 'incomplete draft' } };
  }
  const queued = await queuePendingReply({
    id: p.id,
    platform: p.platform,
    postId: p.postId,
    postUrl: p.postUrl,
    postText: (p.postText ?? '').slice(0, 1_000),
    authorHandle: p.authorHandle ?? null,
    draftText: p.draftText,
    createdAt: Date.now(),
    ...(p.matchedKeyword ? { matchedKeyword: p.matchedKeyword } : {}),
  });
  // Only mark it drafted when it actually landed in the queue. A draft refused
  // because the queue was full is one the user never saw — marking it would
  // retire the post permanently. Re-drafting it later is nearly free anyway:
  // the server dedupes on the post's text hash and hands back the same draft.
  if (queued) await markDrafted(p.platform, p.postId);
  return { ok: true, data: { queued, full: !queued } };
}

/** The review list, newest first. */
async function handleListDrafts() {
  const replies = await getPendingReplies();
  return {
    ok: true,
    data: { replies: [...replies].sort((a, b) => b.createdAt - a.createdAt) },
  };
}

/**
 * Approve a draft: transition it on the server, then enqueue a normal `comment`
 * task so it posts through exactly the same path an auto-reply would — caps,
 * dedupe, action log and all. The user may have edited the text first.
 */
async function handleApproveDraft(payload: unknown) {
  const { id, text, bulk } = (payload ?? {}) as {
    id?: string;
    text?: string;
    /** Part of a "Post all" sweep — see the trust note below. */
    bulk?: boolean;
  };
  if (!id) return { ok: false, error: { code: 'missing_id', message: 'id required' } };

  const draft = await takePendingReply(id);
  if (!draft) {
    return { ok: false, error: { code: 'draft_not_found', message: 'No such pending reply' } };
  }
  const finalText = (typeof text === 'string' && text.trim() ? text : draft.draftText).slice(0, 2_000);

  // What the user changed, and whether they changed anything (updateplan 3.5 +
  // 3.3). The pair is the strongest voice signal the product gets; the boolean
  // is the whole of the trust streak. Both are recorded HERE rather than in the
  // two panels, so Review and the floating brief can't disagree about what
  // counts as an edit.
  const edited = finalText.trim() !== draft.draftText.trim();
  if (edited) {
    await appendCorrectedDraft({
      postText: draft.postText,
      generated: draft.draftText,
      corrected: finalText,
      at: new Date().toISOString(),
    });
  }
  const settings = await getSettings();
  // "Post all" does NOT advance the streak. The streak is evidence that this
  // person reads what Ghostly writes and finds nothing to change; clearing a
  // queue of eight in one click is evidence of a full queue. Granting
  // auto-publish off the back of two bulk clicks is precisely the over-trust
  // 3.3 exists to prevent — an edit inside a sweep still resets it, though,
  // because that half is a real signal in either direction.
  const trust =
    bulk === true && !edited
      ? normalizeTrust(settings.trust)
      : recordApproval(normalizeTrust(settings.trust), { edited });
  await setSettings({ ...settings, trust });

  // Best-effort status update — a server hiccup must not strand an approved
  // reply the user already said yes to, so we enqueue regardless.
  try {
    await apiFetch(`/api/comments/drafts/${encodeURIComponent(id)}/approve`, { method: 'POST' });
  } catch {
    /* the post itself is what matters */
  }

  const task = await enqueue(draft.platform, 'comment', {
    draftId: id,
    postUrl: draft.postUrl,
    postId: draft.postId,
    commentText: finalText,
    // Carried through to the action-log entry the queued path writes
    // (updateplan 5.1), same as the inline autopilot path already does —
    // without this, "which targets/topics are working" would be blind to
    // every reply that went through review, which is most of them
    // (`replyApproval` defaults on).
    ...(draft.authorHandle ? { targetHandle: draft.authorHandle } : {}),
    ...(draft.matchedKeyword ? { matchedKeyword: draft.matchedKeyword } : {}),
  });
  // Post it promptly rather than waiting on the next cooldown — the user is
  // watching. Still gated by the engine being Active.
  const sched = await getSchedulerState();
  await setSchedulerState({ ...sched, nextEligibleAt: 0 });
  void handleTick();
  return { ok: true, data: { taskId: task.id, trust, offer: hasOpenOffer(trust) } };
}

/** Skip a draft: drop it locally and mark it rejected on the server. */
async function handleRejectDraft(payload: unknown) {
  const { id } = (payload ?? {}) as { id?: string };
  if (!id) return { ok: false, error: { code: 'missing_id', message: 'id required' } };
  const draft = await takePendingReply(id);
  if (!draft) {
    return { ok: false, error: { code: 'draft_not_found', message: 'No such pending reply' } };
  }
  try {
    await apiFetch(`/api/comments/drafts/${encodeURIComponent(id)}/reject`, { method: 'POST' });
  } catch {
    /* already removed locally — the server record is bookkeeping */
  }
  return { ok: true, data: { id } };
}

/* -- Voice training -------------------------------------------------------- */

/**
 * Read a sample of the user's own posts and have the server distil a style
 * guide from them. Runs in a background tab (never steals focus from the popup)
 * and resolves once the profile is stored, so the UI can show it immediately.
 */
async function handleTrainVoice() {
  const own = await ensureOwnHandleForVoice();
  if (!own) {
    return {
      ok: false,
      error: {
        code: 'handle_unknown',
        message: 'Could not find your X account — open x.com and sign in, then try again.',
      },
    };
  }

  let resp;
  try {
    resp = await driveTab(
      `https://x.com/${encodeURIComponent(own)}`,
      { type: 'COLLECT_OWN_POSTS', payload: { handle: own, max: VOICE_LIMITS.maxSamples } },
      { settleMs: 3_500, forceBackground: true },
    );
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'read_failed',
        message: err instanceof Error ? err.message : 'Could not read your profile',
      },
    };
  }
  if (resp.type !== 'OWN_POSTS_RESULT') {
    return { ok: false, error: { code: 'read_failed', message: 'Could not read your posts' } };
  }

  // Only the text matters here, and only from posts with something to learn
  // from. The samples are uploaded, analysed, and dropped — never stored.
  const posts = resp.payload.outcomes
    .map((o) => o.text.trim())
    .filter((t) => t.length >= 15)
    .slice(0, VOICE_LIMITS.maxSamples);

  if (posts.length < VOICE_LIMITS.minSamples) {
    return {
      ok: false,
      error: {
        code: 'not_enough_posts',
        message: `Found only ${posts.length} posts to learn from — Ghostly needs at least ${VOICE_LIMITS.minSamples}. Post a bit more and try again.`,
      },
    };
  }

  const trained = await apiFetch<User>('/api/voice/train', { method: 'POST', body: { posts } });
  if (trained.ok) await syncUser(trained.data);
  return trained;
}

async function handleClearVoice() {
  const resp = await apiFetch<User>('/api/voice', { method: 'DELETE' });
  if (resp.ok) await syncUser(resp.data);
  return resp;
}

/**
 * Voice tuning from edits (updateplan 6.3). Weekly, and only once at least
 * `MIN_NEW_CORRECTIONS` new (generated, corrected) pairs have accumulated —
 * a retrain on one or two edits would be reacting to noise. Feeds the
 * CORRECTED text alongside real scraped posts into the SAME `/api/voice/train`
 * call `handleTrainVoice` uses: a correction is real text in the user's own
 * voice (they wrote it), so it belongs in the same sample pool, not a second
 * training path.
 */
async function runVoiceTuneIfDue(): Promise<void> {
  try {
    const state = await getVoiceTuneState();
    const corrected = await getCorrectedDrafts();
    if (!decideVoiceTune(state, Date.now(), corrected.length)) return;

    const own = await ensureOwnHandleForVoice();
    if (!own) return; // try again on the next alarm — not signed in / no tab open

    const resp = await driveTab(
      `https://x.com/${encodeURIComponent(own)}`,
      { type: 'COLLECT_OWN_POSTS', payload: { handle: own, max: VOICE_LIMITS.maxSamples } },
      { settleMs: 3_500, forceBackground: true },
    );
    if (resp.type !== 'OWN_POSTS_RESULT') return;

    const realPosts = resp.payload.outcomes.map((o) => o.text.trim()).filter((t) => t.length >= 15);
    const correctionTexts = corrected.map((c) => c.corrected.trim()).filter((t) => t.length >= 15);
    // Corrections first: they are the strongest signal (2.4), and slicing to
    // maxSamples after de-duping means they're never crowded out by ordinary
    // posts when both are plentiful.
    const merged = [...new Set([...correctionTexts, ...realPosts])].slice(0, VOICE_LIMITS.maxSamples);
    if (merged.length < VOICE_LIMITS.minSamples) return;

    const trained = await apiFetch<User>('/api/voice/train', { method: 'POST', body: { posts: merged } });
    // Stamp the gate regardless of outcome — a failed call costs this
    // install the week, not a retry every 30 seconds (same reasoning as
    // auto-posting's lastRunAt stamp).
    await setVoiceTuneState({ lastTunedAt: new Date().toISOString(), lastCorrectionCount: corrected.length });
    if (trained.ok) await syncUser(trained.data);
  } catch (err) {
    console.warn('[casper] voice-tune: pass failed —', err);
  }
}

/** Cached @handle, else detect it from x.com once (mirrors the executor's). */
async function ensureOwnHandleForVoice(): Promise<string | null> {
  const cached = await getOwnHandle();
  if (cached) return cached;
  try {
    const detect = await driveTab(
      'https://x.com/home',
      { type: 'GET_OWN_HANDLE', payload: {} },
      { settleMs: 3_000, forceBackground: true },
    );
    if (detect.type === 'OWN_HANDLE_RESULT' && detect.payload.handle) {
      await setOwnHandle(detect.payload.handle);
      return detect.payload.handle;
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** Write a fresh server user into local auth so the popup sees it at once. */
async function syncUser(user: User): Promise<void> {
  const auth = await getAuth();
  if (auth) await setAuth({ ...auth, user });
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
  // Start it now (if Active) instead of waiting up to a minute for the next
  // alarm tick: clear the action cooldown and kick a tick. Fire-and-forget so
  // the popup returns immediately rather than blocking on the whole visit.
  const sched = await getSchedulerState();
  await setSchedulerState({ ...sched, nextEligibleAt: 0 });
  void handleTick();
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

/**
 * Setup step 1. Slow on purpose — a dozen real tab visits — so the panel drives
 * it once and then reads the stored result; `casper.setupProgress` is the live
 * feed while it runs.
 */
async function handleSetupReadAccount() {
  return await readAccountForSetup();
}

/**
 * Setup step 3 — show what it WOULD do, having done none of it. Runs the real
 * feed loop with every action disabled (scheduler/dry-run.ts).
 */
async function handleDryRun(payload: unknown) {
  const { max } = (payload ?? {}) as { max?: number };
  const outcome = await runDryRun(max);
  return outcome.ok
    ? { ok: true, data: { candidates: outcome.candidates, scanned: outcome.scanned } }
    : { ok: false, error: { code: 'dry_run_failed', message: outcome.error } };
}

/**
 * "Not this one" on a dry-run card.
 *
 * Two effects, deliberately different in weight. The exclusion is narrow: the
 * ONE most distinctive word from the post the user rejected, and only when it
 * is not already a topic they chose — a rejection means "not this", not "never
 * anything like this", and an over-eager blocklist is how an engine quietly
 * stops finding anything. The pair is kept whole for Phase 6.3's voice tuning,
 * which is where a rejected draft is actually worth something.
 */
async function handleDryRunReject(payload: unknown) {
  const { text, draft } = (payload ?? {}) as { text?: string; draft?: string };
  if (!text) return { ok: false, error: { code: 'invalid_payload', message: 'text required' } };

  const settings = await getSettings();
  const term = mostDistinctiveTerm(text, [
    ...settings.homeFeed.keywords,
    ...settings.homeFeed.excludeKeywords,
  ]);
  if (term) {
    await setSettings({
      ...settings,
      homeFeed: {
        ...settings.homeFeed,
        excludeKeywords: [...settings.homeFeed.excludeKeywords, term],
      },
    });
  }
  await appendRejectedDraft({ text, draft: draft ?? null, at: new Date().toISOString() });
  return { ok: true, data: { excluded: term } };
}

/** The last read, so re-opening the panel mid-setup doesn't start over. */
async function handleGetSetupRead() {
  return { ok: true, data: await getSetupRead() };
}

async function handleStartCheckout(payload: unknown) {
  const { plan } = (payload ?? {}) as { plan?: string };
  if (!plan || !(PAID_PLANS as readonly string[]).includes(plan)) {
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

async function finishCheckout(
  tabId: number | undefined,
  sessionId?: string,
): Promise<void> {
  if (tabId === undefined) return;
  if (finishingCheckout.has(tabId)) return; // both triggers may fire for one nav
  finishingCheckout.add(tabId);

  // Close the dead Stripe page IMMEDIATELY — never wait on the network first.
  // (Awaiting before this can stall in an MV3 worker and leave the tab open.)
  try {
    await chrome.tabs.remove(tabId);
    console.log('[casper] closed checkout tab', tabId);
  } catch (e) {
    console.warn('[casper] could not close checkout tab', tabId, e);
  }
  // Bring the extension popup forward so they're back in Ghostly247 (Chrome
  // 127+; best-effort — the popup also auto-updates whenever it's next opened).
  try {
    await chrome.action.openPopup();
  } catch (e) {
    console.warn('[casper] openPopup unavailable — popup shows Pro on next open', e);
  }

  // Grant Pro right now: confirm the checkout session server-side (doesn't need
  // the async webhook / `stripe listen`). Falls back to polling /api/me in case
  // we never got a session id.
  try {
    if (sessionId) {
      const resp = await apiFetch<User>('/api/billing/confirm-session', {
        method: 'POST',
        body: { sessionId },
      });
      if (resp.ok) {
        const auth = await getAuth();
        if (auth) await setAuth({ ...auth, user: resp.data });
        console.log('[casper] subscription confirmed →', resp.data.subscriptionStatus);
        return;
      }
      console.warn('[casper] confirm-session failed, falling back to /me poll', resp.error);
    }
    for (let attempt = 0; attempt < 6; attempt++) {
      const resp = await apiFetch<User>('/api/me');
      if (resp.ok) {
        const auth = await getAuth();
        if (auth) await setAuth({ ...auth, user: resp.data });
        if (isPro(resp.data.subscriptionStatus ?? 'free')) break;
      }
      await new Promise((r) => setTimeout(r, 1_500));
    }
  } finally {
    finishingCheckout.delete(tabId);
  }
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

/** Growth scoreboard for the Growth tab — the server does the aggregation. */
async function handleGetGrowth(payload: unknown) {
  const { days = 30 } = (payload ?? {}) as { days?: number };
  return await apiFetch(`/api/growth/summary?days=${days}`);
}

/**
 * "Refresh now" from the Growth tab. Runs the read inline (rather than queueing
 * it) so it works while the engine is paused, and resolves only once the new
 * numbers are on the server — the popup re-fetches the summary straight after.
 */
async function handleRefreshGrowth() {
  const result = await runGrowthScanNow();
  if (!result.success) {
    return { ok: false, error: result.errorMessage ?? 'growth scan failed' };
  }
  return { ok: true, data: { message: result.errorMessage ?? 'updated' } };
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
    // Wipe ALL local Ghostly247 state.
    await chrome.storage.local.clear();
  }
  return resp;
}

async function handleScanHomeNow(payload: unknown) {
  const { platform } = (payload ?? {}) as { platform?: Platform };
  if (!platform || !PLATFORMS.includes(platform)) {
    return { ok: false, error: 'invalid_payload' };
  }
  // Reset the home-scan cooldown so the refill loop won't think it just ran.
  const state = await getTargetState();
  const key = `home:${platform}`;
  state[key] = { ...(state[key] ?? { lastScannedAt: 0 }), lastHomeScanAt: 0 };
  await setTargetState(state);
  const task = await enqueue(platform, 'scan-home-feed', {});
  // Start it right now instead of waiting up to a minute for the next alarm tick:
  // clear the action cooldown and kick a tick. Fire-and-forget so the popup
  // returns immediately rather than blocking on the whole scrolling session.
  const sched = await getSchedulerState();
  await setSchedulerState({ ...sched, nextEligibleAt: 0 });
  void handleTick();
  return { ok: true, data: { taskId: task.id } };
}

/** "Run now" on a saved topic feed — same shape as the home-feed kick. */
async function handleScanSearchNow(payload: unknown) {
  const { query } = (payload ?? {}) as { query?: string };
  if (!query || typeof query !== 'string' || !query.trim()) {
    return { ok: false, error: 'invalid_payload' };
  }
  const state = await getTargetState();
  const key = `search:${query}`;
  state[key] = { ...(state[key] ?? { lastScannedAt: 0 }), lastSearchScanAt: 0 };
  await setTargetState(state);
  const task = await enqueue('twitter', 'scan-search', { query });
  const sched = await getSchedulerState();
  await setSchedulerState({ ...sched, nextEligibleAt: 0 });
  void handleTick();
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

/**
 * Manual "Follow back now" — open YOUR followers list and follow back everyone
 * inline, on demand (vs. the ~30-min automatic cadence). Resets the follow-back
 * cooldown, enqueues the task, and kicks a tick so it starts immediately when
 * the engine is Active.
 */
async function handleFollowBackNow() {
  const state = await getTargetState();
  const key = 'followback:twitter';
  state[key] = { ...(state[key] ?? { lastScannedAt: 0 }), lastFollowScanAt: 0 };
  await setTargetState(state);
  const task = await enqueue('twitter', 'scan-followback', {});
  const sched = await getSchedulerState();
  await setSchedulerState({ ...sched, nextEligibleAt: 0 });
  void handleTick();
  return { ok: true, data: { taskId: task.id } };
}


/* -- Phase 3: auto-posting, the pipeline, and graduated trust -------------
 * The publishing half of the product. Everything here is written so that
 * nothing goes out under the user's name without either their word, or a
 * permission they were asked for in plain English and granted by hand.
 * ---------------------------------------------------------------------- */

/**
 * Record one approval against the trust streak (updateplan 3.3).
 *
 * `edited` is the entire signal, and it has to come from comparing the text
 * sent with the text generated. Called from every place a human says yes:
 * Review, the floating brief, `Reply for me`, and approving a drafted post.
 */
async function handleRecordApproval(payload: unknown) {
  const { edited } = (payload ?? {}) as { edited?: boolean };
  const settings = await getSettings();
  const trust = recordApproval(normalizeTrust(settings.trust), { edited: edited === true });
  await setSettings({ ...settings, trust });
  return { ok: true, data: { trust, offer: hasOpenOffer(trust) } };
}

/**
 * The user's answer to the graduation offer.
 *
 * A yes is the ONLY code path that stops holding things for review. It writes
 * `grantedAt` and turns `replyApproval` off — the existing reply gate the rest
 * of the engine already reads — so both halves of the product change together
 * and there is no second switch to forget.
 */
async function handleAnswerTrustOffer(payload: unknown) {
  const { accept } = (payload ?? {}) as { accept?: boolean };
  if (typeof accept !== 'boolean') {
    return { ok: false, error: { code: 'invalid_payload', message: 'accept must be a boolean' } };
  }
  const settings = await getSettings();
  const current = normalizeTrust(settings.trust);
  if (!hasOpenOffer(current)) {
    return { ok: false, error: { code: 'no_offer', message: 'There is no offer to answer.' } };
  }
  const trust = answerOffer(current, { accept });
  await setSettings({
    ...settings,
    trust,
    ...(accept ? { replyApproval: false } : {}),
  });
  return { ok: true, data: { trust, granted: isTrusted(trust) } };
}

/** Hand the keys back. Holding starts again immediately, streak from zero. */
async function handleRevokeTrust() {
  const settings = await getSettings();
  const trust = revokeTrust(normalizeTrust(settings.trust));
  await setSettings({ ...settings, trust, replyApproval: true });
  return { ok: true, data: { trust } };
}

/**
 * When to publish (updateplan 3.1), and whether that answer is personalised.
 * The `personalised` flag is not decoration — the UI has to say "these are
 * sensible defaults" rather than implying it learned them from four posts.
 */
async function handleGetBestTimes(payload: unknown) {
  const { count } = (payload ?? {}) as { count?: number };
  const settings = await getSettings();
  const outcomes = await getPostOutcomes();
  const best = bestTimes(outcomes, {
    activeHours: settings.activeHours,
    ...(typeof count === 'number' ? { count } : {}),
  });
  return {
    ok: true,
    data: {
      ...best,
      labels: best.slots.map(describeSlot),
      minDays: BEST_TIMES_MIN_DAYS,
      // The Growth tab's heatmap (updateplan 5.1) — same scoring as `best`,
      // just the full 7×24 grid behind it rather than only the top picks.
      heatmap: scoreGrid(outcomes, settings.activeHours),
    },
  };
}

/**
 * Edit or reschedule a post that hasn't gone out yet.
 *
 * Only a `draft` or `scheduled` post is editable: one mid-publish, or already
 * published, must never be rewritten underneath itself.
 */
async function handleUpdateScheduledPost(payload: unknown) {
  const { id, text, scheduledAt, imageDataUrl } = (payload ?? {}) as {
    id?: string;
    text?: string;
    scheduledAt?: number;
    imageDataUrl?: string | null;
  };
  if (!id || typeof id !== 'string') {
    return { ok: false, error: { code: 'missing_id', message: 'id required' } };
  }
  const posts = await getScheduledPosts();
  const post = posts.find((p) => p.id === id);
  if (!post) {
    return { ok: false, error: { code: 'not_found', message: 'That post is no longer here.' } };
  }
  if (post.status !== 'draft' && post.status !== 'scheduled') {
    return { ok: false, error: { code: 'not_editable', message: 'That post has already gone out.' } };
  }
  const settings = await getSettings();
  const limit = tweetLimitFor(settings.xAccountPlan, settings.postLength);
  const nextText = typeof text === 'string' ? text.trim() : post.text;
  if (nextText.length === 0) {
    return { ok: false, error: { code: 'invalid_payload', message: 'Post text is required.' } };
  }
  if (effectivePostLength(nextText, post.link) > limit) {
    return {
      ok: false,
      error: { code: 'too_long', message: `Post exceeds the ${limit}-character limit.` },
    };
  }
  const updated: ScheduledPost = {
    ...post,
    text: nextText,
    ...(typeof scheduledAt === 'number' && Number.isFinite(scheduledAt) ? { scheduledAt } : {}),
    ...(imageDataUrl !== undefined ? { imageDataUrl } : {}),
  };
  await setScheduledPosts(posts.map((p) => (p.id === id ? updated : p)));
  return { ok: true, data: { post: updated } };
}

/**
 * Say yes to a drafted post: `draft` → `scheduled`, which is the only thing
 * that makes it publishable at all.
 *
 * `publishNow` moves the slot to now and kicks a tick. Approving a post Ghostly
 * wrote also feeds the trust streak — clean if the text came back exactly as
 * written, reset if a word changed, which is the rule Review already uses.
 */
async function handleApproveScheduledPost(payload: unknown) {
  const { id, text, publishNow } = (payload ?? {}) as {
    id?: string;
    text?: string;
    publishNow?: boolean;
  };
  if (!id || typeof id !== 'string') {
    return { ok: false, error: { code: 'missing_id', message: 'id required' } };
  }
  const posts = await getScheduledPosts();
  const post = posts.find((p) => p.id === id);
  if (!post) {
    return { ok: false, error: { code: 'not_found', message: 'That post is no longer here.' } };
  }
  if (post.status !== 'draft' && post.status !== 'scheduled') {
    return { ok: false, error: { code: 'not_editable', message: 'That post has already gone out.' } };
  }
  const settings = await getSettings();
  const limit = tweetLimitFor(settings.xAccountPlan, settings.postLength);
  const finalText = (typeof text === 'string' && text.trim() ? text.trim() : post.text).slice(0, 20_000);
  if (effectivePostLength(finalText, post.link) > limit) {
    return {
      ok: false,
      error: { code: 'too_long', message: `Post exceeds the ${limit}-character limit.` },
    };
  }

  const updated: ScheduledPost = {
    ...post,
    text: finalText,
    status: 'scheduled',
    ...(publishNow === true ? { scheduledAt: Date.now() } : {}),
  };
  await setScheduledPosts(posts.map((p) => (p.id === id ? updated : p)));

  // Only a post Ghostly wrote says anything about whether Ghostly's writing
  // needs correcting. One the user typed themselves is not evidence either way.
  let offer = false;
  if (post.origin === 'auto' && typeof post.generated === 'string') {
    const edited = finalText.trim() !== post.generated.trim();
    if (edited) {
      await appendCorrectedDraft({
        postText: '',
        generated: post.generated,
        corrected: finalText,
        at: new Date().toISOString(),
      });
    }
    const trust = recordApproval(normalizeTrust(settings.trust), { edited });
    await setSettings({ ...settings, trust });
    offer = hasOpenOffer(trust);
  }

  if (publishNow === true) void handleTick();
  return { ok: true, data: { post: updated, offer } };
}

/**
 * "Rewrite it" — the same idea, different words.
 *
 * Goes through the existing `/api/posts/generate` path rather than a new
 * endpoint: that one already carries the trained voice, the tone and the right
 * character limit, and a second generator would drift from the one the user has
 * been reading and correcting all along.
 */
async function handleRewritePost(payload: unknown) {
  const { text } = (payload ?? {}) as { text?: string };
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return { ok: false, error: { code: 'invalid_payload', message: 'text required' } };
  }
  const settings = await getSettings();
  const tone: TonePreset = TONE_PRESETS.includes(settings.tone) ? settings.tone : 'friendly';
  const maxChars = tweetLimitFor(settings.xAccountPlan, settings.postLength);
  const description = `Say this again a different way. Same idea, same voice, new words:\n\n${text
    .trim()
    .slice(0, 1_000)}`;
  return await apiFetch<{ text: string }>('/api/posts/generate', {
    method: 'POST',
    body: { description, tone, maxChars },
  });
}

/**
 * "Write some for me" — the auto-draft loop, run on demand.
 *
 * Bypasses the interval only, never the gates that matter: it still writes
 * drafts rather than scheduled posts unless trust has been granted, and it
 * still refuses when the queue is full.
 */
async function handleAutoDraftNow(payload: unknown) {
  const { count } = (payload ?? {}) as { count?: number };
  const settings = await getSettings();
  // Clear the interval stamp: someone pressing a button should never be told to
  // come back in six hours. That interval paces the AUTOMATIC loop.
  await setSettings({ ...settings, autoPost: { ...settings.autoPost, lastRunAt: null } });
  const result = await maybeAutoDraft(async (want) => {
    const resp = await requestPostIdeas({ count: typeof count === 'number' ? count : want });
    if (!resp.ok) throw new Error(resp.error.message);
    return resp.data.ideas;
  });
  return { ok: true, data: result };
}

/**
 * Ask (updateplan 5.2). No settings live on the server (updateplan §1), so
 * every request carries a compact snapshot of what the model needs — targets,
 * topics, pace, standing instructions. Growth and action-log data are already
 * server-side, so the server's own tools read those directly.
 */
async function handleAsk(payload: unknown) {
  const { message, history } = (payload ?? {}) as {
    message?: string;
    history?: { role: 'user' | 'assistant'; content: string }[];
  };
  if (!message || typeof message !== 'string' || !message.trim()) {
    return { ok: false, error: { code: 'invalid_payload', message: 'message required' } };
  }
  const settings = await getSettings();
  const standingInstructions = await getStandingInstructions();
  return await apiFetch('/api/ask', {
    method: 'POST',
    body: {
      message: message.trim(),
      history: Array.isArray(history) ? history : [],
      context: {
        targets: settings.targetCreators.map((t) => t.handle),
        topics: settings.homeFeed.keywords,
        searchQueries: settings.searchQueries.map((q) => q.query),
        safetyPreset: settings.safetyPreset,
        activeHours: settings.activeHours,
        isPaused: settings.isPaused,
        autoPostEnabled: settings.autoPost.enabled,
        standingInstructions,
      },
    },
  });
}

/**
 * Apply a diff the user said "Do it" to (updateplan 5.2, rule 1 — the server
 * NEVER applies one of these itself; this is the one place a proposed change
 * actually touches settings/targets/posts, and only after the user has seen
 * it and said yes). Settings changes return the prior settings so the UI can
 * offer undo (rule 2); a post always lands as a local draft/scheduled post,
 * same as every other path that creates one.
 */
async function handleAskApplyDiff(payload: unknown) {
  const { tool, args } = (payload ?? {}) as { tool?: string; args?: Record<string, unknown> };
  if (!tool) return { ok: false, error: { code: 'invalid_payload', message: 'tool required' } };
  const settings = await getSettings();

  switch (tool) {
    case 'update_settings': {
      const previous = settings;
      let next = settings;
      if (
        typeof args?.safetyPreset === 'string' &&
        (['careful', 'balanced', 'growth'] as const).includes(args.safetyPreset as SafetyPresetName)
      ) {
        next = applyPreset(next, args.safetyPreset as SafetyPresetName);
      }
      if (typeof args?.isPaused === 'boolean') next = { ...next, isPaused: args.isPaused };
      if (typeof args?.skipReplies === 'boolean') next = { ...next, skipReplies: args.skipReplies };
      if (typeof args?.autoPostEnabled === 'boolean') {
        next = { ...next, autoPost: { ...next.autoPost, enabled: args.autoPostEnabled } };
      }
      await setSettings(next);
      return { ok: true, data: { previous } };
    }
    case 'undo_settings': {
      // The UI hands back the exact snapshot `update_settings` returned —
      // never reconstructed field by field, so undo can't drift from what
      // was actually there before.
      const previous = args?.previous as ExtensionSettings | undefined;
      if (!previous) return { ok: false, error: { code: 'invalid_payload', message: 'no snapshot to restore' } };
      await setSettings(previous);
      return { ok: true, data: {} };
    }
    case 'add_target': {
      const handle = typeof args?.handle === 'string' ? args.handle.replace(/^@/, '').trim() : '';
      if (!handle) return { ok: false, error: { code: 'invalid_payload', message: 'handle required' } };
      if (settings.targetCreators.some((t) => t.handle.toLowerCase() === handle.toLowerCase())) {
        return { ok: true, data: { alreadyWatching: true } };
      }
      const addedAt = new Date().toISOString();
      await setSettings({
        ...settings,
        targetCreators: [...settings.targetCreators, { platform: 'twitter', handle, addedAt }],
      });
      await appendGrowthMilestone({ at: addedAt, kind: 'target-added', detail: `Added @${handle}` });
      return { ok: true, data: {} };
    }
    case 'remove_target': {
      const handle = typeof args?.handle === 'string' ? args.handle.replace(/^@/, '').trim() : '';
      if (!handle) return { ok: false, error: { code: 'invalid_payload', message: 'handle required' } };
      await setSettings({
        ...settings,
        targetCreators: settings.targetCreators.filter((t) => t.handle.toLowerCase() !== handle.toLowerCase()),
      });
      return { ok: true, data: {} };
    }
    case 'draft_post': {
      const text = typeof args?.text === 'string' ? args.text.trim() : '';
      if (!text) return { ok: false, error: { code: 'invalid_payload', message: 'no draft text' } };
      // Parks it at the next occurrence of the user's own active-hours start —
      // same default the "+" on an empty week-strip day already uses. A draft
      // has no permission to publish regardless of when it's parked.
      const at = new Date();
      at.setHours(settings.activeHours.startHour, 0, 0, 0);
      if (at.getTime() <= Date.now()) at.setDate(at.getDate() + 1);
      return await handleSchedulePost({ text, status: 'draft', scheduledAt: at.getTime(), generated: text });
    }
    case 'schedule_post': {
      const text = typeof args?.text === 'string' ? args.text.trim() : '';
      const atIso = typeof args?.atIso === 'string' ? args.atIso : '';
      const scheduledAt = Date.parse(atIso);
      if (!text) return { ok: false, error: { code: 'invalid_payload', message: 'no post text' } };
      if (!Number.isFinite(scheduledAt)) {
        return { ok: false, error: { code: 'invalid_payload', message: 'invalid schedule time' } };
      }
      return await handleSchedulePost({ text, status: 'scheduled', scheduledAt, generated: text });
    }
    case 'remember_instruction': {
      const instruction = typeof args?.instruction === 'string' ? args.instruction.trim() : '';
      if (!instruction) return { ok: false, error: { code: 'invalid_payload', message: 'instruction required' } };
      const list = await addStandingInstruction(instruction);
      return { ok: true, data: { standingInstructions: list } };
    }
    case 'forget_instruction': {
      const instruction = typeof args?.instruction === 'string' ? args.instruction.trim() : '';
      if (!instruction) return { ok: false, error: { code: 'invalid_payload', message: 'instruction required' } };
      const list = await removeStandingInstruction(instruction);
      return { ok: true, data: { standingInstructions: list } };
    }
    default:
      return { ok: false, error: { code: 'unknown_tool', message: `unknown tool ${tool}` } };
  }
}

async function handleGetStandingInstructions() {
  return { ok: true, data: { standingInstructions: await getStandingInstructions() } };
}
export {};
