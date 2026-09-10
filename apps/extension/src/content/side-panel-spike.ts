/**
 * PHASE 2.5 SPIKE — content-script side of the gesture check.
 *
 * Puts one deliberately ugly button on x.com whose only job is to fire
 * `chrome.sidePanel.open()` from a real content-script click. If the side panel
 * opens, the floating panel's "⤢ expand" button can work the same way; if it
 * doesn't, we fall back to a `chrome.commands` shortcut.
 *
 * Deliberately NOT styled like the product: it should be impossible to mistake
 * this for shipped UI, and impossible to forget to delete. Bottom-LEFT so it
 * can't be confused with the real bubble's home in the bottom-right.
 *
 * DELETE THIS FILE (and its import in content/twitter.ts) once the result is
 * recorded in updateplan.md §10.
 */
const BUTTON_ID = 'ghostly-sidepanel-spike';

export const mountSidePanelSpike = (): void => {
  if (document.getElementById(BUTTON_ID)) return;

  const button = document.createElement('button');
  button.id = BUTTON_ID;
  button.type = 'button';
  button.textContent = '⤢ SPIKE: open side panel';
  button.setAttribute('aria-label', 'Phase 2.5 spike — open the Ghostly side panel');
  button.style.cssText = [
    'position:fixed',
    'left:16px',
    'bottom:16px',
    'z-index:2147483647',
    'padding:8px 12px',
    'border:1px dashed #f44d60',
    'border-radius:6px',
    'background:#1b1b1b',
    'color:#f4f4f5',
    'font:600 12px/1 ui-monospace,SFMono-Regular,Menlo,monospace',
    'cursor:pointer',
  ].join(';');

  button.addEventListener('click', () => {
    // Fire and forget — the answer shows up in the service-worker console, and
    // the side panel either opens or it doesn't.
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL', payload: {} }, (resp) => {
      const err = chrome.runtime.lastError;
      if (err) {
        button.textContent = `⤢ SPIKE: ${err.message}`;
        return;
      }
      button.textContent =
        resp && typeof resp === 'object' && (resp as { ok?: boolean }).ok
          ? '⤢ SPIKE: sent — did it open?'
          : '⤢ SPIKE: rejected (see SW console)';
    });
  });

  document.body.appendChild(button);
};
