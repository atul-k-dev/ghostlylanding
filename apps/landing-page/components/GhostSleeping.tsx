type Props = {
  className?: string;
};

/** Sleeping Casper variant with closed eyes and Z's — used for the "sleep" theme. */
export function GhostSleeping({ className }: Props) {
  return (
    <svg
      viewBox="0 0 220 220"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Body outline */}
      <path
        d="M50 100 A60 70 0 0 1 170 100 L170 175 Q160 195 150 175 Q140 195 130 175 Q120 195 110 175 Q100 195 90 175 Q80 195 70 175 Q60 195 50 175 Z"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Closed eyes (curved lines) */}
      <path
        d="M78 92 Q86 98 94 92"
        stroke="#e8ddc7"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M126 92 Q134 98 142 92"
        stroke="#e8ddc7"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Cheeks */}
      <circle cx="68" cy="115" r="5" fill="#B81336" opacity="0.7" />
      <circle cx="152" cy="115" r="5" fill="#B81336" opacity="0.7" />

      {/* Tiny snoozing mouth */}
      <path
        d="M104 118 Q110 124 116 118"
        stroke="#e8ddc7"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Z Z Z floating up-right */}
      <text
        x="172"
        y="60"
        fontFamily="var(--font-display, sans-serif)"
        fontSize="22"
        fill="#B81336"
      >
        z
      </text>
      <text
        x="186"
        y="42"
        fontFamily="var(--font-display, sans-serif)"
        fontSize="16"
        fill="#B81336"
        opacity="0.7"
      >
        z
      </text>
      <text
        x="196"
        y="28"
        fontFamily="var(--font-display, sans-serif)"
        fontSize="12"
        fill="#B81336"
        opacity="0.5"
      >
        z
      </text>
    </svg>
  );
}
