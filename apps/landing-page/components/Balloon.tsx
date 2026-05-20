type Props = {
  className?: string;
};

export function Balloon({ className }: Props) {
  return (
    <svg
      viewBox="0 0 80 140"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <ellipse
        cx="40"
        cy="40"
        rx="28"
        ry="34"
        fill="#B81336"
        stroke="#e8ddc7"
        strokeWidth="2.5"
      />
      <path
        d="M36 74 L40 80 L44 74 Z"
        fill="#B81336"
        stroke="#e8ddc7"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M40 80 Q48 100 36 118 Q28 130 44 138"
        stroke="#e8ddc7"
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
