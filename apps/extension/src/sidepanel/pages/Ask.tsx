import { useEffect, useRef, useState } from 'react';
import { Button } from '../../ui/index.js';
import { useAsk, type ChatTurn } from '../ask/useAsk.js';

/**
 * Ask — the copilot, compact edition for the floating panel on x.com (the
 * side panel has its own page, sidepanel/ask/AskPage). Logic lives in useAsk.
 *
 * A chat over the extension's own message bus, not a direct OpenAI call: the
 * server does the reasoning and never applies anything itself — every
 * settings/target/post change comes back as a `diff` this page renders as
 * "Do it" / "Not now", and only `ASK_APPLY_DIFF` (fired on "Do it") ever
 * touches real state. That split is what makes rule 1 ("never applied
 * silently") true regardless of what this component does or doesn't render
 * correctly — the server-side gate holds either way.
 *
 * `compact` is the floating-panel brief (5.3): shorter bubbles, and any
 * answer long enough to need a table/scroll offers "open in sidebar" instead
 * of trying to cram it into 360px.
 */

/** Long enough that the floating brief (360px) is genuinely the wrong place
 *  to read it — not a table/chart detector, just a legible proxy for one. */
const COMPACT_OVERFLOW_CHARS = 320;

const AskResponse = (
  props: ChatTurn & {
    onDo: () => void;
    onDismiss: () => void;
    onUndo: () => void;
    compact: boolean;
    onOpenSidebar?: () => Promise<boolean>;
  },
) => {
  const [sidebarNote, setSidebarNote] = useState<string | null>(null);
  const openInSidebar = async () => {
    if (!props.onOpenSidebar) return;
    const opened = await props.onOpenSidebar();
    setSidebarNote(opened ? null : 'Press Alt+G to open it.');
  };

  const overflowing = props.compact && props.content.length > COMPACT_OVERFLOW_CHARS;

  return (
    <div className="space-y-2">
      <p
        className={`whitespace-pre-wrap text-xs leading-relaxed text-casper-ink/90 ${
          overflowing ? 'line-clamp-6' : ''
        }`}
      >
        {props.content}
      </p>
      {overflowing && props.onOpenSidebar && (
        <button
          type="button"
          onClick={() => void openInSidebar()}
          className="text-xs text-casper-violet transition hover:opacity-80"
        >
          That&rsquo;s easier to read in the sidebar — open it? →
        </button>
      )}
      {sidebarNote && <p className="text-xs text-casper-ink/40">{sidebarNote}</p>}

      {props.diff && !props.resolved && (
        <div className="rounded-xl border border-casper-coral/30 bg-casper-coral/5 p-2.5">
          <p className="text-xs font-medium text-casper-ink">{props.diff.summary}</p>
          <div className="mt-2 flex gap-2">
            <Button size="sm" variant="primary" onClick={props.onDo}>
              Do it
            </Button>
            <Button size="sm" variant="ghost" onClick={props.onDismiss}>
              Not now
            </Button>
          </div>
        </div>
      )}
      {props.diff && props.resolved === 'done' && (
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <span>Done.</span>
          {props.undo && (
            <button type="button" onClick={props.onUndo} className="text-casper-violet hover:opacity-80">
              Undo
            </button>
          )}
        </div>
      )}
      {props.diff && props.resolved === 'dismissed' && (
        <p className="text-xs text-casper-ink/40">Not applied.</p>
      )}

      {props.clientAction && !props.resolved && (
        <div className="rounded-xl border border-casper-border bg-casper-cloud p-2.5">
          <p className="text-xs font-medium text-casper-ink">{props.clientAction.summary}</p>
          <div className="mt-2">
            <Button size="sm" variant="secondary" onClick={props.onDo}>
              Run it
            </Button>
          </div>
        </div>
      )}
      {props.clientAction && props.resolved === 'done' && (
        <p className="text-xs text-emerald-300">Ran it — check Posts/Review for what came back.</p>
      )}
    </div>
  );
};

const StandingInstructions = ({
  instructions,
  onRemove,
}: {
  instructions: string[];
  onRemove: (i: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  if (instructions.length === 0) return null;
  return (
    <div className="border-b border-casper-border px-3 py-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs text-casper-ink/50 transition hover:text-casper-ink/80"
      >
        {open ? '▾' : '▸'} Things you&rsquo;ve told me ({instructions.length})
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1">
          {instructions.map((i) => (
            <li key={i} className="flex items-center gap-2 text-xs text-casper-ink/70">
              <span className="flex-1">{i}</span>
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label="Forget"
                className="text-casper-ink/30 hover:text-casper-coral"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export const Ask = ({
  compact = false,
  onOpenSidebar,
}: {
  compact?: boolean;
  onOpenSidebar?: () => Promise<boolean>;
}) => {
  const {
    turns,
    input,
    setInput,
    busy,
    error,
    instructions,
    nudge,
    dismissNudge,
    send,
    doIt,
    dismiss,
    undo,
    removeInstruction,
  } = useAsk();
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns.length]);

  return (
    <div className="flex h-full flex-col">
      <StandingInstructions instructions={instructions} onRemove={(i) => void removeInstruction(i)} />

      <div className={`flex-1 overflow-y-auto ${compact ? 'space-y-2 px-2.5 py-2' : 'space-y-3 p-3'}`}>
        {nudge && (
          <div className="rounded-xl border border-casper-attention/30 bg-casper-attention/[0.06] px-2.5 py-2">
            <p className="text-xs leading-relaxed text-casper-ink">{nudge.message}</p>
            <div className="mt-1.5 flex gap-2">
              <Button
                size="sm"
                variant="primary"
                onClick={() => {
                  const msg = nudge.onYesMessage;
                  dismissNudge();
                  void send(msg);
                }}
              >
                Yes
              </Button>
              <Button size="sm" variant="ghost" onClick={dismissNudge}>
                Not now
              </Button>
            </div>
          </div>
        )}
        {turns.length === 0 && (
          <p className="py-6 text-center text-xs text-casper-ink/40">
            Ask me anything — "post more", "why did I lose followers?", "stop following people".
          </p>
        )}
        {turns.map((t, i) =>
          t.role === 'user' ? (
            <div key={i} className="flex justify-end">
              <p className="max-w-[85%] rounded-xl rounded-br-sm bg-casper-violet/15 px-2.5 py-1.5 text-xs text-casper-ink">
                {t.content}
              </p>
            </div>
          ) : (
            <div key={i} className="max-w-[92%] rounded-xl rounded-bl-sm bg-casper-cloud px-2.5 py-2">
              <AskResponse
                {...t}
                compact={compact}
                onOpenSidebar={onOpenSidebar}
                onDo={() => void doIt(i)}
                onDismiss={() => dismiss(i)}
                onUndo={() => void undo(i)}
              />
            </div>
          ),
        )}
        {busy && <p className="text-xs text-casper-ink/40">Thinking…</p>}
        {error && <p className="text-xs text-rose-300">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2 border-t border-casper-border p-2.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Ask Ghostly…"
          disabled={busy}
          className="flex-1 rounded-lg border border-casper-border bg-casper-cloud px-2.5 py-1.5 text-xs focus:border-casper-violet focus:outline-none disabled:opacity-50"
        />
        <Button size="sm" variant="primary" onClick={() => void send()} disabled={busy || !input.trim()}>
          Send
        </Button>
      </div>
    </div>
  );
};
