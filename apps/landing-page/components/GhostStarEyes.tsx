type Props = {
  className?: string;
};

/** Casper with star-shaped eyes — star-struck / "5 stars!" feel. */
export function GhostStarEyes({ className }: Props) {
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

      {/* Star eye — left */}
      <path
        d="M78 80 L80.6 88 L89 89 L82.5 94.5 L84.5 102.5 L78 98 L71.5 102.5 L73.5 94.5 L67 89 L75.4 88 Z"
        fill="#B81336"
      />

      {/* Star eye — right */}
      <path
        d="M122 80 L124.6 88 L133 89 L126.5 94.5 L128.5 102.5 L122 98 L115.5 102.5 L117.5 94.5 L111 89 L119.4 88 Z"
        fill="#B81336"
      />

      {/* Cheeks */}
      <circle cx="64" cy="118" r="5" fill="#B81336" opacity="0.85" />
      <circle cx="136" cy="118" r="5" fill="#B81336" opacity="0.85" />

      {/* Wide open happy smile */}
      <path
        d="M84 118 Q100 134 116 118"
        stroke="#e8ddc7"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* Hug arms */}
      <path
        d="M48 130 Q36 145 48 162"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M152 130 Q164 145 152 162"
        stroke="#e8ddc7"
        strokeWidth="3.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Tiny sparkles around the head */}
      <path
        d="M30 50 L31.5 54 L35.5 55.5 L31.5 57 L30 61 L28.5 57 L24.5 55.5 L28.5 54 Z"
        fill="#B81336"
        opacity="0.7"
      />
      <path
        d="M170 60 L171 63 L174 64 L171 65 L170 68 L169 65 L166 64 L169 63 Z"
        fill="#B81336"
        opacity="0.6"
      />
      <path
        d="M165 138 L166 141 L169 142 L166 143 L165 146 L164 143 L161 142 L164 141 Z"
        fill="#B81336"
        opacity="0.5"
      />
    </svg>
  );
}
