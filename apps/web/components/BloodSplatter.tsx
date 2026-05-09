type Props = {
  className?: string;
  rotate?: number;
};

/** Organic splatter shape with satellite droplets — used as background accent. */
export function BloodSplatter({ className, rotate = 0 }: Props) {
  return (
    <svg
      viewBox="0 0 220 220"
      className={className}
      style={{ transform: `rotate(${rotate}deg)` }}
      fill="#b91c1c"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Main blob — irregular outline */}
      <path d="M70 60 Q55 45 65 35 Q80 20 95 38 Q105 25 120 40 Q140 28 152 50 Q172 50 168 72 Q188 78 178 100 Q198 110 180 130 Q188 150 165 152 Q160 175 140 168 Q128 188 108 175 Q90 192 75 172 Q55 178 50 158 Q30 158 38 138 Q20 130 35 112 Q22 100 38 88 Q30 70 50 70 Q58 55 70 60 Z" />

      {/* Drip trail down from main blob */}
      <path d="M120 168 Q118 195 122 215" stroke="#b91c1c" strokeWidth="4" fill="none" strokeLinecap="round" />

      {/* Satellite droplets */}
      <ellipse cx="190" cy="40" rx="5" ry="9" transform="rotate(-25 190 40)" />
      <circle cx="200" cy="60" r="3" />
      <ellipse cx="35" cy="195" rx="4" ry="8" transform="rotate(15 35 195)" />
      <circle cx="210" cy="180" r="2.5" />
      <circle cx="20" cy="80" r="2" />
      <circle cx="195" cy="200" r="3" />
      <ellipse cx="50" cy="35" rx="3" ry="6" transform="rotate(20 50 35)" />
    </svg>
  );
}
