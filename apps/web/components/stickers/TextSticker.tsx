type Size = "sm" | "md" | "lg" | "xl";

type Props = {
  text: string;
  className?: string;
  tilt?: number;
  size?: Size;
};

const SIZE: Record<Size, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-4xl",
  xl: "text-6xl",
};

/**
 * Coral, cream-outlined display text with hard drop-shadow — looks like
 * a horror-movie title sticker but tuned for the Casper palette.
 */
export function TextSticker({ text, className, tilt = -6, size = "md" }: Props) {
  return (
    <div
      className={`pointer-events-none select-none ${className ?? ""}`}
      style={{ transform: `rotate(${tilt}deg)` }}
      aria-hidden="true"
    >
      <span
        className={`block font-display ${SIZE[size]} uppercase tracking-wide leading-none`}
        style={{
          color: "#B81336",
          WebkitTextStroke: "2px #e8ddc7",
          textShadow:
            "3px 4px 0 rgba(0,0,0,0.55), 0 0 22px rgba(184,19,54,0.25)",
        }}
      >
        {text}
      </span>
    </div>
  );
}
