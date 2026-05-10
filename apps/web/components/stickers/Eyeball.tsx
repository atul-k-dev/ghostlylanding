type Props = {
  className?: string;
  rotate?: number;
};

/** Sticker-style eyeball with coral iris and small veins. */
export function Eyeball({ className, rotate = 0 }: Props) {
  return (
    <svg
      viewBox="0 0 90 90"
      className={className}
      style={{ transform: `rotate(${rotate}deg)`, filter: "drop-shadow(2px 3px 0 rgba(0,0,0,0.5))" }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Sclera */}
      <circle
        cx="45"
        cy="45"
        r="38"
        fill="#e8ddc7"
        stroke="#0e0e0e"
        strokeWidth="2.5"
      />
      {/* Iris */}
      <circle cx="45" cy="45" r="16" fill="#B81336" />
      {/* Pupil */}
      <circle cx="45" cy="45" r="7" fill="#0e0e0e" />
      {/* Highlight */}
      <circle cx="40" cy="40" r="3" fill="#e8ddc7" />
      {/* Veins */}
      <path d="M 78 32 Q 65 35 58 42" stroke="#B81336" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 10 50 Q 25 48 32 45" stroke="#B81336" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 75 65 Q 65 60 58 55" stroke="#B81336" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M 20 70 Q 30 62 35 55" stroke="#B81336" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
