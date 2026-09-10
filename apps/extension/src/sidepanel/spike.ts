/**
 * PHASE 2.5 SPIKE — side panel gesture check.
 *
 * This page exists to answer exactly one question, and then to be deleted:
 *
 *   Does chrome.sidePanel.open() succeed when the gesture originates in a
 *   CONTENT SCRIPT click, rather than in an extension page?
 *
 * It matters because the whole floating-panel design hangs the "⤢ expand"
 * button off that call. Chrome requires a user gesture to open the panel, and
 * whether a content-script click carries that gesture across the message
 * boundary to the service worker is not answerable by reading code — hence a
 * spike rather than an assumption baked into a phase.
 *
 * Phase 1.2 replaces this file with the real app shell.
 */
const root = document.getElementById('root');

if (root) {
  root.innerHTML = `
    <main style="
      font: 14px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif;
      background: #0e0e0e; color: #f4f4f5;
      margin: 0; padding: 20px; min-height: 100vh;
    ">
      <p style="
        font: 600 11px/1 ui-monospace, monospace;
        letter-spacing: .14em; text-transform: uppercase;
        color: #f44d60; margin: 0 0 14px;
      ">Phase 2.5 spike</p>

      <h1 style="font-size: 20px; font-weight: 600; margin: 0 0 10px;">
        The side panel opened.
      </h1>

      <p style="color: #a1a1aa; margin: 0 0 16px;">
        If you got here by clicking the <strong style="color:#f4f4f5">Open side panel</strong>
        button on x.com, the content-script gesture carries through and the
        floating panel's <strong style="color:#f4f4f5">⤢</strong> button can call
        <code style="color:#ff6467">chrome.sidePanel.open()</code> directly.
      </p>

      <p style="color: #a1a1aa; margin: 0 0 16px;">
        If it only opens from the toolbar icon, the fallback applies: register a
        <code style="color:#ff6467">chrome.commands</code> shortcut
        (<strong style="color:#f4f4f5">Alt+G</strong>) and have <strong style="color:#f4f4f5">⤢</strong>
        prompt for it instead.
      </p>

      <p style="
        border-left: 2px solid #2e2e2e; padding-left: 14px;
        color: #6c6c75; font-size: 13px; margin: 22px 0 0;
      ">
        Record the result in <code>updateplan.md</code> §10, then delete this file
        when Phase 1.2 lands the real shell.
      </p>
    </main>
  `;
}

export {};
