type Props = {
  className?: string;
};

/**
 * Ghostly247 logo — the brand app badge (black ghost on coral) from
 * /public/ghostly247-badge.png, matching the extension icon. Stays visible on
 * the dark landing background. Size it via `className` (e.g. `h-10 w-10`).
 */
export function GhostLogo({ className = "h-9 w-9" }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/ghostly247-badge.png"
      alt="Ghostly247"
      className={`flex-none object-contain ${className}`}
    />
  );
}
