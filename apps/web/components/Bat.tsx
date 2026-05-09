type Props = {
  className?: string;
  /** if true, wings flap on a loop */
  flap?: boolean;
};

/** Tiny bat silhouette. Color via `currentColor` on the parent. */
export function Bat({ className, flap = false }: Props) {
  return (
    <svg
      viewBox="0 0 100 44"
      className={className}
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <g
        className={flap ? "animate-flap" : undefined}
        style={{ transformOrigin: "center", transformBox: "fill-box" }}
      >
        {/* wings + head silhouette as one organic path */}
        <path d="M50 14 Q40 4 26 8 Q12 2 4 16 Q12 12 18 20 Q22 14 28 22 Q32 16 40 24 Q45 20 50 28 Q55 20 60 24 Q68 16 72 22 Q78 14 82 20 Q88 12 96 16 Q88 2 74 8 Q60 4 50 14 Z" />
        {/* body */}
        <ellipse cx="50" cy="20" rx="4" ry="6" />
        {/* ears */}
        <path d="M47 12 L46 6 L49 11 Z" />
        <path d="M53 12 L54 6 L51 11 Z" />
        {/* eyes */}
        <circle cx="48" cy="19" r="0.8" fill="#b91c1c" />
        <circle cx="52" cy="19" r="0.8" fill="#b91c1c" />
      </g>
    </svg>
  );
}
