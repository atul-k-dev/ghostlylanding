import { MEDIA } from "@/lib/media";

type WallCard = {
  title: string;
  body: string;
  image: string;
  /** Background of the image well — the screenshot sits inset on it. */
  tint: string;
  /** Width / height of the image well, so the columns stagger like masonry. */
  ratio: string;
};

/*
  Every tab of the extension, split across two columns. Ratios alternate
  between the columns so the card edges never line up side by side.
*/
const LEFT: WallCard[] = [
  {
    title: "Does The Work For You",
    body: "Likes, replies and follows while you get on with your day.",
    image: MEDIA.pillarEngage,
    tint: "var(--brand-100)",
    ratio: "4 / 5",
  },
  {
    title: "Just Ask",
    body: "Tell it what you want. Nothing changes until you say yes.",
    image: MEDIA.askPanel,
    tint: "var(--brand-050)",
    ratio: "1 / 1",
  },
  {
    title: "Write & Schedule",
    body: "AI writes your posts, and they go out at the best time.",
    image: MEDIA.composerPanel,
    tint: "var(--brand-150)",
    ratio: "5 / 4",
  },
  {
    title: "Growth Stats",
    body: "Your followers over time and your best replies.",
    image: MEDIA.growthBoard,
    tint: "var(--brand-050)",
    ratio: "7 / 5",
  },
  {
    title: "Safe, Human Pace",
    body: "Daily limits, your hours, and one tap to pause.",
    image: MEDIA.pillarSafety,
    tint: "var(--brand-100)",
    ratio: "4 / 5",
  },
];

const RIGHT: WallCard[] = [
  {
    title: "Sounds Like You",
    body: "It learns from your posts, so every reply reads like yours.",
    image: MEDIA.voicePanel,
    tint: "var(--brand-150)",
    ratio: "5 / 4",
  },
  {
    title: "Your Topics",
    body: "Finds fresh posts about what you care about, all over X.",
    image: MEDIA.targetingPanel,
    tint: "var(--brand-100)",
    ratio: "1 / 1",
  },
  {
    title: "Check Replies First",
    body: "Replies — and answers to your mentions — wait for your OK.",
    image: MEDIA.reviewQueue,
    tint: "var(--brand-050)",
    ratio: "4 / 5",
  },
  {
    title: "Every Action Logged",
    body: "See every like, reply and follow, and when it happened.",
    image: MEDIA.activityLog,
    tint: "var(--brand-150)",
    ratio: "7 / 5",
  },
  {
    title: "Morning Recap",
    body: "One email each morning with everything Ghostly did.",
    image: MEDIA.recapEmail,
    tint: "var(--brand-100)",
    ratio: "1 / 1",
  },
];

function Card({ card, hidden }: { card: WallCard; hidden?: boolean }) {
  return (
    <div
      className="flex flex-col gap-2.5 p-1.5 pb-3"
      style={{ background: "var(--card)", borderRadius: 16 }}
      aria-hidden={hidden || undefined}
    >
      <div
        className="relative w-full overflow-hidden"
        style={{
          aspectRatio: card.ratio,
          background: card.tint,
          borderRadius: 11,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={card.image}
          alt={hidden ? "" : card.title}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      </div>
      <div className="flex flex-col gap-0.5 px-1.5">
        <h3
          className="font-[family-name:var(--font-urbanist)] text-[15px] font-semibold leading-tight"
          style={{ color: "var(--ink)" }}
        >
          {card.title}
        </h3>
        <p
          className="text-[13px] leading-[1.4]"
          style={{ color: "var(--zinc)" }}
        >
          {card.body}
        </p>
      </div>
    </div>
  );
}

function Column({
  cards,
  direction,
  duration,
}: {
  cards: WallCard[];
  direction: "up" | "down";
  duration: number;
}) {
  return (
    <div className="min-w-0 flex-1">
      <div
        className={`wall-track flex flex-col ${direction === "down" ? "wall-track--down" : ""}`}
        style={{ ["--wall-duration" as string]: `${duration}s` }}
      >
        {/* two copies — the second is decorative, only there to close the loop */}
        {[false, true].map((hidden) => (
          <div key={String(hidden)} className="flex flex-col gap-2.5 pb-2.5">
            {cards.map((c) => (
              <Card key={c.title} card={c} hidden={hidden} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/*
  Long, eased fade at the top so cards dissolve well before they reach the
  nav bar instead of meeting it at a hard edge; a shorter one at the bottom.
*/
const WALL_MASK =
  "linear-gradient(to bottom, transparent 0px, rgb(0 0 0 / 0.15) 64px, rgb(0 0 0 / 0.55) 140px, #000 220px, #000 calc(100% - 110px), transparent 100%)";

/** Two columns of feature cards drifting past each other, for the hero. */
export function FeatureWall() {
  return (
    <div
      className="wall absolute inset-0 flex gap-2.5 overflow-hidden"
      style={{ maskImage: WALL_MASK, WebkitMaskImage: WALL_MASK }}
    >
      <Column cards={LEFT} direction="up" duration={52} />
      <Column cards={RIGHT} direction="down" duration={60} />
    </div>
  );
}
