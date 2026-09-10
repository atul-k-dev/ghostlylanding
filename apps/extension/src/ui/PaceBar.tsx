/**
 * How much of today's safe allowance is spent.
 *
 * Green while there is room, amber at the cap — because "nothing more today" is
 * a state the user may want to act on (raise the preset, or wait), and amber is
 * this UI's one "needs a human" colour. It is never coral: coral is the brand
 * and the Spotlight, and a coral progress bar would read as an alarm.
 */
interface Props {
  /** 0–1. Values above 1 clamp; the engine can overshoot slightly on retries. */
  fraction: number;
  className?: string;
}

export const PaceBar = ({ fraction, className = '' }: Props) => {
  const pct = Math.max(0, Math.min(1, Number.isFinite(fraction) ? fraction : 0));
  const atCap = pct >= 1;
  return (
    <div
      className={['h-1 w-full overflow-hidden rounded-full bg-casper-border', className].join(' ')}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      aria-label="Safe pace used today"
    >
      <div
        className={[
          'h-full rounded-full transition-[width] duration-500 ease-out',
          atCap ? 'bg-casper-attention' : 'bg-casper-working',
        ].join(' ')}
        style={{ width: `${pct * 100}%` }}
      />
    </div>
  );
};
