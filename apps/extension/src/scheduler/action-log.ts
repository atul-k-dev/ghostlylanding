import type { ActionLogInput } from '@casper/shared';
import { currentPeriodKey } from '@casper/shared';
import {
  getActionLogBuffer,
  setActionLogBuffer,
  getSchedulerState,
  setSchedulerState,
  getAuth,
  setAuth,
  getSettings,
} from '../lib/storage.js';
import { apiFetch } from '../lib/api.js';

const FLUSH_BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 5 * 60 * 1000;

/** Unique per logged action — the server's dedupe key across flush retries. */
const clientId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `a_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

export const appendActionLog = async (entry: ActionLogInput): Promise<void> => {
  const buf = await getActionLogBuffer();
  // Stamped once, here — NOT at flush time. A retried flush must send the same
  // id it sent before, or the server can't tell the retry from a new action.
  buf.push({ clientId: clientId(), ...entry });
  await setActionLogBuffer(buf);
};

export const shouldFlush = async (): Promise<boolean> => {
  const buf = await getActionLogBuffer();
  if (buf.length === 0) return false;
  if (buf.length >= FLUSH_BATCH_SIZE) return true;
  const state = await getSchedulerState();
  return Date.now() - state.lastFlushAt >= FLUSH_INTERVAL_MS;
};

/**
 * Try to flush the local buffer. Drops nothing on failure — we'll retry next tick.
 * Returns { sent, kept } so callers can log.
 */
export const flushActionLog = async (): Promise<{ sent: number; kept: number }> => {
  const buf = await getActionLogBuffer();
  if (buf.length === 0) return { sent: 0, kept: 0 };

  // Send the user's timezone alongside the batch so the server can time the
  // end-of-day recap email to their local day (kept fresh on every flush).
  const settings = await getSettings();
  const resp = await apiFetch<{ inserted: number; monthlyActionCount?: number }>(
    '/api/actions/log',
    {
      method: 'POST',
      body: { entries: buf, timezone: settings.timezone },
      // Safe to retry: every entry carries a clientId the server dedupes on, so
      // a repeated delivery can't double-count a user's actions or quota.
      retries: 3,
    },
  );

  if (!resp.ok) {
    // Keep buffer for next attempt. Don't infinitely grow — trim oldest if it's huge.
    if (buf.length > 500) {
      const trimmed = buf.slice(-500);
      await setActionLogBuffer(trimmed);
      return { sent: 0, kept: trimmed.length };
    }
    return { sent: 0, kept: buf.length };
  }

  await setActionLogBuffer([]);
  const state = await getSchedulerState();
  await setSchedulerState({ ...state, lastFlushAt: Date.now() });

  // Sync the server-authoritative monthly counter back into local auth (stamped
  // with the current month) so the free-tier gate sees the latest value on the
  // very next scheduler tick.
  if (typeof resp.data.monthlyActionCount === 'number') {
    const auth = await getAuth();
    if (auth) {
      await setAuth({
        ...auth,
        user: {
          ...auth.user,
          monthlyActionCount: resp.data.monthlyActionCount,
          actionPeriodKey: currentPeriodKey(),
        },
      });
    }
  }
  return { sent: buf.length, kept: 0 };
};
