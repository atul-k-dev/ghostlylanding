type Props = {
  className?: string;
};

/**
 * Ghostly247 logo — the brand ghost mascot (white ghost, coral infinity eyes)
 * from /public/ghostly247logo.png. Size it via `className` (e.g. `h-10 w-10`).
 */
export function GhostLogo({ className = "h-9 w-9" }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/ghostly247logo.png"
      alt="Ghostly247"
      className={`flex-none object-contain ${className}`}
    />
  );
}
