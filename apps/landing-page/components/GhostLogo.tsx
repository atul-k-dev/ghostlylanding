type Props = {
  className?: string;
};

/**
 * Ghostly247 logo badge — the same coral ghost used in the browser extension popup:
 * a solid coral disc (#f44d60) with the 👻 glyph centered. Size it via
 * `className` (set both the box, e.g. `h-9 w-9`, and the glyph, e.g. `text-xl`).
 */
export function GhostLogo({ className = "h-9 w-9 text-xl" }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex flex-none items-center justify-center rounded-full bg-[#f44d60] leading-none text-white ${className}`}
    >
      👻
    </span>
  );
}
