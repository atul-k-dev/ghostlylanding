/**
 * The floating panel's pure logic (updateplan 2.2 / 2.3).
 *
 * Everything here is a function of its arguments: no DOM, no chrome APIs, no
 * React. That is what lets `scripts/floating-smoke.mts` drive the whole state
 * machine, the corner-snap maths and the viewport predicate in plain node —
 * none of which can be checked by loading the extension and looking at it.
 */

/**
 * Three states, and the transitions between them are the whole design:
 *
 *   bubble  — 44px, out of the way, but present. The default.
 *   brief   — the working panel, ~360×520.
 *   closed  — gone, because the user said so.
 *
 * `closed` is deliberately SESSION-scoped (see `usePanelState`): someone who
 * closes the panel wants it gone now, not gone forever, and a UI you can't get
 * back is a UI people uninstall. The bubble returns on the next visit.
 */
export type PanelState = 'bubble' | 'brief' | 'closed';

export type PanelEvent =
  /** Clicking the bubble. */
  | 'open'
  /** Shrinking the brief back down. */
  | 'minimize'
  /** The ✕. */
  | 'close'
  /** A fresh page load with no "closed" flag left in the session. */
  | 'restore';

export const nextPanelState = (state: PanelState, event: PanelEvent): PanelState => {
  switch (event) {
    case 'open':
      // Deliberately works from `closed` too: nothing in the page can trigger
      // it, but the keyboard shortcut can, and a user who asks for the panel
      // should get the panel.
      return 'brief';
    case 'minimize':
      return state === 'closed' ? 'closed' : 'bubble';
    case 'close':
      return 'closed';
    case 'restore':
      return state === 'closed' ? 'closed' : 'bubble';
  }
};

/* -- placement -------------------------------------------------------------- */

export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export const CORNERS: readonly Corner[] = [
  'top-left',
  'top-right',
  'bottom-left',
  'bottom-right',
] as const;

export interface Size {
  width: number;
  height: number;
}

export interface Box extends Size {
  x: number;
  y: number;
}

/** Distance from the viewport edge, in px. Matches X's own gutter closely
 *  enough that the panel reads as part of the page rather than stuck on it. */
export const PANEL_MARGIN = 16;

/** The brief. 360 is wide enough for a reply draft; 520 fits a laptop. */
export const BRIEF_SIZE: Size = { width: 360, height: 520 };

/** The bubble. 44px is the smallest comfortable touch target. */
export const BUBBLE_SIZE: Size = { width: 44, height: 44 };

/**
 * Which corner a dragged box belongs to — decided by its CENTRE, not its
 * top-left. Dragging by a corner handle otherwise snaps to the wrong side the
 * moment the box is bigger than a quarter of the screen, which the brief is on
 * a laptop.
 */
export const nearestCorner = (box: Box, viewport: Size): Corner => {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const left = cx < viewport.width / 2;
  const top = cy < viewport.height / 2;
  return `${top ? 'top' : 'bottom'}-${left ? 'left' : 'right'}` as Corner;
};

/**
 * Where a corner puts a box of this size, as `left`/`top` in px.
 *
 * Clamped to >= 0 so a panel taller or wider than the viewport still starts on
 * screen — at 520px tall the brief does not fit a short window, and the half
 * that matters is the top.
 */
export const cornerPosition = (
  corner: Corner,
  size: Size,
  viewport: Size,
  margin: number = PANEL_MARGIN,
): { left: number; top: number } => {
  const right = viewport.width - size.width - margin;
  const bottom = viewport.height - size.height - margin;
  const left = corner.endsWith('left') ? margin : Math.max(0, right);
  const top = corner.startsWith('top') ? margin : Math.max(0, bottom);
  return { left: Math.max(0, Math.min(left, Math.max(0, viewport.width - size.width))), top };
};

/** Keep a freely-dragged box inside the viewport while the pointer is down. */
export const clampToViewport = (
  point: { left: number; top: number },
  size: Size,
  viewport: Size,
  margin = 0,
): { left: number; top: number } => ({
  left: Math.max(margin, Math.min(point.left, Math.max(margin, viewport.width - size.width - margin))),
  top: Math.max(margin, Math.min(point.top, Math.max(margin, viewport.height - size.height - margin))),
});

/* -- the Spotlight predicate ------------------------------------------------ */

/** A DOM rect, reduced to the four numbers this needs. */
export interface Rect {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

/**
 * Is enough of this element on screen to be worth outlining?
 *
 * Spotlight exists to let someone WATCH the engine work, so the test is not
 * "does it intersect the viewport" — a post one pixel into view is not being
 * watched. `minVisible` is the fraction of the element's own height that has to
 * be showing, so a very tall post counts once a meaningful part of it is up.
 */
export const isInViewport = (rect: Rect, viewport: Size, minVisible = 0.5): boolean => {
  const height = rect.bottom - rect.top;
  if (height <= 0) return false;
  const visible = Math.min(rect.bottom, viewport.height) - Math.max(rect.top, 0);
  if (visible <= 0) return false;
  const horizontallyOn = rect.right > 0 && rect.left < viewport.width;
  return horizontallyOn && visible / height >= minVisible;
};
