type Props = {
  className?: string;
};

/** Casper with arms up cheering — excited / growth / yay mood. */
export function GhostExcited({ className }: Props) {
  return (
    <svg
      viewBox="0 0 220 240"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Body outline */}
      <path
        d="M50 120 A60 70 0 0 1 170 120 L170 195 Q160 215 150 195 Q140 215 130 195 Q120 215 110 195 Q100 215 90 195 Q80 215 70 195 Q60 215 50 195 Z"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Happy curved eyes (^^) */}
      <path
        d="M76 116 Q84 108 92 116"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M128 116 Q136 108 144 116"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Cheeks */}
      <circle cx="64" cy="138" r="5.5" fill="#B81336" opacity="0.9" />
      <circle cx="156" cy="138" r="5.5" fill="#B81336" opacity="0.9" />

      {/* Wide open laughing mouth */}
      <path
        d="M88 138 Q110 158 132 138 Q120 152 110 152 Q100 152 88 138 Z"
        fill="#B81336"
        fillOpacity="0.6"
        stroke="#e8ddc7"
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Arms raised up — celebrating */}
      <path
        d="M55 138 Q35 100 50 60"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M165 138 Q185 100 170 60"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Tiny hands at the top of the arms */}
      <circle cx="50" cy="60" r="6" fill="#e8ddc7" />
      <circle cx="170" cy="60" r="6" fill="#e8ddc7" />

      {/* Sparkles around the head */}
      <path
        d="M30 70 L32 76 L38 78 L32 80 L30 86 L28 80 L22 78 L28 76 Z"
        fill="#B81336"
        opacity="0.85"
      />
      <path
        d="M188 80 L190 86 L196 88 L190 90 L188 96 L186 90 L180 88 L186 86 Z"
        fill="#B81336"
        opacity="0.7"
      />
      <path
        d="M110 28 L111.5 33 L116.5 34.5 L111.5 36 L110 41 L108.5 36 L103.5 34.5 L108.5 33 Z"
        fill="#B81336"
        opacity="0.6"
      />
      {/* Small confetti dots */}
      <circle cx="20" cy="120" r="2" fill="#B81336" opacity="0.7" />
      <circle cx="200" cy="130" r="2" fill="#B81336" opacity="0.6" />
      <circle cx="195" cy="170" r="1.5" fill="#B81336" opacity="0.5" />
      <circle cx="22" cy="170" r="1.5" fill="#B81336" opacity="0.5" />
    </svg>
  );
}
