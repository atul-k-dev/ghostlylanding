import { useCallback, useEffect, useState } from 'react';
import { STORAGE_KEYS } from '../lib/storage.js';
import {
  BRIEF_SIZE,
  BUBBLE_SIZE,
  cornerPosition,
  nextPanelState,
  type Corner,
  type PanelEvent,
  type PanelState,
  type Size,
} from './state.js';

/**
 * The floating panel's two pieces of memory (updateplan 2.2), kept apart on
 * purpose because they have different lifetimes:
 *
 *   · WHERE it sits    — `chrome.storage.local`, per origin, forever.
 *   · WHETHER it's closed — `sessionStorage`, this tab, this session only.
 *
 * Closing is a "not now", not a preference. Persisting it would mean a user who
 * dismissed the panel once has silently uninstalled the product's whole
 * on-page half, with no way back that they'd ever find.
 */

const CLOSED_KEY = 'ghostly247.panel.closed';

const readClosed = (): boolean => {
  try {
    return sessionStorage.getItem(CLOSED_KEY) === '1';
  } catch {
    // Some pages disable storage access; a panel that shows is the safe failure.
    return false;
  }
};

const writeClosed = (closed: boolean): void => {
  try {
    if (closed) sessionStorage.setItem(CLOSED_KEY, '1');
    else sessionStorage.removeItem(CLOSED_KEY);
  } catch {
    /* nothing we can do, and nothing that matters */
  }
};

export const usePanelState = (): {
  state: PanelState;
  dispatch: (event: PanelEvent) => void;
} => {
  const [state, setState] = useState<PanelState>(() => (readClosed() ? 'closed' : 'bubble'));

  const dispatch = useCallback((event: PanelEvent) => {
    setState((current) => {
      const next = nextPanelState(current, event);
      writeClosed(next === 'closed');
      return next;
    });
  }, []);

  return { state, dispatch };
};

/* -- where it sits ---------------------------------------------------------- */

type CornerMap = Record<string, Corner>;

/** x.com and twitter.com are different origins; someone who moved the panel on
 *  one has said nothing about the other. */
const originKey = (): string => {
  try {
    return location.origin;
  } catch {
    return 'unknown';
  }
};

const readCorner = async (): Promise<Corner> => {
  try {
    const got = await chrome.storage.local.get(STORAGE_KEYS.floatingPanel);
    const map = (got[STORAGE_KEYS.floatingPanel] as CornerMap | undefined) ?? {};
    return map[originKey()] ?? 'bottom-right';
  } catch {
    return 'bottom-right';
  }
};

const writeCorner = async (corner: Corner): Promise<void> => {
  try {
    const got = await chrome.storage.local.get(STORAGE_KEYS.floatingPanel);
    const map = (got[STORAGE_KEYS.floatingPanel] as CornerMap | undefined) ?? {};
    await chrome.storage.local.set({
      [STORAGE_KEYS.floatingPanel]: { ...map, [originKey()]: corner },
    });
  } catch {
    /* the panel still works, it just forgets where it was */
  }
};

/** The live viewport, because the panel is positioned in px rather than by CSS
 *  corners — one code path for "resting in a corner" and "just dropped". */
const useViewport = (): Size => {
  const [size, setSize] = useState<Size>(() => ({
    width: window.innerWidth,
    height: window.innerHeight,
  }));
  useEffect(() => {
    const onResize = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return size;
};

export const usePlacement = (
  state: PanelState,
): {
  corner: Corner;
  setCorner: (c: Corner) => void;
  viewport: Size;
  size: Size;
  resting: { left: number; top: number };
} => {
  const [corner, setLocal] = useState<Corner>('bottom-right');
  const viewport = useViewport();
  const size = state === 'brief' ? BRIEF_SIZE : BUBBLE_SIZE;

  useEffect(() => {
    void readCorner().then(setLocal);
  }, []);

  const setCorner = useCallback((c: Corner) => {
    setLocal(c);
    void writeCorner(c);
  }, []);

  return { corner, setCorner, viewport, size, resting: cornerPosition(corner, size, viewport) };
};
