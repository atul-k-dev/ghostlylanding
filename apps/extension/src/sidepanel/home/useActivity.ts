import { useEffect, useState } from 'react';
import type { ActionLog, ActionLogInput, ActionType } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import { getActionLogBuffer, STORAGE_KEYS } from '../../lib/storage.js';

/**
 * What Ghostly has done — the status card's Done view. (What it is doing right
 * now is useLiveActivity.)
 *
 * It merges the server log with the local buffer that hasn't been flushed
 * yet — the buffer only uploads every few minutes, and an action that just
 * happened should show up now, not after the next flush.
 */
export interface ActivityItem {
  id: string;
  time: string;
  /** The account involved, when there is one. */
  handle: string | null;
  kind: ActionType;
  text: string;
  state: 'done' | 'failed';
  href?: string;
}

const at = (handle: string | null | undefined) => (handle ? `@${handle.replace(/^@/, '')}` : null);

const DONE_VERB: Record<ActionType, string> = {
  like: 'Liked',
  comment: 'Replied to',
  follow: 'Followed',
  bookmark: 'Bookmarked',
  repost: 'Reposted',
  quote: 'Quoted',
};

const describeDone = (e: Pick<ActionLog, 'actionType' | 'targetHandle' | 'success'>) => {
  const who = at(e.targetHandle);
  const verb = DONE_VERB[e.actionType] ?? e.actionType;
  if (e.actionType === 'follow') return `${verb} ${who ?? 'someone'}`;
  return who ? `${verb} ${who}’s post` : `${verb} a post`;
};

const toDone = (e: ActionLogInput & { id?: string }, i: number): ActivityItem => ({
  id: e.id ?? e.clientId ?? `local-${i}`,
  time: e.timestamp,
  handle: e.targetHandle ?? null,
  kind: e.actionType,
  text: describeDone(e),
  state: e.success ? 'done' : 'failed',
  ...(e.targetUrl ? { href: e.targetUrl } : {}),
});

export const useActivity = () => {
  const [done, setDone] = useState<ActivityItem[] | null>(null);
  const [offline, setOffline] = useState(false);

  const loadDone = async () => {
    const local = await getActionLogBuffer();
    let server: ActionLog[] = [];
    try {
      const resp = await sendToBackground<{ ok: true; data: { entries: ActionLog[] } } | { ok: false }>({
        type: 'LIST_ACTION_LOG',
        payload: { limit: 30 },
      });
      if (resp.ok) server = resp.data.entries;
      setOffline(!resp.ok);
    } catch {
      setOffline(true);
    }
    const seen = new Set(server.map((e) => e.clientId).filter(Boolean));
    const merged = [...server, ...local.filter((e) => !e.clientId || !seen.has(e.clientId))]
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
      .slice(0, 30);
    setDone(merged.map(toDone));
  };

  useEffect(() => {
    void loadDone();
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: chrome.storage.AreaName) => {
      if (area !== 'local') return;
      if (STORAGE_KEYS.actionLogBuffer in changes) void loadDone();
    };
    chrome.storage.onChanged.addListener(listener);
    // The server log also changes when another device acts; a slow poll covers it.
    const id = setInterval(() => void loadDone(), 30_000);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
      clearInterval(id);
    };
  }, []);

  return { done, offline };
};
