type Props = {
  className?: string;
};

/** Casper peeking — wide curious eyes with sideways pupils, hands at face. */
export function GhostPeeking({ className }: Props) {
  return (
    <svg
      viewBox="0 0 200 220"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Body outline */}
      <path
        d="M40 100 A60 70 0 0 1 160 100 L160 175 Q150 195 140 175 Q130 195 120 175 Q110 195 100 175 Q90 195 80 175 Q70 195 60 175 Q50 195 40 175 Z"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Eyes — bigger, curious */}
      <ellipse cx="78" cy="92" rx="6" ry="7" fill="#e8ddc7" />
      <ellipse cx="122" cy="92" rx="6" ry="7" fill="#e8ddc7" />
      {/* Pupils looking right */}
      <circle cx="81" cy="92" r="2.5" fill="#0e0e0e" />
      <circle cx="125" cy="92" r="2.5" fill="#0e0e0e" />

      {/* Cheeks */}
      <circle cx="60" cy="118" r="5.5" fill="#B81336" opacity="0.75" />
      <circle cx="140" cy="118" r="5.5" fill="#B81336" opacity="0.75" />

      {/* Tiny "o" mouth — surprised peek */}
      <ellipse
        cx="100"
        cy="120"
        rx="3"
        ry="4"
        fill="#B81336"
        fillOpacity="0.55"
        stroke="#e8ddc7"
        strokeWidth="2.5"
      />

      {/* Both arms up near the face — peeking from behind */}
      <path
        d="M50 130 Q60 118 76 122"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M150 130 Q140 118 124 122"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Tiny hands */}
      <circle cx="76" cy="122" r="4.5" fill="#e8ddc7" />
      <circle cx="124" cy="122" r="4.5" fill="#e8ddc7" />

      {/* Question mark above */}
      <text
        x="170"
        y="58"
        fontFamily="var(--font-display, sans-serif)"
        fontSize="22"
        fill="#B81336"
        opacity="0.9"
      >
        ?
      </text>
    </svg>
  );
}
