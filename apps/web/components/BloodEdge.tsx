type Props = {
  className?: string;
  /** fill color — defaults to coral */
  color?: string;
  /** flip the curtain so drips hang upward (use at bottom of section) */
  flip?: boolean;
  /** mirror the curtain horizontally so heavy drips sit on the opposite side */
  flipX?: boolean;
};

/** Procedurally-generated drip-curtain path. ~29 drips of varied widths and depths. */
const DRIPS: { w: number; d: number }[] = [
  { w: 50, d: 50 },
  { w: 35, d: 28 },
  { w: 45, d: 90 },
  { w: 30, d: 38 },
  { w: 50, d: 22 },
  { w: 38, d: 110 },
  { w: 40, d: 35 },
  { w: 42, d: 62 },
  { w: 30, d: 24 },
  { w: 50, d: 88 },
  { w: 40, d: 30 },
  { w: 42, d: 52 },
  { w: 40, d: 78 },
  { w: 38, d: 26 },
  { w: 60, d: 100 },
  { w: 40, d: 32 },
  { w: 42, d: 58 },
  { w: 38, d: 36 },
  { w: 60, d: 95 },
  { w: 32, d: 26 },
  { w: 50, d: 72 },
  { w: 30, d: 30 },
  { w: 50, d: 48 },
  { w: 40, d: 90 },
  { w: 38, d: 30 },
  { w: 42, d: 60 },
  { w: 38, d: 35 },
  { w: 42, d: 100 },
  { w: 40, d: 25 },
];

const PATH = (() => {
  const baseY = 18;
  let parts = `M 0 0 H 1200 V ${baseY}`;
  let x = 1200;
  for (const { w, d } of DRIPS) {
    const startX = x;
    const endX = Math.max(0, x - w);
    const midX = (startX + endX) / 2;
    const dripY = baseY + d;
    parts += ` C ${startX - 4} ${baseY + 6}, ${midX + w / 4} ${dripY}, ${midX} ${dripY}`;
    parts += ` C ${midX - w / 4} ${dripY}, ${endX + 4} ${baseY + 6}, ${endX} ${baseY}`;
    x = endX;
  }
  // Walk back to start along the top
  parts += ` H 0 V 0 Z`;
  return parts;
})();

export function BloodEdge({
  className,
  color = "#B81336",
  flip = false,
  flipX = false,
}: Props) {
  const sx = flipX ? -1 : 1;
  const sy = flip ? -1 : 1;
  const transform =
    sx === 1 && sy === 1 ? undefined : `scale(${sx}, ${sy})`;
  return (
    <svg
      viewBox="0 0 1200 130"
      preserveAspectRatio="none"
      className={className}
      style={transform ? { transform } : undefined}
      aria-hidden="true"
    >
      <path d={PATH} fill={color} />
    </svg>
  );
}
