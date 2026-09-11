import { useEffect, useState } from 'react';
import type { AskDiff, AskResult, ExtensionSettings, GrowthSummary } from '@casper/shared';
import { sendToBackground } from '../../lib/messages.js';
import { getCorrectedDrafts, getPostOutcomes } from '../../lib/storage.js';
import { detectProactiveNudge, type ProactiveNudge } from '../../lib/proactive.js';

/**
 * The copilot's state and actions for the Ask page (updateplan 5.2).
 *
 * A chat over the extension's own message bus, not a direct model call: the
 * server does the reasoning and never applies anything itself — every
 * settings/target/post change comes back as a `diff` the UI renders as
 * "Do it" / "Not now", and only `ASK_APPLY_DIFF` (fired on "Do it") ever
 * touches real state. That split is what makes "never applied silently" true
 * regardless of what any UI renders — the server-side gate holds either way.
 */
export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
  /** Present only on the assistant turn that proposed something. */
  diff?: AskDiff;
  clientAction?: { action: string; summary: string };
  /** Once answered, a proposal stops offering its buttons — never re-appliable
   *  by scrolling back up and clicking again. */
  resolved?: 'done' | 'dismissed';
  undo?: { tool: 'update_settings'; previous: ExtensionSettings };
}

type Resp<T> = { ok: true; data: T } | { ok: false; error: { message: string } | string };
const errText = (e: { message: string } | string) => (typeof e === 'string' ? e : e.message);

export const useAsk = () => {
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<string[]>([]);
  const [nudge, setNudge] = useState<ProactiveNudge | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);

  const loadInstructions = () =>
    void sendToBackground<Resp<{ standingInstructions: string[] }>>({ type: 'GET_STANDING_INSTRUCTIONS', payload: {} }).then(
      (r) => {
        if (r.ok) setInstructions(r.data.standingInstructions);
      },
    );

  useEffect(() => {
    loadInstructions();
    // Proactive questions (updateplan 6.2) — a deterministic pattern over data
    // already shown elsewhere, never a model call, so it can't invent a trend.
    // At most one, and only on the first open of a session. The standout-day
    // detector needs the FULL outcome history, not the top-5 GET_GROWTH returns.
    void (async () => {
      const [growth, outcomes, corrected] = await Promise.all([
        sendToBackground<Resp<GrowthSummary>>({ type: 'GET_GROWTH', payload: { days: 30 } }),
        getPostOutcomes(),
        getCorrectedDrafts(),
      ]);
      if (!growth.ok) return;
      setNudge(detectProactiveNudge({ outcomes, targets: growth.data.targets, corrected }));
    })();
  }, []);

  const send = async (override?: string) => {
    const message = (override ?? input).trim();
    if (!message || busy) return;
    if (!override) setInput('');
    setError(null);
    setLastMessage(message);
    const history = turns.map((t) => ({ role: t.role, content: t.content }));
    setTurns((t) => [...t, { role: 'user', content: message }]);
    setBusy(true);
    try {
      const resp = await sendToBackground<Resp<AskResult>>({ type: 'ASK', payload: { message, history } });
      if (!resp.ok) {
        setError(errText(resp.error));
        return;
      }
      const r = resp.data;
      const turn: ChatTurn =
        r.type === 'diff'
          ? { role: 'assistant', content: r.diff.summary, diff: r.diff }
          : r.type === 'client_action'
            ? { role: 'assistant', content: r.summary, clientAction: { action: r.action, summary: r.summary } }
            : { role: 'assistant', content: r.text };
      setTurns((t) => [...t, turn]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setBusy(false);
    }
  };

  /** Send the last message again after an error (it's already in the chat). */
  const retry = async () => {
    if (!lastMessage) return;
    setTurns((t) => (t[t.length - 1]?.role === 'user' ? t.slice(0, -1) : t));
    await send(lastMessage);
  };

  const doIt = async (index: number) => {
    const turn = turns[index];
    if (!turn) return;
    if (turn.diff) {
      const resp = await sendToBackground<Resp<{ previous?: ExtensionSettings }>>({
        type: 'ASK_APPLY_DIFF',
        payload: { tool: turn.diff.tool, args: turn.diff.args },
      });
      if (!resp.ok) {
        setError(errText(resp.error));
        return;
      }
      if (turn.diff.tool === 'remember_instruction' || turn.diff.tool === 'forget_instruction') loadInstructions();
      setTurns((t) =>
        t.map((x, i) =>
          i === index
            ? {
                ...x,
                resolved: 'done',
                ...(turn.diff?.tool === 'update_settings' && resp.data.previous
                  ? { undo: { tool: 'update_settings' as const, previous: resp.data.previous } }
                  : {}),
              }
            : x,
        ),
      );
    } else if (turn.clientAction?.action === 'run_dry_run') {
      setTurns((t) => t.map((x, i) => (i === index ? { ...x, resolved: 'done' } : x)));
      try {
        await sendToBackground({ type: 'DRY_RUN', payload: {} });
      } catch {
        /* the resolved state is honest enough even if this failed silently */
      }
    }
  };

  const dismiss = (index: number) => setTurns((t) => t.map((x, i) => (i === index ? { ...x, resolved: 'dismissed' } : x)));

  const undo = async (index: number) => {
    const turn = turns[index];
    if (!turn?.undo) return;
    await sendToBackground({ type: 'ASK_APPLY_DIFF', payload: { tool: 'undo_settings', args: { previous: turn.undo.previous } } });
    setTurns((t) => t.map((x, i) => (i === index ? { ...x, undo: undefined, resolved: 'dismissed' } : x)));
  };

  const removeInstruction = async (instruction: string) => {
    const resp = await sendToBackground<Resp<{ standingInstructions: string[] }>>({
      type: 'ASK_APPLY_DIFF',
      payload: { tool: 'forget_instruction', args: { instruction } },
    });
    if (resp.ok) setInstructions(resp.data.standingInstructions);
  };

  const reset = () => {
    setTurns([]);
    setError(null);
    setInput('');
  };

  return {
    turns,
    input,
    setInput,
    busy,
    error,
    instructions,
    nudge,
    dismissNudge: () => setNudge(null),
    send,
    retry,
    doIt,
    dismiss,
    undo,
    removeInstruction,
    reset,
  };
};

export type AskState = ReturnType<typeof useAsk>;
