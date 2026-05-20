import type { ActionLogInput } from '@casper/shared';
import {
  getActionLogBuffer,
  setActionLogBuffer,
  getSchedulerState,
  setSchedulerState,
  getAuth,
  setAuth,
} from '../lib/storage.js';
import { apiFetch } from '../lib/api.js';

const FLUSH_BATCH_SIZE = 10;
const FLUSH_INTERVAL_MS = 5 * 60 * 1000;

export const appendActionLog = async (entry: ActionLogInput): Promise<void> => {
  const buf = await getActionLogBuffer();
  buf.push(entry);
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

  const resp = await apiFetch<{ inserted: number; lifetimeActionCount?: number }>(
    '/api/actions/log',
    { method: 'POST', body: { entries: buf } },
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

  // Sync the server-authoritative lifetime counter back into local auth so the
  // free-tier gate sees the latest value on the very next scheduler tick.
  if (typeof resp.data.lifetimeActionCount === 'number') {
    const auth = await getAuth();
    if (auth) {
      await setAuth({
        ...auth,
        user: { ...auth.user, lifetimeActionCount: resp.data.lifetimeActionCount },
      });
    }
  }
  return { sent: buf.length, kept: 0 };
};
