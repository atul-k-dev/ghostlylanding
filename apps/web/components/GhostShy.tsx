type Props = {
  className?: string;
};

/** Shy Casper — blushing, looking sideways, hands near the face. */
export function GhostShy({ className }: Props) {
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

      {/* Sideways-looking eyes (eyes shifted left, both pupils same direction) */}
      <ellipse cx="76" cy="92" rx="4" ry="6" fill="#e8ddc7" />
      <ellipse cx="120" cy="92" rx="4" ry="6" fill="#e8ddc7" />

      {/* Bigger blush cheeks */}
      <circle cx="60" cy="116" r="8" fill="#B81336" opacity="0.55" />
      <circle cx="140" cy="116" r="8" fill="#B81336" opacity="0.55" />

      {/* Tiny shy smile */}
      <path
        d="M93 116 Q100 122 107 116"
        stroke="#e8ddc7"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Arms — both bent up toward face, holding cheeks */}
      <path
        d="M50 130 Q60 110 72 122"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M150 130 Q140 110 128 122"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Tiny hands at the end of the arms */}
      <circle cx="72" cy="122" r="5" fill="#e8ddc7" />
      <circle cx="128" cy="122" r="5" fill="#e8ddc7" />

      {/* Tiny sparkle near the cheek */}
      <path
        d="M170 90 L171 93 L174 94 L171 95 L170 98 L169 95 L166 94 L169 93 Z"
        fill="#B81336"
        opacity="0.6"
      />
    </svg>
  );
}
