import { useEffect, useState } from 'react';
import { getScheduledPosts, STORAGE_KEYS } from '../../lib/storage.js';
import { NOTICE_COPY, PROFILE_QUIET_MS, fill } from '../conditions.js';

/**
 * "Your profile's gone quiet." — the top card on Posts (updateplan 3.4).
 *
 * The plan writes this card's copy one way and `docs/ui-copy.md` writes it
 * another. The doc wins: it is the fixed source of truth for every "needs you"
 * string, and 1.7 already resolved the `{n}` in it (profile visits this week is
 * a figure nothing in this codebase measures, so the doc's own instruction is
 * to drop that sentence rather than guess a number).
 *
 * Its button is not a nav — the user is already on Posts. It writes, here, now,
 * which is the whole point of a nudge: never show a blocked state without the
 * button that unblocks it.
 */
export const QuietNudge = ({
  onWriteTwo,
  busy,
}: {
  onWriteTwo: () => void;
  busy: boolean;
}) => {
  const [quiet, setQuiet] = useState(false);

  useEffect(() => {
    const load = async () => {
      const posts = await getScheduledPosts();
      const published = posts
        .filter((p) => p.status === 'posted' && typeof p.postedAt === 'number')
        .map((p) => p.postedAt as number);
      // A profile that has NEVER published isn't quiet, it's new. Same rule as
      // `resolveNotice` — telling a first-day user their profile went quiet
      // would be a lie in the one voice that must never lie.
      const last = published.length > 0 ? Math.max(...published) : null;
      const pendingSoon = posts.some((p) => p.status === 'scheduled');
      setQuiet(last !== null && !pendingSoon && Date.now() - last >= PROFILE_QUIET_MS);
    };
    void load();
    const listener = (
      changes: { [key: string]: chrome.storage.StorageChange },
      area: chrome.storage.AreaName,
    ) => {
      if (area === 'local' && STORAGE_KEYS.scheduledPosts in changes) void load();
    };
    chrome.storage.onChanged.addListener(listener);
    return () => chrome.storage.onChanged.removeListener(listener);
  }, []);

  if (!quiet) return null;
  const row = NOTICE_COPY['profile-quiet'];
  // `{n}` is profile visits this week, which nothing here measures — `fill`
  // drops the whole sentence rather than printing a hole.
  const body = row.body ? fill(row.body, {}) : null;
  const label = row.buttons[0] ?? 'Write two for me';

  return (
    <div className="rounded-2xl border border-casper-attention/40 bg-casper-attention/5 p-3">
      <p className="text-xs font-medium text-casper-fg">{row.title}</p>
      {body && <p className="mt-1 text-xs leading-relaxed text-casper-muted">{body}</p>}
      <button
        type="button"
        onClick={onWriteTwo}
        disabled={busy}
        className="mt-2.5 w-full rounded-lg bg-casper-attention px-3 py-1.5 text-xs font-medium text-black transition hover:opacity-90 disabled:opacity-40"
      >
        {busy ? 'Writing…' : label}
      </button>
    </div>
  );
};
