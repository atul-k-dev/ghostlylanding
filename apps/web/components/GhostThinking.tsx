type Props = {
  className?: string;
};

/** Casper thinking — hand on chin, thought bubble, contemplative. */
export function GhostThinking({ className }: Props) {
  return (
    <svg
      viewBox="0 0 220 240"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Thought bubble */}
      <circle
        cx="180"
        cy="42"
        r="18"
        fill="none"
        stroke="#B81336"
        strokeWidth="2.5"
        opacity="0.85"
      />
      <circle
        cx="160"
        cy="68"
        r="6"
        fill="none"
        stroke="#B81336"
        strokeWidth="2"
        opacity="0.7"
      />
      <circle
        cx="148"
        cy="82"
        r="3"
        fill="none"
        stroke="#B81336"
        strokeWidth="2"
        opacity="0.5"
      />
      {/* Tiny sparkle inside bubble */}
      <path
        d="M180 36 L181.5 41 L186.5 42 L181.5 43 L180 48 L178.5 43 L173.5 42 L178.5 41 Z"
        fill="#B81336"
        opacity="0.85"
      />

      {/* Body outline */}
      <path
        d="M40 120 A60 70 0 0 1 160 120 L160 195 Q150 215 140 195 Q130 215 120 195 Q110 215 100 195 Q90 215 80 195 Q70 215 60 195 Q50 215 40 195 Z"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Eyes — looking up to the side */}
      <ellipse cx="78" cy="108" rx="4" ry="6" fill="#e8ddc7" />
      <ellipse cx="122" cy="108" rx="4" ry="6" fill="#e8ddc7" />
      <circle cx="79" cy="106" r="1.5" fill="#0e0e0e" />
      <circle cx="123" cy="106" r="1.5" fill="#0e0e0e" />

      {/* Cheeks */}
      <circle cx="64" cy="135" r="5" fill="#B81336" opacity="0.8" />
      <circle cx="136" cy="135" r="5" fill="#B81336" opacity="0.8" />

      {/* Hmm mouth — small flat with a slight curl */}
      <path
        d="M93 135 Q100 138 107 132"
        stroke="#e8ddc7"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Right arm bent up to chin */}
      <path
        d="M152 150 Q148 138 130 132"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Tiny hand at chin */}
      <circle cx="128" cy="132" r="4.5" fill="#e8ddc7" />

      {/* Left arm — normal hug */}
      <path
        d="M48 150 Q36 165 48 180"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
