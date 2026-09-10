/* eslint-disable no-console */
/**
 * Floating-panel smoke (updateplan 2.2).
 *
 * Pure logic only — no DOM, no React, no chrome. What is worth pinning here is
 * exactly what you cannot check by loading the extension and looking at it:
 *
 *   · the state machine, including "closed lasts for the session and no longer"
 *   · the corner-snap maths, including a viewport smaller than the panel
 *   · the Spotlight viewport predicate, which decides whether an outline is
 *     something the user can actually watch or a decoration below the fold
 *
 * Run with: pnpm --filter @casper/extension floating-smoke
 */
import {
  nextPanelState,
  nearestCorner,
  cornerPosition,
  clampToViewport,
  isInViewport,
  CORNERS,
  PANEL_MARGIN,
  BRIEF_SIZE,
  BUBBLE_SIZE,
  type PanelState,
} from '../src/floating/state.js';

const fails: string[] = [];
const assert = (cond: boolean, label: string) => {
  if (cond) {
    console.log('✓', label);
  } else {
    console.log('✗', label);
    fails.push(label);
  }
};
const eq = (actual: unknown, expected: unknown, label: string) => {
  const ok = actual === expected;
  assert(ok, ok ? label : `${label}\n    got:  ${String(actual)}\n    want: ${String(expected)}`);
};

/* -- 1. the state machine --------------------------------------------------- */

eq(nextPanelState('bubble', 'open'), 'brief', 'clicking the bubble opens the brief');
eq(nextPanelState('brief', 'minimize'), 'bubble', 'the brief shrinks back to the bubble');
eq(nextPanelState('brief', 'close'), 'closed', 'the ✕ closes it');
eq(nextPanelState('bubble', 'close'), 'closed', 'the bubble can be closed too');
eq(
  nextPanelState('closed', 'restore'),
  'closed',
  'a closed panel stays closed while the session lasts',
);
eq(
  nextPanelState('bubble', 'restore'),
  'bubble',
  'a new session with no closed flag comes back as the bubble',
);
eq(
  nextPanelState('closed', 'open'),
  'brief',
  'a closed panel can still be opened deliberately — never trap a user in a UI they closed',
);
eq(nextPanelState('closed', 'minimize'), 'closed', 'minimize does not resurrect a closed panel');

// Every state × every event lands somewhere legal — no undefined states.
const STATES: PanelState[] = ['bubble', 'brief', 'closed'];
for (const s of STATES) {
  for (const e of ['open', 'minimize', 'close', 'restore'] as const) {
    const next = nextPanelState(s, e);
    assert(STATES.includes(next), `${s} + ${e} lands in a real state (${next})`);
  }
}

/* -- 2. corner snapping ----------------------------------------------------- */

const viewport = { width: 1440, height: 900 };

eq(
  nearestCorner({ x: 20, y: 20, ...BUBBLE_SIZE }, viewport),
  'top-left',
  'a bubble near the top left snaps top-left',
);
eq(
  nearestCorner({ x: 1380, y: 840, ...BUBBLE_SIZE }, viewport),
  'bottom-right',
  'a bubble near the bottom right snaps bottom-right',
);
eq(
  nearestCorner({ x: 30, y: 800, ...BUBBLE_SIZE }, viewport),
  'bottom-left',
  'a bubble near the bottom left snaps bottom-left',
);
// The brief is 360×520 — bigger than a quarter of a laptop screen — so snapping
// on the top-left CORNER instead of the centre sends it to the wrong side.
eq(
  nearestCorner({ x: 900, y: 500, ...BRIEF_SIZE }, viewport),
  'bottom-right',
  'the brief snaps by its centre, not its corner',
);
eq(
  nearestCorner({ x: 700, y: 100, ...BRIEF_SIZE }, viewport),
  'top-right',
  'a brief whose top-left is left of centre still snaps right when its centre is',
);

const br = cornerPosition('bottom-right', BRIEF_SIZE, viewport);
eq(br.left, 1440 - 360 - PANEL_MARGIN, 'bottom-right leaves the margin on the right');
eq(br.top, 900 - 520 - PANEL_MARGIN, 'bottom-right leaves the margin at the bottom');
const tl = cornerPosition('top-left', BRIEF_SIZE, viewport);
eq(tl.left, PANEL_MARGIN, 'top-left sits at the margin');
eq(tl.top, PANEL_MARGIN, 'top-left sits at the margin vertically');

// A short window: the brief is taller than the viewport. It must start ON
// screen — the top of a panel is the half that matters.
const short = cornerPosition('bottom-right', BRIEF_SIZE, { width: 1024, height: 400 });
eq(short.top, 0, 'a panel taller than the window still starts at the top of it');
const narrow = cornerPosition('bottom-right', BRIEF_SIZE, { width: 300, height: 900 });
eq(narrow.left, 0, 'a panel wider than the window still starts at its left edge');

for (const corner of CORNERS) {
  const p = cornerPosition(corner, BUBBLE_SIZE, viewport);
  assert(
    p.left >= 0 && p.top >= 0 && p.left + BUBBLE_SIZE.width <= viewport.width,
    `${corner} keeps the bubble on screen`,
  );
}

/* -- 3. dragging ------------------------------------------------------------ */

eq(
  clampToViewport({ left: -200, top: -200 }, BRIEF_SIZE, viewport).left,
  0,
  'a drag past the left edge is clamped',
);
eq(
  clampToViewport({ left: 5000, top: 5000 }, BRIEF_SIZE, viewport).top,
  900 - 520,
  'a drag past the bottom edge is clamped',
);
eq(
  clampToViewport({ left: 400, top: 300 }, BRIEF_SIZE, viewport).left,
  400,
  'a drag inside the viewport is left alone',
);
eq(
  clampToViewport({ left: 100, top: 100 }, BRIEF_SIZE, { width: 300, height: 400 }).left,
  0,
  'a viewport smaller than the panel clamps to its origin rather than going negative',
);

/* -- 4. the Spotlight predicate --------------------------------------------- */

const vp = { width: 1440, height: 900 };
assert(
  isInViewport({ top: 100, bottom: 400, left: 300, right: 900 }, vp),
  'a post in the middle of the screen is watchable',
);
assert(
  !isInViewport({ top: -400, bottom: 20, left: 300, right: 900 }, vp),
  'a post scrolled almost entirely off the top is not',
);
assert(
  !isInViewport({ top: 880, bottom: 1200, left: 300, right: 900 }, vp),
  'a post one sliver into view at the bottom is not — an outline nobody can see is not Spotlight',
);
assert(
  isInViewport({ top: 700, bottom: 900, left: 300, right: 900 }, vp),
  'a post half on screen counts at the default threshold',
);
assert(
  !isInViewport({ top: 100, bottom: 400, left: 1500, right: 1800 }, vp),
  'a post scrolled off to the side does not count',
);
assert(
  !isInViewport({ top: 100, bottom: 100, left: 300, right: 900 }, vp),
  'a zero-height element is never watchable',
);
assert(
  isInViewport({ top: -100, bottom: 900, left: 0, right: 900 }, vp, 0.5),
  'a very tall post counts once enough of it is showing',
);

if (fails.length > 0) {
  console.log(`\n${fails.length} FAILED`);
  for (const f of fails) console.log(' -', f);
  process.exit(1);
}
console.log('\n🎉 floating-smoke OK');
