/**
 * One number that matters, with what it was before underneath.
 *
 * §3: numbers that matter get to be large, and digits that stack get
 * `tabular-nums` so a counter ticking from 9 to 10 doesn't shift the layout.
 */
interface Props {
  value: number | string;
  label: string;
  /** e.g. "12 yesterday". Omitted rather than shown as "—" when unknown. */
  sub?: string;
  tone?: 'default' | 'working';
}

export const Stat = ({ value, label, sub, tone = 'default' }: Props) => (
  <div className="min-w-0">
    <div
      className={[
        'text-2xl leading-none font-semibold tabular-nums',
        tone === 'working' ? 'text-casper-working' : 'text-casper-fg',
      ].join(' ')}
    >
      {value}
    </div>
    <div className="mt-1.5 truncate text-xs text-casper-fg/85">{label}</div>
    {sub && <div className="mt-0.5 truncate text-xs text-casper-muted tabular-nums">{sub}</div>}
  </div>
);
