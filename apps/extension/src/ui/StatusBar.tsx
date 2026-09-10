/**
 * The one line that is always true, at the bottom of both modes.
 *
 * Left: what the engine is doing, present tense, naming the real thing (§3 copy
 * rules) — the caller supplies the sentence, this owns the dot.
 * Right: how much of today's safe pace is spent.
 */
export type EngineState = 'working' | 'waiting' | 'attention' | 'paused';

const DOTS: Record<EngineState, string> = {
  working: 'bg-casper-working',
  waiting: 'bg-casper-muted',
  attention: 'bg-casper-attention',
  paused: 'bg-casper-muted/50',
};

interface Props {
  state: EngineState;
  /** Present tense and specific: "Reading @levelsio's new post". */
  label: string;
  /** 0–1 of today's allowance. Omit while it is not known yet. */
  pace?: number;
}

export const StatusBar = ({ state, label, pace }: Props) => (
  <footer className="flex h-8 shrink-0 items-center justify-between gap-3 border-t border-casper-border px-3 text-xs">
    <span className="flex min-w-0 items-center gap-1.5">
      <span
        aria-hidden
        className={[
          'h-1.5 w-1.5 shrink-0 rounded-full',
          DOTS[state],
          state === 'working' ? 'motion-safe:animate-pulse' : '',
        ].join(' ')}
      />
      <span className="truncate text-casper-muted">{label}</span>
    </span>
    {pace !== undefined && (
      <span className="shrink-0 text-casper-muted tabular-nums">
        {Math.round(Math.max(0, Math.min(1, pace)) * 100)}% of safe pace
      </span>
    )}
  </footer>
);
