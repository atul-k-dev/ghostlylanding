/**
 * Renders one scene of the real side panel in an ordinary page.
 *
 * The only thing faked is the browser underneath it: `installChromeShim`
 * supplies storage and the message bus, and the handler table below stands in
 * for the service worker. Every component, hook, style and state transition
 * above that line is the shipped code — which is the whole point, since these
 * renders become the product shots on the marketing site.
 */
// First: everything below reads the time as it initialises.
import './clock.js';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { bestTimes, describeSlot, scoreGrid, MIN_DAYS } from '../src/lib/best-times.js';
import { installChromeShim, onMessage, seedStorage, shimStorage } from './chrome-shim.js';
import { actionLog, baseStorage, growth, outcomes, settings, standingInstructions, user } from './fixtures.js';
import { sceneById } from './scenes.js';

installChromeShim();

const scene = sceneById(new URLSearchParams(location.search).get('scene') ?? 'hero-side-panel');
if (!scene) throw new Error('harness: unknown scene');

seedStorage({ ...baseStorage, ...(scene.storage ?? {}) });

/* -- the service worker, as a table ------------------------------------------ */

const ok = <T,>(data: T) => ({ ok: true as const, data });

onMessage('GET_AUTH', () => ({ type: 'AUTH_STATE', payload: { authenticated: true, user } }));
onMessage('GET_GROWTH', () => ok(growth));
/**
 * The real model over the fixture history, not a hand-written answer — and the
 * same superset shape the background returns, since Home wants the heatmap and
 * the composer wants the slots.
 */
onMessage('GET_BEST_TIMES', (p: { count?: number }) => {
  const best = bestTimes(outcomes, {
    activeHours: settings.activeHours,
    ...(typeof p?.count === 'number' ? { count: p.count } : {}),
  });
  return ok({
    ...best,
    labels: best.slots.map(describeSlot),
    minDays: MIN_DAYS,
    heatmap: scoreGrid(outcomes, settings.activeHours),
  });
});
onMessage('LIST_ACTION_LOG', (p: { limit?: number }) => ok({ entries: actionLog.slice(0, p?.limit ?? 30) }));
onMessage('GET_STANDING_INSTRUCTIONS', () => ok({ standingInstructions }));
onMessage('LIST_SCHEDULED_POSTS', () =>
  ok({ posts: shimStorage.get('casper.scheduledPosts') ?? [], max: 25 }),
);
onMessage('GET_SETUP_READ', () => ok(null));
onMessage('UPDATE_PREFERENCES', () => ok({ user }));

/**
 * The Ask scene's exchange, and the distinction the landing page makes: a
 * question gets an answer straight back, while anything that would CHANGE
 * something comes back as a diff the user has to approve. Both shapes in one
 * screenshot, keyed off the message so the order can't drift.
 */
const ANSWER = {
  type: 'answer' as const,
  text: `@indiehackers is your strongest by a distance — ${growth.targets[0]?.repliesSent ?? 0} replies, ${(growth.targets[0]?.engagement.likes ?? 0).toLocaleString()} likes on them. @levelsio is second. @shl has had nothing sent in three weeks, so there is no evidence either way on that one yet.`,
};

const PROPOSAL = {
  type: 'diff' as const,
  diff: {
    tool: 'update_settings' as const,
    args: { homeFeed: { follow: false }, followBack: false },
    summary:
      'Turn following off — on your home feed and on your topic feeds — and stop following people back. Likes and replies carry on exactly as they are. Nothing else changes, and you can undo it from Settings.',
  },
};

onMessage('ASK', (p: { message?: string }) =>
  ok(/follow/i.test(p?.message ?? '') ? PROPOSAL : ANSWER),
);

// Actions a screenshot never fires, answered so a stray click can't throw.
for (const type of ['ASK_APPLY_DIFF', 'APPROVE_DRAFT', 'REJECT_DRAFT', 'TRAIN_VOICE', 'CLEAR_VOICE', 'REFRESH_GROWTH']) {
  onMessage(type, () => ok({ message: 'harness' }));
}

/* -- the view ---------------------------------------------------------------- */

// Imported after the shim is installed: these modules touch `chrome` as they
// initialise (appearance.ts reads the stored theme before the first paint).
const { App } = await import('../src/sidepanel/App.js');
const { SettingsScreen } = await import('../src/sidepanel/settings/SettingsScreen.js');
const { NotificationsPage } = await import('../src/sidepanel/notifications/NotificationsPage.js');
const { Onboarding } = await import('../src/sidepanel/onboarding/Onboarding.js');
const { useNotifications } = await import('../src/sidepanel/notifications/useNotifications.js');
const { useEngineStatus } = await import('../src/sidepanel/useEngineStatus.js');
const { initAppearance } = await import('../src/sidepanel/appearance.js');
await import('../src/sidepanel/globals.css');

initAppearance();

/** Settings and Notifications are full-screen views; App wraps them exactly so. */
const Screenful = ({ children }: { children: React.ReactNode }) => (
  <div className="h-full w-full bg-canvas text-foreground">{children}</div>
);

const SettingsScene = ({ route }: { route: 'voice' | 'limits' | 'topics' | 'targets' | 'homeFeed' }) => {
  const [r, setR] = useState(route);
  return (
    <Screenful>
      <SettingsScreen
        user={user}
        route={r}
        onRoute={setR}
        onClose={() => undefined}
        onSignedOut={() => undefined}
        onOpenSetup={() => undefined}
      />
    </Screenful>
  );
};

const NotificationsScene = () => {
  const status = useEngineStatus();
  const n = useNotifications(status);
  return (
    <Screenful>
      <NotificationsPage n={n} status={status} onBack={() => undefined} onNavigate={() => undefined} />
    </Screenful>
  );
};

const Scene = () => {
  switch (scene.view.kind) {
    case 'settings':
      return <SettingsScene route={scene.view.route} />;
    case 'notifications':
      return <NotificationsScene />;
    case 'onboarding':
      return (
        <div className="h-full w-full">
          <Onboarding user={user} onFinish={() => undefined} onLater={() => undefined} />
        </div>
      );
    default:
      return <App />;
  }
};

/* -- sizing the shot --------------------------------------------------------- */

/**
 * The stage is the output canvas; the frame is the panel at its real layout
 * width, scaled to fit with a margin. Scaling with a transform (not zoom)
 * keeps the panel laid out at the width it was designed for and lets the
 * browser rasterise at the final resolution, so text stays sharp.
 */
const PAD = 0.11;
const stage = document.getElementById('stage')!;
const frame = document.getElementById('frame')!;
stage.style.width = `${scene.width}px`;
stage.style.height = `${scene.height}px`;
frame.style.width = `${scene.panel.width}px`;
frame.style.height = `${scene.panel.height}px`;
const scale = Math.min(
  (scene.width * (1 - PAD)) / scene.panel.width,
  (scene.height * (1 - PAD)) / scene.panel.height,
);
frame.style.transform = `translate(-50%, -50%) scale(${scale})`;

const root = document.getElementById('root');
if (!root) throw new Error('harness: no #root');
createRoot(root).render(<Scene />);

/* -- driving the scene ------------------------------------------------------- */

const label = (el: Element) => el.getAttribute('aria-label') ?? el.textContent?.trim() ?? '';

const findClickable = (text: string): HTMLElement | null => {
  const all = [...document.querySelectorAll<HTMLElement>('button, [role="tab"], [role="button"], a')];
  return all.find((el) => label(el) === text) ?? all.find((el) => label(el).includes(text)) ?? null;
};

const findAny = (text: string): HTMLElement | null =>
  [...document.querySelectorAll<HTMLElement>('h1, h2, h3, p, span, section')].find(
    (el) => el.textContent?.trim().startsWith(text),
  ) ?? null;

/**
 * Types into Ask's composer and sends it, the way a person would. React owns
 * the textarea's value, so the write goes through the native setter and an
 * input event rather than assigning to .value, which React would ignore.
 */
const ask = (text: string): boolean => {
  const box = document.querySelector<HTMLTextAreaElement>('textarea');
  const send = findClickable('Send');
  if (!box || !send) return false;
  const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
  setter?.call(box, text);
  box.dispatchEvent(new Event('input', { bubbles: true }));
  setTimeout(() => send.click(), 60);
  return true;
};

/** Waits for the element to exist, then acts — the panel loads asynchronously. */
const attempt = (step: string, tries = 40): Promise<void> =>
  new Promise((resolve) => {
    const [verb, ...rest] = step.split(':');
    const text = rest.join(':');
    const tick = (left: number) => {
      if (verb === 'ask') {
        if (ask(text)) {
          setTimeout(resolve, 400);
          return;
        }
      } else {
        const el = verb === 'click' ? findClickable(text) : findAny(text);
        if (el) {
          if (verb === 'click') el.click();
          else el.scrollIntoView({ block: 'start' });
          setTimeout(resolve, 160);
          return;
        }
      }
      if (left <= 0) {
        console.warn(`[harness] gave up on ${step}`);
        resolve();
        return;
      }
      setTimeout(() => tick(left - 1), 60);
    };
    tick(tries);
  });

void (async () => {
  // Let the first data pass land before touching anything.
  await new Promise((r) => setTimeout(r, 600));
  for (const step of scene.drive ?? []) await attempt(step);
  await new Promise((r) => setTimeout(r, 400));
  document.documentElement.dataset.shot = 'ready';
})();
