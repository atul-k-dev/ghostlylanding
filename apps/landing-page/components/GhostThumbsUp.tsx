type Props = {
  className?: string;
};

/** Casper giving a thumbs up — approval / "you got this" mood. */
export function GhostThumbsUp({ className }: Props) {
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
        d="M40 100 A60 70 0 0 1 160 100 L160 175 Q150 195 140 175 Q130 195 120 175 Q110 195 100 175 Q90 195 80 175 Q70 195 60 175 Q50 195 40 175 Z"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Eyes — happy curves */}
      <path
        d="M72 90 Q80 84 88 90"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M112 90 Q120 84 128 90"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Cheeks */}
      <circle cx="58" cy="115" r="5" fill="#B81336" opacity="0.85" />
      <circle cx="130" cy="115" r="5" fill="#B81336" opacity="0.85" />

      {/* Smile */}
      <path
        d="M82 112 Q96 122 110 112"
        stroke="#e8ddc7"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Left arm — normal hug */}
      <path
        d="M48 130 Q36 145 48 162"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Right arm — raised with thumbs up */}
      <path
        d="M152 128 Q174 110 184 90"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Fist */}
      <circle cx="184" cy="90" r="9" fill="#e8ddc7" />
      {/* Thumb */}
      <path
        d="M184 84 L184 70"
        stroke="#e8ddc7"
        strokeWidth="5"
        strokeLinecap="round"
      />
      {/* Tiny coral spark on thumb */}
      <circle cx="184" cy="68" r="2" fill="#B81336" />
    </svg>
  );
}
