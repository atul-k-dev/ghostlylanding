import { useEffect, useState } from 'react';
import type { PendingReply } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import { getPendingReplies, STORAGE_KEYS } from '../../lib/storage.js';

type Resp = { ok: true; data: { taskId: string; offer?: boolean } } | { ok: false; error: { message: string } | string };

/**
 * The replies waiting on a human, oldest first — the one that has waited
 * longest is the one to decide next. Same background messages as the Review
 * page (APPROVE_DRAFT / REJECT_DRAFT), so the engine can't tell them apart.
 */
export const useReplyQueue = (paused: boolean) => {
  const [replies, setReplies] = useState<PendingReply[]>([]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = async () => {
    const list = await getPendingReplies();
    setReplies([...list].sort((a, b) => a.createdAt - b.createdAt));
  };

  useEffect(() => {
    void load();
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: chrome.storage.AreaName) => {
      if (area === 'local' && STORAGE_KEYS.pendingReplies in changes) void load();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  const run = async (work: () => Promise<string>) => {
    setBusy(true);
    setNote(null);
    try {
      setNote(await work());
    } catch (err) {
      setNote(err instanceof Error ? err.message : 'That did not work');
    } finally {
      setBusy(false);
      await load();
    }
  };

  const approveOne = async (id: string, text: string, bulk = false) => {
    const resp = await sendToBackground<Resp>({
      type: 'APPROVE_DRAFT',
      payload: { id, text, ...(bulk ? { bulk: true } : {}) },
    });
    if (!resp.ok) throw new Error(typeof resp.error === 'string' ? resp.error : resp.error.message);
  };

  const approve = (id: string, text: string) =>
    run(async () => {
      await approveOne(id, text);
      return paused ? 'Approved — it posts once autopilot is on.' : 'Approved — posting it now.';
    });

  const reject = (id: string) =>
    run(async () => {
      await sendToBackground({ type: 'REJECT_DRAFT', payload: { id } });
      return 'Skipped — I won’t reply to that one.';
    });

  /** Sequential and marked bulk: a sweep doesn't count toward the trust streak. */
  const approveAll = () =>
    run(async () => {
      for (const r of replies) await approveOne(r.id, r.draftText, true);
      return 'All approved — I’ll post them at a human pace.';
    });

  return { replies, busy, note, approve, reject, approveAll };
};
