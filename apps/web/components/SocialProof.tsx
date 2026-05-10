const AVATARS = [
  "https://i.pravatar.cc/80?img=12",
  "https://i.pravatar.cc/80?img=32",
  "https://i.pravatar.cc/80?img=47",
  "https://i.pravatar.cc/80?img=68",
  "https://i.pravatar.cc/80?img=49",
];

function Star() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 24 24"
      fill="#B81336"
      aria-hidden="true"
    >
      <path d="M12 2l2.95 6.36L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l7.05-.91L12 2z" />
    </svg>
  );
}

export function SocialProof() {
  return (
    <div className="flex items-center gap-3.5">
      <div className="flex -space-x-2.5">
        {AVATARS.map((src) => (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            key={src}
            src={src}
            alt=""
            className="h-9 w-9 rounded-full border-2 border-ink object-cover"
          />
        ))}
      </div>
      <div className="text-left">
        <div className="flex gap-0.5">
          <Star />
          <Star />
          <Star />
          <Star />
          <Star />
        </div>
        <p className="mt-0.5 text-xs text-cream/80">
          Trusted by <span className="font-semibold text-cream">1,000+</span>{" "}
          creators
        </p>
      </div>
    </div>
  );
}
