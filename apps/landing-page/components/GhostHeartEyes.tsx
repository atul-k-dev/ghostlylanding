type Props = {
  className?: string;
};

/** Casper with little coral hearts for eyes — for "love" / liking moments. */
export function GhostHeartEyes({ className }: Props) {
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

      {/* Heart eye — left */}
      <path
        d="M78 100 C73 95, 67 95, 67 89 C67 84, 72 82, 78 88 C84 82, 89 84, 89 89 C89 95, 83 95, 78 100 Z"
        fill="#B81336"
      />

      {/* Heart eye — right */}
      <path
        d="M122 100 C117 95, 111 95, 111 89 C111 84, 116 82, 122 88 C128 82, 133 84, 133 89 C133 95, 127 95, 122 100 Z"
        fill="#B81336"
      />

      {/* Cheeks */}
      <circle cx="64" cy="118" r="5" fill="#B81336" opacity="0.85" />
      <circle cx="136" cy="118" r="5" fill="#B81336" opacity="0.85" />

      {/* Big open smile */}
      <path
        d="M86 116 Q100 132 114 116"
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

      {/* Floating heart above */}
      <path
        d="M100 30 C97 26, 91 26, 91 32 C91 37, 100 44, 100 44 C100 44, 109 37, 109 32 C109 26, 103 26, 100 30 Z"
        fill="#B81336"
        opacity="0.85"
      />
    </svg>
  );
}
