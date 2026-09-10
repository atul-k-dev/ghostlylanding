/**
 * Mount point for the floating panel (updateplan 2.1).
 *
 * Ghostly247 works on x.com, so this is where the product belongs: on the page,
 * beside the work, rather than in a window you have to go and find.
 *
 * Three rules, none of them negotiable:
 *
 *  1. **Closed Shadow DOM.** X's CSS is aggressive and Tailwind's utilities are
 *     generic; without a shadow boundary they leak both ways — our panel picks
 *     up X's `line-height` resets, and X's timeline picks up our `.flex`. The
 *     compiled stylesheet is injected into the shadow root as a `<style>` node,
 *     which is the documented exception to §3's no-CSS-files convention.
 *  2. **A sibling of `body`, never inside X's React tree.** X re-renders its own
 *     subtree freely; anything we mount inside it is one navigation away from
 *     being torn out from under React.
 *  3. **Mount once.** The content script runs per page load, but X is a SPA —
 *     `mountFloatingPanel` is idempotent, and a MutationObserver puts the host
 *     back if X's own DOM handling ever removes it.
 */
import { createRoot, type Root } from 'react-dom/client';
import { createElement } from 'react';
// Vite compiles this to a plain string (Tailwind and all) instead of a <link>,
// which is exactly what a shadow root needs.
import theme from '../ui/theme.css?inline';
import { FloatingApp } from './FloatingApp.js';

const HOST_ID = 'ghostly247-panel';

/**
 * The host is a full-viewport, pointer-transparent layer: the panel inside it
 * positions itself and turns pointer events back on for its own box, so nothing
 * we mount can swallow a click meant for X.
 *
 * `all: initial` stops X's inherited typography reaching the host, and the
 * z-index is the maximum a browser accepts — X's own modals sit high, and a
 * panel that hides behind the reply dialog is a panel nobody trusts.
 */
const HOST_STYLE = [
  'all: initial',
  'position: fixed',
  'inset: 0',
  'z-index: 2147483647',
  'pointer-events: none',
].join(';');

/**
 * Styles for the shadow root itself. `:host` cannot be styled from inside the
 * imported sheet in a way that survives Tailwind's preflight, and the shadow
 * content needs the layer to be click-through except where the panel is.
 */
const SHADOW_RESET = `
:host { all: initial; }
.ghostly-layer {
  position: fixed;
  inset: 0;
  pointer-events: none;
  color-scheme: dark;
  /* theme.css puts these on html/body, which do not exist inside a shadow
     root — without them the panel would inherit the browser's serif default. */
  font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
    'Segoe UI', Roboto, sans-serif;
  color: var(--color-casper-fg);
  -webkit-font-smoothing: antialiased;
}
.ghostly-layer > * { pointer-events: auto; }
`;

let root: Root | null = null;
let observer: MutationObserver | null = null;

/** Kept module-local because the shadow root is CLOSED — there is no way back
 *  in from the page, which is the point. */
let shadow: ShadowRoot | null = null;

const buildHost = (): HTMLDivElement => {
  const host = document.createElement('div');
  host.id = HOST_ID;
  host.setAttribute('style', HOST_STYLE);
  // Not part of the page's content for anyone reading it with a screen reader's
  // document outline — the panel announces itself through its own landmarks.
  host.setAttribute('data-ghostly', 'panel-host');
  return host;
};

export const mountFloatingPanel = (): void => {
  if (document.getElementById(HOST_ID)) return;
  if (!document.body) return;

  const host = buildHost();
  document.body.appendChild(host);

  shadow = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = `${theme}\n${SHADOW_RESET}`;
  shadow.appendChild(style);

  const layer = document.createElement('div');
  layer.className = 'ghostly-layer';
  shadow.appendChild(layer);

  root = createRoot(layer);
  root.render(createElement(FloatingApp));

  // X is a single-page app: it swaps its own subtree constantly, and while our
  // host is a sibling of that subtree, a stray `body.innerHTML` or an extension
  // conflict would still take it out. Putting it back costs nothing and turns a
  // "the panel vanished" bug report into something nobody ever notices.
  observer?.disconnect();
  observer = new MutationObserver(() => {
    if (!document.getElementById(HOST_ID) && document.body) {
      document.body.appendChild(host);
    }
  });
  observer.observe(document.body, { childList: true });

  console.log('[casper] floating panel mounted');
};

/** Only used by tests and by a future teardown path; safe to call twice. */
export const unmountFloatingPanel = (): void => {
  observer?.disconnect();
  observer = null;
  root?.unmount();
  root = null;
  shadow = null;
  document.getElementById(HOST_ID)?.remove();
};
