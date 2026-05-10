type Props = {
  className?: string;
};

export function GhostMascot({ className }: Props) {
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

      {/* Eyes */}
      <ellipse cx="78" cy="92" rx="4" ry="6" fill="#e8ddc7" />
      <ellipse cx="122" cy="92" rx="4" ry="6" fill="#e8ddc7" />

      {/* Cheeks */}
      <circle cx="64" cy="115" r="5" fill="#B81336" opacity="0.85" />
      <circle cx="136" cy="115" r="5" fill="#B81336" opacity="0.85" />

      {/* Smile */}
      <path
        d="M88 112 Q100 124 112 112"
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

      {/* Tiny coral heart */}
      <path
        d="M100 138 C97 134, 91 134, 91 140 C91 145, 100 152, 100 152 C100 152, 109 145, 109 140 C109 134, 103 134, 100 138 Z"
        fill="#B81336"
      />
    </svg>
  );
}
