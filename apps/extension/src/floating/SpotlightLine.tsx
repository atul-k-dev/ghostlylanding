import { useEffect, useState } from 'react';
import {
  getSpotlight,
  subscribeSpotlight,
  SPOTLIGHT_LABEL,
  type SpotlightTarget,
} from './spotlight.js';

/**
 * "● Ghostly is replying to this" — the panel half of Spotlight (2.3).
 *
 * The outline says WHICH post; this says WHAT is being done to it, and the two
 * are published together by `spotlight.ts` so they can never disagree. It only
 * exists in the floating panel: the side panel is a different context and cannot
 * see the page the outline is drawn on, and a line about a post you can't see is
 * worse than no line at all.
 */
export const useSpotlight = (): SpotlightTarget | null => {
  const [target, setTarget] = useState<SpotlightTarget | null>(getSpotlight);
  useEffect(() => subscribeSpotlight(setTarget), []);
  return target;
};

export const SpotlightLine = () => {
  const target = useSpotlight();
  if (!target) return null;

  const who = target.authorHandle ? `@${target.authorHandle.replace(/^@/, '')}` : null;

  return (
    <a
      href={target.postUrl}
      target="_blank"
      rel="noreferrer"
      className="block rounded-2xl border border-casper-coral/40 bg-casper-coral/[0.08] px-3.5 py-2.5 transition-colors hover:bg-casper-coral/15"
    >
      <p className="flex items-center gap-1.5 text-[13px] leading-snug font-medium text-casper-coral">
        <span aria-hidden className="motion-safe:animate-pulse">
          ●
        </span>
        {SPOTLIGHT_LABEL[target.action]}
      </p>
      {(who || target.text) && (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-casper-muted">
          {who && <span className="text-casper-fg">{who}</span>}
          {who && target.text ? ' — ' : ''}
          {target.text}
        </p>
      )}
    </a>
  );
};
