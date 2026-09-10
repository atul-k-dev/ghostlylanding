/**
 * One line of "here is what I actually did", for the live feed on Today.
 *
 * Reads as a sentence, not a row of fields: `9:41  Liked @levelsio's post`. The
 * time is the only column, because scanning down timestamps is how a person
 * checks the engine is still alive.
 */
interface Props {
  /** Already formatted in the user's locale — this component does no dates. */
  time: string;
  /** Past tense and specific: "Liked @levelsio's post". */
  text: string;
  /** Opens the post. Omitted when there is nothing to open. */
  href?: string;
  tone?: 'default' | 'attention';
}

export const FeedLine = ({ time, text, href, tone = 'default' }: Props) => {
  const row = (
    <>
      <time className="w-11 shrink-0 text-casper-muted tabular-nums">{time}</time>
      <span
        className={[
          'min-w-0 flex-1 truncate',
          tone === 'attention' ? 'text-casper-attention' : 'text-casper-fg/90',
          href ? 'group-hover:text-casper-coral' : '',
        ].join(' ')}
      >
        {text}
      </span>
    </>
  );
  return href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group flex items-baseline gap-2 rounded-md px-1 py-1 text-xs transition-colors hover:bg-casper-surface"
    >
      {row}
    </a>
  ) : (
    <div className="flex items-baseline gap-2 px-1 py-1 text-xs">{row}</div>
  );
};
