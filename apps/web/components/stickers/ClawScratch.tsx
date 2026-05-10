type Props = {
  className?: string;
  rotate?: number;
};

/** Three parallel claw slashes with drip trails. */
export function ClawScratch({ className, rotate = -6 }: Props) {
  return (
    <svg
      viewBox="0 0 160 110"
      className={className}
      style={{ transform: `rotate(${rotate}deg)`, filter: "drop-shadow(2px 3px 0 rgba(0,0,0,0.5))" }}
      fill="#B81336"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Slash 1 (top, thinner) */}
      <path d="M 5 20 Q 80 8 155 22 Q 80 18 5 28 Z" stroke="#e8ddc7" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Slash 2 (middle, thickest) */}
      <path d="M 2 48 Q 80 38 158 52 Q 80 50 2 58 Z" stroke="#e8ddc7" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Slash 3 (bottom) */}
      <path d="M 8 78 Q 80 70 152 82 Q 80 80 8 86 Z" stroke="#e8ddc7" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Drips */}
      <path d="M 40 28 Q 40 44 42 52" stroke="#B81336" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 90 58 Q 92 76 88 88" stroke="#B81336" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 130 88 Q 132 102 130 110" stroke="#B81336" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M 60 88 Q 58 100 62 108" stroke="#B81336" strokeWidth="2.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
