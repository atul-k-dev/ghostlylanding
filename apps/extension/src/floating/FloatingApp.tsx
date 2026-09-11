import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { GrowthSummary } from '@casper/shared';
import { getPendingReplies, STORAGE_KEYS } from '../lib/storage.js';
import { sendToBackground } from '../lib/messages.js';
import { useEngineStatus } from '../sidepanel/useEngineStatus.js';
import { useLiveActivity } from '../sidepanel/home/useLiveActivity.js';
import { useTodayNumbers } from '../sidepanel/home/useTodayNumbers.js';
import { usePanelState, usePlacement } from './usePanel.js';
import { BRIEF_SIZE, clampToViewport, nearestCorner, type Size } from './state.js';
import { ReplyForMeCard, useReplyForMe } from './ReplyForMeCard.js';
import { Bubble } from './Bubble';
import { Brief } from './Brief';

/**
 * The floating panel on x.com (updateplan 2.2), in the side panel's design
 * system and Appearance.
 *
 * Two states the user moves between — the bubble (status at a glance) and the
 * brief (today in one card) — plus `closed`, which the state machine keeps for
 * the session but the UI no longer offers: the expand button opens the side
 * panel, minimize goes back to the bubble.
 */

/** Pointer movement past this is a drag; anything less is a click. */
const DRAG_THRESHOLD_PX = 4;

/** Replies waiting for approval — the bubble's badge. */
const usePendingCount = (): number => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = async () => setCount((await getPendingReplies()).length);
    void load();
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: chrome.storage.AreaName) => {
      if (area === 'local' && STORAGE_KEYS.pendingReplies in changes) void load();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);
  return count;
};

/** Just the follower summary — the one number here that needs the server. */
const useFollowerSummary = () => {
  const [summary, setSummary] = useState<GrowthSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const reload = async () => {
    setLoading(true);
    try {
      const r = await sendToBackground<{ ok: true; data: GrowthSummary } | { ok: false }>({ type: 'GET_GROWTH', payload: { days: 7 } });
      if (r.ok) setSummary(r.data);
    } catch {
      /* the followers tile shows "—" until the server answers */
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void reload();
    const id = setInterval(() => void reload(), 15 * 60_000);
    return () => clearInterval(id);
  }, []);
  return { summary, loading, reload };
};

/** Ask the service worker to open the side panel for this tab (2.5). */
const openSidePanel = (): Promise<boolean> =>
  new Promise((resolve) => {
    try {
      chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL', payload: {} }, (resp) => {
        if (chrome.runtime.lastError) {
          resolve(false);
          return;
        }
        resolve(Boolean(resp && typeof resp === 'object' && (resp as { ok?: boolean }).ok));
      });
    } catch {
      resolve(false);
    }
  });

export const FloatingApp = () => {
  const { state, dispatch } = usePanelState();
  const [measured, setMeasured] = useState<Size | null>(null);
  const { corner, setCorner, viewport, size, resting } = usePlacement(state, measured);
  const status = useEngineStatus();
  const live = useLiveActivity(status);
  const followers = useFollowerSummary();
  const today = useTodayNumbers(status, followers);
  const waiting = usePendingCount();
  const replyForMe = useReplyForMe();
  const [dragPos, setDragPos] = useState<{ left: number; top: number } | null>(null);
  /** Set only when Chrome refuses to open the side panel from this click (2.5). */
  const [expandFallback, setExpandFallback] = useState(false);
  const card = useRef<HTMLDivElement>(null);

  // "Reply for me" on a post is a request for the panel — the draft is about to
  // appear in it. Without this the button would look broken from the bubble.
  useEffect(() => {
    if (replyForMe.status !== 'idle') dispatch('open');
  }, [replyForMe.status, dispatch]);

  // The side panel opening is the user moving to the big view — step back to
  // the bubble rather than show the same brief twice.
  useEffect(() => {
    const listener = (changes: { [key: string]: chrome.storage.StorageChange }, area: chrome.storage.AreaName) => {
      if (area !== 'local' || !(STORAGE_KEYS.sidePanelOpen in changes)) return;
      const { oldValue, newValue } = changes[STORAGE_KEYS.sidePanelOpen]!;
      if (newValue && !oldValue) dispatch('minimize');
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, [dispatch]);

  // The brief is as tall as its content; placement needs the real height so a
  // bottom-corner card sits on the margin instead of floating above it.
  useLayoutEffect(() => {
    if (state !== 'brief' || !card.current) {
      setMeasured(null);
      return;
    }
    const el = card.current;
    const measure = () => setMeasured({ width: BRIEF_SIZE.width, height: Math.ceil(el.getBoundingClientRect().height) });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [state]);

  /** Set by a drag so the pointerup's click doesn't also open the panel. */
  const suppressClick = useRef(false);

  /**
   * Drag from wherever the panel is, snap to a corner on release. Window-level
   * listeners rather than pointer capture: a drag that leaves our own box —
   * which every drag does — has to keep tracking.
   */
  const startDrag = useCallback(
    (e: ReactPointerEvent, box: Size) => {
      const origin = dragPos ?? resting;
      const startX = e.clientX;
      const startY = e.clientY;
      const dx = startX - origin.left;
      const dy = startY - origin.top;
      let moved = false;

      const move = (ev: PointerEvent) => {
        if (!moved && (Math.abs(ev.clientX - startX) > DRAG_THRESHOLD_PX || Math.abs(ev.clientY - startY) > DRAG_THRESHOLD_PX)) {
          moved = true;
        }
        if (!moved) return;
        setDragPos(clampToViewport({ left: ev.clientX - dx, top: ev.clientY - dy }, box, viewport));
      };

      const up = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        setDragPos(null);
        if (!moved) return;
        // A drop is a choice of CORNER, not coordinates: it has to survive a
        // resize, another monitor, and a smaller laptop.
        suppressClick.current = true;
        setCorner(nearestCorner({ x: ev.clientX - dx, y: ev.clientY - dy, ...box }, viewport));
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [dragPos, resting, setCorner, viewport],
  );

  /** Open the side panel, and be honest when Chrome won't (2.5). */
  const expand = async () => {
    const opened = await openSidePanel();
    setExpandFallback(!opened);
  };

  if (state === 'closed') return null;
  const pos = dragPos ?? resting;

  if (state === 'bubble') {
    return (
      <div style={{ position: 'fixed', left: pos.left, top: pos.top }}>
        <Bubble
          status={status}
          live={live}
          fraction={today.fraction}
          waiting={waiting}
          chipSide={corner.endsWith('right') ? 'left' : 'right'}
          onPointerDown={(e) => startDrag(e, size)}
          onClick={() => {
            // The bubble is both the button and the drag handle.
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            dispatch('open');
          }}
        />
      </div>
    );
  }

  return (
    <div
      ref={card}
      style={{ position: 'fixed', left: pos.left, top: pos.top, width: BRIEF_SIZE.width, maxHeight: viewport.height - 32 }}
      className="no-scrollbar overflow-y-auto overscroll-contain rounded-[2.25rem] bg-canvas text-foreground shadow-2xl ring-1 ring-[color:var(--card-ring)] animate-in fade-in zoom-in-95 duration-200"
      role="complementary"
      aria-label="Ghostly"
    >
      <Brief
        status={status}
        today={today}
        onDragStart={(e) => startDrag(e, size)}
        onExpand={() => void expand()}
        onMinimize={() => dispatch('minimize')}
        extra={
          <>
            {expandFallback && (
              <p className="rounded-3xl bg-casper-attention/12 px-3.5 py-2.5 text-xs leading-relaxed">
                Chrome won’t open the full panel from this button. Press <span className="font-bold">Alt+G</span> and it opens.
              </p>
            )}
            <ReplyForMeCard state={replyForMe} />
          </>
        }
      />
    </div>
  );
};
