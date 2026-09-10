import { useCallback, useEffect, useRef, useState } from 'react';
import { getPendingReplies, getSettings, setSettings, STORAGE_KEYS } from '../lib/storage.js';
import { Panel, TopBar, TabBar, StatusBar, type TabSpec } from '../ui/index.js';
import { useEngineStatus } from '../sidepanel/useEngineStatus.js';
import type { PanelTarget } from '../sidepanel/navigation.js';
import { Today } from '../sidepanel/pages/Today.js';
import { Review } from '../sidepanel/pages/Review.js';
import { Ask } from '../sidepanel/pages/Ask.js';
import { usePanelState, usePlacement } from './usePanel.js';
import { clampToViewport, nearestCorner, type Size } from './state.js';
import { SpotlightLine } from './SpotlightLine.js';
import { ReplyForMeCard, useReplyForMe } from './ReplyForMeCard.js';

/**
 * The floating panel (updateplan 2.2).
 *
 * Three states and nothing in between: a 44px bubble that stays out of the way,
 * a ~360×520 brief that does the work, and closed — which lasts for the session
 * and no longer, because a UI you can't get back is a UI people uninstall.
 *
 * The tabs are the side panel's own pages, not copies of them. `Now` IS
 * `Today`, `Review` IS `Review`: one implementation, two frames. A second
 * implementation of "what happened today" is a second implementation to get
 * wrong, and the two would drift within a week.
 */

type FloatingTab = 'now' | 'review' | 'ask';

const TAB_LABELS: Record<FloatingTab, string> = {
  now: 'Now',
  review: 'Review',
  ask: 'Ask',
};

/** Pointer movement past this is a drag; anything less is a click. */
const DRAG_THRESHOLD_PX = 4;

/** The Review badge, which is the one number in the shell that asks for something. */
const usePendingCount = (): number => {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const load = async () => setCount((await getPendingReplies()).length);
    void load();
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'local' && STORAGE_KEYS.pendingReplies in changes) void load();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);
  return count;
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
  const { setCorner, viewport, size, resting } = usePlacement(state);
  const status = useEngineStatus();
  const waiting = usePendingCount();
  const [tab, setTab] = useState<FloatingTab>('now');
  const [dragPos, setDragPos] = useState<{ left: number; top: number } | null>(null);
  const replyForMe = useReplyForMe();
  /** Set only when Chrome refuses to open the side panel from this click (2.5). */
  const [expandFallback, setExpandFallback] = useState(false);

  // Pressing "Reply for me" on a post is a request for the panel: open the
  // brief on Now, where the draft is about to appear. Without this the button
  // would look broken to anyone whose panel is a bubble — which is most people.
  useEffect(() => {
    if (replyForMe.status === 'idle') return;
    setTab('now');
    dispatch('open');
  }, [replyForMe.status, dispatch]);

  /** Set by a drag so the pointerup's click doesn't also open the panel. */
  const suppressClick = useRef(false);

  /**
   * Drag from wherever the panel currently is, snap to a corner on release.
   *
   * Window-level listeners rather than pointer capture: the panel lives in a
   * shadow root over someone else's page, and a drag that leaves our own box —
   * which every drag does — has to keep tracking.
   */
  const startDrag = useCallback(
    (e: React.PointerEvent, box: Size) => {
      const origin = dragPos ?? resting;
      const startX = e.clientX;
      const startY = e.clientY;
      const dx = startX - origin.left;
      const dy = startY - origin.top;
      let moved = false;

      const move = (ev: PointerEvent) => {
        if (
          !moved &&
          (Math.abs(ev.clientX - startX) > DRAG_THRESHOLD_PX ||
            Math.abs(ev.clientY - startY) > DRAG_THRESHOLD_PX)
        ) {
          moved = true;
        }
        if (!moved) return;
        setDragPos(
          clampToViewport({ left: ev.clientX - dx, top: ev.clientY - dy }, box, viewport),
        );
      };

      const up = (ev: PointerEvent) => {
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        setDragPos(null);
        if (!moved) return;
        // A drop is a choice of CORNER, not a set of coordinates: the panel has
        // to survive a window resize, another monitor, and a smaller laptop.
        suppressClick.current = true;
        setCorner(
          nearestCorner({ x: ev.clientX - dx, y: ev.clientY - dy, ...box }, viewport),
        );
      };

      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    },
    [dragPos, resting, setCorner, viewport],
  );

  /**
   * Open the side panel, and be honest when Chrome won't.
   *
   * The gesture question (2.5) is settled at runtime rather than guessed: the
   * service worker reports what `sidePanel.open()` actually did, and a refusal
   * turns the ⤢ button into the keyboard shortcut it needs to be instead of a
   * button that quietly does nothing.
   */
  const expand = async () => {
    const opened = await openSidePanel();
    setExpandFallback(!opened);
  };

  const navigate = (target: PanelTarget) => {
    if (target === 'review') return setTab('review');
    if (target === 'ask') return setTab('ask');
    if (target === 'today') return setTab('now');
    // Everything else — settings, who I watch, the account — is a place the
    // brief is too small to be, so the button opens the side panel instead of
    // pretending the page exists here.
    void expand();
  };

  const toggleSpotlight = async () => {
    const s = await getSettings();
    await setSettings({ ...s, spotlight: !s.spotlight });
  };

  if (state === 'closed') return null;

  const pos = dragPos ?? resting;
  const paused = status.settings?.isPaused ?? false;

  if (state === 'bubble') {
    return (
      <div style={{ position: 'fixed', left: pos.left, top: pos.top }}>
        <button
          type="button"
          title={`Ghostly247 — ${status.label}`}
          aria-label={`Ghostly247 — ${status.label}. Open the panel.`}
          onPointerDown={(e) => startDrag(e, size)}
          onClick={() => {
            // The bubble is both the button and the drag handle, so a drag must
            // not also count as a press.
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            dispatch('open');
          }}
          className="relative grid h-11 w-11 cursor-pointer touch-none place-items-center rounded-full border border-casper-border bg-casper-surface text-base shadow-lg transition-colors hover:border-casper-coral"
        >
          <span aria-hidden>👻</span>
          <span
            aria-hidden
            className={[
              'absolute right-0.5 bottom-0.5 h-2 w-2 rounded-full ring-2 ring-casper-surface',
              status.state === 'working'
                ? 'bg-casper-working motion-safe:animate-pulse'
                : status.state === 'attention'
                  ? 'bg-casper-attention'
                  : status.state === 'paused'
                    ? 'bg-casper-muted/50'
                    : 'bg-casper-muted',
            ].join(' ')}
          />
          {waiting > 0 && (
            <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-casper-attention px-1 text-[10px] leading-none font-semibold text-[#0e0e0e] tabular-nums">
              {waiting > 9 ? '9+' : waiting}
            </span>
          )}
        </button>
      </div>
    );
  }

  const tabs: TabSpec<FloatingTab>[] = (['now', 'review', 'ask'] as const).map((id) => ({
    id,
    label: TAB_LABELS[id],
    ...(id === 'review' && waiting > 0 ? { badge: waiting } : {}),
  }));

  return (
    <div
      style={{ position: 'fixed', left: pos.left, top: pos.top, width: size.width, height: size.height }}
      className="overflow-hidden rounded-2xl border border-casper-border shadow-2xl"
      role="complementary"
      aria-label="Ghostly247"
    >
      <Panel
        top={
          <TopBar
            title={
              <span className="flex min-w-0 items-center gap-1.5">
                {/* The drag handle. Its own element so dragging the panel and
                    pressing a toolbar button are never the same gesture. */}
                <span
                  aria-hidden
                  onPointerDown={(e) => startDrag(e, size)}
                  className="cursor-grab touch-none px-0.5 text-casper-muted select-none active:cursor-grabbing"
                >
                  ⠿
                </span>
                <button
                  type="button"
                  onClick={() => dispatch('minimize')}
                  title="Shrink to the bubble"
                  className="cursor-pointer truncate text-[13px] font-medium text-casper-fg"
                >
                  Ghostly247
                </button>
              </span>
            }
            actions={[
              {
                id: 'spotlight',
                icon: '👁',
                label: status.settings?.spotlight
                  ? 'Stop showing me what it is working on'
                  : 'Show me what it is working on',
                active: status.settings?.spotlight ?? false,
                onClick: () => void toggleSpotlight(),
              },
              {
                id: 'pause',
                icon: paused ? '▶' : '⏸',
                label: paused ? 'Start' : 'Pause everything',
                onClick: () => void status.togglePause(),
              },
              {
                id: 'expand',
                icon: '⤢',
                label: 'Open the full panel',
                onClick: () => void expand(),
              },
              {
                id: 'close',
                icon: '✕',
                label: 'Close until my next visit',
                onClick: () => dispatch('close'),
              },
            ]}
          />
        }
        tabs={<TabBar tabs={tabs} active={tab} onChange={setTab} />}
        status={<StatusBar state={status.state} label={status.label} pace={status.pace} />}
      >
        {tab === 'now' && (
          <>
            {/* Above the condition card on purpose: what is happening RIGHT NOW
                outranks what is standing in the way, for as long as it lasts. */}
            {expandFallback && (
              <div className="mx-3 mt-3 rounded-xl border border-casper-attention/45 bg-casper-attention/[0.06] px-3 py-2">
                <p className="text-xs leading-relaxed text-casper-muted">
                  Chrome won&rsquo;t let me open the full panel from this button. Press{' '}
                  <span className="font-medium text-casper-fg">Alt+G</span> and it opens.
                </p>
              </div>
            )}
            <div className="flex flex-col gap-3 px-3 pt-3 empty:hidden">
              {/* What the user asked for outranks what the engine is doing,
                  which outranks what is standing in the way. */}
              <ReplyForMeCard state={replyForMe} />
              <SpotlightLine />
            </div>
            <Today status={status} onNavigate={navigate} />
          </>
        )}
        {tab === 'review' && (
          <div className="p-3">
            <Review />
          </div>
        )}
        {tab === 'ask' && <Ask compact onOpenSidebar={openSidePanel} />}
      </Panel>
    </div>
  );
};
