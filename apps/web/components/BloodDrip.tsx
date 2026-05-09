type Props = {
  className?: string;
  /** rotate the drip in degrees */
  rotate?: number;
};

/**
 * Coral teardrop / drip shape used as a recurring accent across sections.
 * Pure SVG so it scales cleanly and can be tinted via fill.
 */
export function BloodDrip({ className, rotate = 0 }: Props) {
  return (
    <svg
      viewBox="0 0 40 60"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <path
        d="M20 4 C20 4, 6 28, 6 42 A14 14 0 0 0 34 42 C34 28, 20 4, 20 4 Z"
        fill="#b91c1c"
      />
      {/* tiny highlight for shape */}
      <ellipse cx="14" cy="38" rx="2.5" ry="5" fill="#dc2626" opacity="0.7" />
    </svg>
  );
}
