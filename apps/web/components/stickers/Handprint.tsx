type Props = {
  className?: string;
  rotate?: number;
};

export function Handprint({ className, rotate = -8 }: Props) {
  return (
    <svg
      viewBox="0 0 130 160"
      className={className}
      style={{ transform: `rotate(${rotate}deg)`, filter: "drop-shadow(2px 3px 0 rgba(0,0,0,0.5))" }}
      fill="#b91c1c"
      stroke="#e8ddc7"
      strokeWidth="2.5"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Palm */}
      <path d="M 28 80 Q 18 105 32 128 Q 48 148 70 145 Q 98 142 102 118 Q 108 90 96 78 Z" />
      {/* Thumb (lower-left, angled) */}
      <ellipse cx="22" cy="78" rx="8" ry="16" transform="rotate(-32 22 78)" />
      {/* Index */}
      <ellipse cx="38" cy="42" rx="7" ry="24" />
      {/* Middle */}
      <ellipse cx="58" cy="32" rx="7" ry="28" />
      {/* Ring */}
      <ellipse cx="80" cy="38" rx="7" ry="24" />
      {/* Pinky (upper-right, angled) */}
      <ellipse cx="100" cy="62" rx="7" ry="18" transform="rotate(28 100 62)" />
      {/* Drips */}
      <path d="M 50 142 Q 50 158 52 168" stroke="#b91c1c" strokeWidth="4" fill="none" strokeLinecap="round" />
      <path d="M 75 145 Q 78 162 75 175" stroke="#b91c1c" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}
