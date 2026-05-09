type Props = {
  className?: string;
  rotate?: number;
};

/** Cute cartoon skull — friendly proportions, coral cheeks, cream fill. */
export function CuteSkull({ className, rotate = -4 }: Props) {
  return (
    <svg
      viewBox="0 0 120 140"
      className={className}
      style={{ transform: `rotate(${rotate}deg)`, filter: "drop-shadow(2px 3px 0 rgba(0,0,0,0.55))" }}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Cranium */}
      <path
        d="M 20 50 A 40 42 0 0 1 100 50 L 100 90 Q 100 100 92 100 L 82 100 L 78 110 L 70 100 L 50 100 L 42 110 L 38 100 L 28 100 Q 20 100 20 90 Z"
        fill="#e8ddc7"
        stroke="#0e0e0e"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      {/* Eye sockets */}
      <ellipse cx="42" cy="62" rx="11" ry="13" fill="#0e0e0e" />
      <ellipse cx="78" cy="62" rx="11" ry="13" fill="#0e0e0e" />
      {/* Eye highlights */}
      <circle cx="46" cy="58" r="2.5" fill="#b91c1c" />
      <circle cx="82" cy="58" r="2.5" fill="#b91c1c" />
      {/* Nose */}
      <path
        d="M 56 78 L 53 90 L 67 90 L 64 78 Z"
        fill="#0e0e0e"
      />
      {/* Cheek dots */}
      <circle cx="28" cy="82" r="3" fill="#b91c1c" opacity="0.65" />
      <circle cx="92" cy="82" r="3" fill="#b91c1c" opacity="0.65" />
      {/* Tooth gaps (vertical lines on jaw) */}
      <line x1="50" y1="100" x2="50" y2="108" stroke="#0e0e0e" strokeWidth="2" strokeLinecap="round" />
      <line x1="60" y1="100" x2="60" y2="110" stroke="#0e0e0e" strokeWidth="2" strokeLinecap="round" />
      <line x1="70" y1="100" x2="70" y2="108" stroke="#0e0e0e" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
