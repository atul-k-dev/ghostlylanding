type Props = {
  className?: string;
};

/** Waving Casper — for the install/connect step. */
export function GhostWaving({ className }: Props) {
  return (
    <svg
      viewBox="0 0 220 220"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M50 100 A60 70 0 0 1 170 100 L170 175 Q160 195 150 175 Q140 195 130 175 Q120 195 110 175 Q100 195 90 175 Q80 195 70 175 Q60 195 50 175 Z"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Eyes */}
      <ellipse cx="88" cy="92" rx="4" ry="6" fill="#e8ddc7" />
      <ellipse cx="132" cy="92" rx="4" ry="6" fill="#e8ddc7" />

      {/* Cheeks */}
      <circle cx="72" cy="115" r="5" fill="#b91c1c" opacity="0.85" />
      <circle cx="148" cy="115" r="5" fill="#b91c1c" opacity="0.85" />

      {/* Open smile */}
      <path
        d="M96 112 Q110 128 124 112"
        stroke="#e8ddc7"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Resting arm (left) */}
      <path
        d="M58 130 Q46 150 60 165"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Waving arm (right - raised) */}
      <path
        d="M162 125 Q188 95 198 60"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Little hand at the end */}
      <circle cx="198" cy="60" r="6" fill="none" stroke="#e8ddc7" strokeWidth="3" />

      {/* Sparkle near the hand */}
      <path
        d="M210 40 L210 50 M205 45 L215 45"
        stroke="#b91c1c"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
