import { useEngineStatus } from '../sidepanel/useEngineStatus.js';

/**
 * The floating panel's root (updateplan 2.1).
 *
 * At this step it is the bubble and nothing else: 44px, bottom-right, showing
 * the same engine state the side panel's status bar shows. That is deliberately
 * the whole of 2.1 — the thing worth proving here is the mount (closed shadow
 * root, no style bleed either way, one instance across SPA navigation), and a
 * bubble driven by real state proves it in a way a coloured square would not.
 *
 * 2.2 turns this into the three-state machine (bubble · brief · closed) with the
 * toolbar and tabs around it.
 */

const DOT: Record<string, string> = {
  working: 'bg-casper-working',
  waiting: 'bg-casper-muted',
  attention: 'bg-casper-attention',
  paused: 'bg-casper-muted/50',
};

export const FloatingApp = () => {
  const status = useEngineStatus();

  return (
    <div className="fixed right-4 bottom-4">
      <button
        type="button"
        title={status.label}
        aria-label={`Ghostly247 — ${status.label}`}
        className="relative grid h-11 w-11 cursor-pointer place-items-center rounded-full border border-casper-border bg-casper-surface text-base shadow-lg transition-colors hover:border-casper-coral"
      >
        <span aria-hidden>👻</span>
        <span
          aria-hidden
          className={[
            'absolute right-0.5 bottom-0.5 h-2 w-2 rounded-full ring-2 ring-casper-surface',
            DOT[status.state] ?? 'bg-casper-muted',
            status.state === 'working' ? 'motion-safe:animate-pulse' : '',
          ].join(' ')}
        />
      </button>
    </div>
  );
};
