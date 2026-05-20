type Props = {
  className?: string;
};

/** Casper winking — playful "I got you" mood. */
export function GhostWinking({ className }: Props) {
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

      {/* Open eye — left */}
      <ellipse cx="78" cy="92" rx="4" ry="6" fill="#e8ddc7" />

      {/* Winking eye — right (curved line) */}
      <path
        d="M114 94 Q122 88 130 94"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Cheeks */}
      <circle cx="64" cy="115" r="5" fill="#B81336" opacity="0.85" />
      <circle cx="136" cy="115" r="5" fill="#B81336" opacity="0.85" />

      {/* Smirky smile (asymmetric) */}
      <path
        d="M86 113 Q97 121 114 110"
        stroke="#e8ddc7"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Hug arms — one slightly raised like a cheeky wave */}
      <path
        d="M48 130 Q36 145 48 162"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M152 128 Q166 138 158 154"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Tiny sparkle near the wink */}
      <path
        d="M148 78 L150 82 L154 84 L150 86 L148 90 L146 86 L142 84 L146 82 Z"
        fill="#B81336"
        opacity="0.85"
      />
    </svg>
  );
}
