/**
 * Ship local diagnostics to the server.
 *
 * The extension has always recorded selector misses, tab timeouts and
 * auto-pauses into a local ring buffer — visible only to the one user, in a
 * panel most never open. So when X changed its DOM and every install broke at
 * once, the first signal was a support email days later.
 *
 * This flushes them to the server on their own timer (see
 * shouldFlushDiagnostics). Entries are marked as sent rather than deleted, so
 * the user's own Diagnostics panel keeps showing its full history.
 */
import {
  getDiagnostics,
  setDiagnostics,
  getStoredSelectorConfig,
  getSchedulerState,
  setSchedulerState,
} from '../lib/storage.js';
import { apiFetch } from '../lib/api.js';

/** Never send more than this in one request (the server caps it too). */
const MAX_BATCH = 100;

/** Minimum gap between diagnostic flushes. */
const FLUSH_INTERVAL_MS = 5 * 60 * 1000;

/**
 * Is there anything to report, and has enough time passed?
 *
 * Deliberately independent of the action-log buffer: when a selector breaks,
 * NOTHING succeeds, so there are no action logs to piggyback on — and the
 * telemetry would go quiet precisely when it matters.
 */
export const shouldFlushDiagnostics = async (): Promise<boolean> => {
  const all = await getDiagnostics();
  if (!all.some((d) => !d.sent)) return false;
  const state = await getSchedulerState();
  return Date.now() - (state.lastDiagFlushAt ?? 0) >= FLUSH_INTERVAL_MS;
};

/**
 * Send any diagnostics we haven't sent yet. Best-effort: on failure nothing is
 * marked, so the next flush retries. Never throws — telemetry must not be able
 * to break the tick that calls it.
 */
export const flushDiagnostics = async (): Promise<number> => {
  try {
    const all = await getDiagnostics();
    const unsent = all.filter((d) => !d.sent);
    if (unsent.length === 0) return 0;

    const batch = unsent.slice(-MAX_BATCH);
    const selectorConfig = await getStoredSelectorConfig();

    // Stamp the attempt before sending so a server that's down can't put us in
    // a tight retry loop on every 30-second tick.
    const state = await getSchedulerState();
    await setSchedulerState({ ...state, lastDiagFlushAt: Date.now() });

    const resp = await apiFetch<{ inserted: number }>('/api/diagnostics', {
      method: 'POST',
      body: {
        entries: batch.map((d) => ({
          kind: d.kind,
          context: d.context,
          ...(d.detail ? { detail: d.detail.slice(0, 500) } : {}),
          at: d.at,
        })),
        extensionVersion: chrome.runtime.getManifest().version,
        ...(selectorConfig?.version ? { selectorVersion: selectorConfig.version } : {}),
      },
    });
    if (!resp.ok) return 0;

    // Mark exactly what we sent — entries added while the request was in flight
    // must stay unsent rather than being silently dropped.
    const sentKeys = new Set(batch.map((d) => `${d.at}|${d.kind}|${d.context}`));
    const current = await getDiagnostics();
    await setDiagnostics(
      current.map((d) =>
        sentKeys.has(`${d.at}|${d.kind}|${d.context}`) ? { ...d, sent: true } : d,
      ),
    );
    return batch.length;
  } catch {
    return 0;
  }
};
