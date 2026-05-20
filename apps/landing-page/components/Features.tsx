import { Bat } from "./Bat";
import { BloodDrip } from "./BloodDrip";
import { GhostHeartEyes } from "./GhostHeartEyes";
import { GhostMascot } from "./GhostMascot";
import { GhostPeeking } from "./GhostPeeking";
import { GhostSleeping } from "./GhostSleeping";
import { GhostStarEyes } from "./GhostStarEyes";
import { ClawScratch } from "./stickers/ClawScratch";
import { Eyeball } from "./stickers/Eyeball";
import { TextSticker } from "./stickers/TextSticker";

/* ----------------------- Per-feature illustrations ----------------------- */

function HeartShape({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 30 30" className={className} fill="#B81336" aria-hidden="true">
      <path d="M15 25 C5 18, 1 11, 7 6 C11 3, 14 6, 15 10 C16 6, 19 3, 23 6 C29 11, 25 18, 15 25 Z" />
    </svg>
  );
}

function AutoLikeArt() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px]">
      {/* Tweet card mockup */}
      <div className="absolute left-0 top-6 w-[78%] rotate-[-3deg] rounded-2xl border border-cream/15 bg-ink-soft/95 p-5 shadow-[0_25px_70px_rgba(0,0,0,0.55)] backdrop-blur md:p-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 flex-none rounded-full bg-gradient-to-br from-cream/30 to-cream/10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-2.5 w-24 rounded-full bg-cream/30" />
            <div className="h-2 w-16 rounded-full bg-cream/15" />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <div className="h-2 w-full rounded-full bg-cream/15" />
          <div className="h-2 w-[88%] rounded-full bg-cream/15" />
          <div className="h-2 w-[64%] rounded-full bg-cream/15" />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <HeartShape className="h-4 w-4" />
          <span className="font-semibold text-coral">1.2k</span>
          <span className="text-xs text-cream/40">likes</span>
        </div>
      </div>

      {/* Big floating heart */}
      <div className="absolute -bottom-2 right-0 animate-float">
        <svg
          viewBox="0 0 120 120"
          className="h-36 w-auto md:h-44"
          style={{ filter: "drop-shadow(0 12px 30px rgba(184,19,54,0.55))" }}
          aria-hidden="true"
        >
          <path
            d="M60 100 C20 75, 5 45, 25 25 C40 12, 55 22, 60 38 C65 22, 80 12, 95 25 C115 45, 100 75, 60 100 Z"
            fill="#B81336"
            stroke="#e8ddc7"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M30 32 L36 40" stroke="#dc2626" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </div>

      {/* Floating small hearts */}
      <HeartShape className="absolute right-32 top-2 h-7 w-auto opacity-70 animate-float" />
      <HeartShape className="absolute right-12 top-24 h-5 w-auto opacity-60 animate-float" />
      <HeartShape className="absolute right-44 bottom-16 h-4 w-auto opacity-50 animate-float" />
    </div>
  );
}

function AICommentsArt() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px]">
      {/* Ghost */}
      <div className="absolute bottom-2 left-2 animate-float">
        <GhostMascot className="h-36 w-auto md:h-44" />
      </div>

      {/* Speech bubble */}
      <div className="absolute right-0 top-4 max-w-[68%] rotate-[2deg] rounded-3xl rounded-bl-sm border border-cream/15 bg-cream/[0.06] p-5 shadow-[0_25px_70px_rgba(0,0,0,0.55)] backdrop-blur">
        <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-wider text-cream/50">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral" />
          Drafted in your tone
        </div>
        <p className="text-sm leading-relaxed text-cream/90">
          &ldquo;Love the typographic balance — that asymmetric headline really
          sells the kerning choice. What grid did you land on?&rdquo;
        </p>
        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-coral/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-coral">
            Designer
          </span>
          <span className="rounded-full bg-cream/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cream/60">
            Short
          </span>
        </div>
      </div>

      {/* AI tag floating */}
      <div className="absolute right-8 bottom-10 rotate-[-6deg] rounded-2xl border border-coral/40 bg-coral/15 px-3.5 py-2 backdrop-blur">
        <div className="flex items-center gap-2 text-xs font-semibold text-coral">
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
            <path d="M8 0 L9 7 L16 8 L9 9 L8 16 L7 9 L0 8 L7 7 Z" />
          </svg>
          AI · tone matched
        </div>
      </div>
    </div>
  );
}

function SmartFollowArt() {
  const cards = [
    { name: 24, handle: 32, action: "+ Follow", active: true, top: 4, left: 0, rot: -3 },
    { name: 22, handle: 28, action: "Follow", active: false, top: 28, left: 12, rot: 2 },
    { name: 26, handle: 30, action: "Follow", active: false, top: 52, left: 4, rot: -2 },
  ];
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px]">
      {cards.map((c, i) => (
        <div
          key={i}
          className="absolute w-[78%] rounded-2xl border border-cream/15 bg-ink-soft/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur md:p-5"
          style={{
            top: `${c.top}%`,
            left: `${c.left}%`,
            transform: `rotate(${c.rot}deg)`,
            zIndex: 3 - i,
          }}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex-none rounded-full bg-gradient-to-br from-cream/30 to-cream/10" />
            <div className="flex-1">
              <div
                className="h-2.5 rounded-full bg-cream/30"
                style={{ width: `${c.name * 4}px` }}
              />
              <div
                className="mt-1.5 h-2 rounded-full bg-cream/15"
                style={{ width: `${c.handle * 4}px` }}
              />
            </div>
            <button
              className={`flex-none rounded-full px-3 py-1.5 text-[10px] font-semibold transition ${
                c.active
                  ? "bg-coral text-cream shadow-[0_4px_18px_rgba(184,19,54,0.4)]"
                  : "border border-cream/25 text-cream/60"
              }`}
            >
              {c.action}
            </button>
          </div>
        </div>
      ))}

      {/* Connecting dotted line */}
      <svg
        className="absolute inset-0 h-full w-full opacity-50"
        viewBox="0 0 400 400"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M 80 80 Q 160 220 100 340"
          stroke="#B81336"
          strokeWidth="2"
          strokeDasharray="4 7"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function SmartSchedulingArt() {
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[440px]">
      {/* Clock */}
      <svg viewBox="0 0 300 300" className="h-full w-full" fill="none" aria-hidden="true">
        {/* Outer ring */}
        <circle cx="150" cy="150" r="120" stroke="#e8ddc7" strokeWidth="2" opacity="0.25" />
        {/* Active hours arc — 9 (left) clockwise to 5 (lower-right) */}
        <path
          d="M 30 150 A 120 120 0 0 1 230 222"
          stroke="#B81336"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
          style={{ filter: "drop-shadow(0 0 16px rgba(184,19,54,0.5))" }}
        />
        {/* Hour ticks */}
        {Array.from({ length: 12 }).map((_, h) => {
          const angle = h * 30 - 90;
          const rad = (angle * Math.PI) / 180;
          const x1 = 150 + 108 * Math.cos(rad);
          const y1 = 150 + 108 * Math.sin(rad);
          const x2 = 150 + 118 * Math.cos(rad);
          const y2 = 150 + 118 * Math.sin(rad);
          return (
            <line
              key={h}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#e8ddc7"
              strokeWidth="2"
              opacity={h % 3 === 0 ? "0.7" : "0.3"}
              strokeLinecap="round"
            />
          );
        })}
        {/* Hour labels */}
        <text x="150" y="62" fontFamily="var(--font-display, sans-serif)" fontSize="14" fill="#e8ddc7" opacity="0.7" textAnchor="middle">12</text>
        <text x="246" y="156" fontFamily="var(--font-display, sans-serif)" fontSize="14" fill="#B81336" textAnchor="middle">3</text>
        <text x="150" y="252" fontFamily="var(--font-display, sans-serif)" fontSize="14" fill="#B81336" textAnchor="middle">6</text>
        <text x="56" y="156" fontFamily="var(--font-display, sans-serif)" fontSize="14" fill="#B81336" textAnchor="middle">9</text>
        {/* Hands */}
        <line x1="150" y1="150" x2="150" y2="80" stroke="#e8ddc7" strokeWidth="3" strokeLinecap="round" />
        <line x1="150" y1="150" x2="206" y2="186" stroke="#B81336" strokeWidth="4" strokeLinecap="round" />
        <circle cx="150" cy="150" r="5" fill="#B81336" />
      </svg>

      {/* "ACTIVE NOW" pill */}
      <div className="absolute right-2 top-6 inline-flex items-center gap-1.5 rounded-full border border-coral/40 bg-coral/15 px-3 py-1.5 text-xs font-semibold text-coral backdrop-blur">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral" />
        ACTIVE NOW
      </div>

      {/* Sleeping ghost in corner */}
      <div className="absolute -bottom-4 -right-2">
        <GhostSleeping className="h-24 w-auto opacity-95 animate-float" />
      </div>
    </div>
  );
}

function SafetyEngineArt() {
  return (
    <div className="relative mx-auto flex aspect-square w-full max-w-[440px] items-center justify-center">
      {/* Shield */}
      <svg
        viewBox="0 0 300 320"
        className="h-full w-auto"
        fill="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="shield-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#B81336" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#B81336" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        <path
          d="M 150 30 L 270 70 L 270 170 C 270 220, 220 270, 150 290 C 80 270, 30 220, 30 170 L 30 70 Z"
          fill="url(#shield-grad)"
          stroke="#B81336"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <path
          d="M 150 38 L 262 74 L 262 168 C 262 215, 215 262, 150 280 C 85 262, 38 215, 38 168 L 38 74 Z"
          fill="none"
          stroke="#e8ddc7"
          strokeWidth="1"
          strokeOpacity="0.25"
        />
      </svg>

      {/* Ghost inside shield */}
      <div className="absolute inset-0 flex items-center justify-center">
        <GhostMascot className="h-32 w-auto animate-float md:h-36" />
      </div>

      {/* "0 BANS" stamp */}
      <div
        className="absolute bottom-8 right-4 rounded-full border-2 border-coral bg-coral/10 px-4 py-2 font-sans font-black text-xs tracking-[0.2em] text-coral shadow-[0_0_30px_rgba(184,19,54,0.4)]"
        style={{ transform: "rotate(8deg)" }}
      >
        0 BANS
      </div>

      {/* Lock pill */}
      <div className="absolute left-4 top-12 flex items-center gap-2 rounded-full border border-cream/20 bg-ink-soft/80 px-3 py-1.5 backdrop-blur">
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5"
          fill="none"
          stroke="#B81336"
          strokeWidth="2"
          aria-hidden="true"
        >
          <rect x="3" y="7" width="10" height="7" rx="1.5" />
          <path d="M 5 7 V 5 A 3 3 0 0 1 11 5 V 7" />
        </svg>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-cream/80">
          0 passwords
        </span>
      </div>

      {/* Random delay pill */}
      <div className="absolute bottom-16 left-2 flex items-center gap-2 rounded-full border border-cream/20 bg-ink-soft/80 px-3 py-1.5 backdrop-blur">
        <span className="inline-block h-1.5 w-1.5 rounded-full bg-coral" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-cream/80">
          8-45s delays
        </span>
      </div>
    </div>
  );
}

/* ----------------------- Feature data ----------------------- */

type Feature = {
  index: string;
  label: string;
  title: string;
  highlight: string;
  description: string;
  bullets: string[];
  Art: () => React.ReactElement;
};

const FEATURES: Feature[] = [
  {
    index: "01",
    label: "Smart Auto-Like",
    title: "Like the right posts.",
    highlight: "Skip the noise.",
    description:
      "Target posts by hashtag, keyword, or specific creator. Casper only likes posts worth liking — and skips the spam.",
    bullets: [
      "Hashtag, keyword, and creator-list targeting",
      "Fresh-post filter — no resurfacing month-old content",
      "Junk-post skip and per-account dedupe",
      "Daily caps with random variance",
    ],
    Art: AutoLikeArt,
  },
  {
    index: "02",
    label: "AI Comments",
    title: "Comments that sound",
    highlight: "like you.",
    description:
      "Casper reads the full post, drafts in your tone, and runs every line through a profanity + risk filter before it ever reaches your queue.",
    bullets: [
      "Tone presets — Designer, Founder, Coach, Writer",
      "Custom voice training on 10 of your past comments",
      "Length and structure controls per platform",
      "Approval queue or auto-post mode",
    ],
    Art: AICommentsArt,
  },
  {
    index: "03",
    label: "Smart Follow & Connect",
    title: "Reach the right",
    highlight: "people.",
    description:
      "Follow the engagers of creators you admire. Send personalized LinkedIn connection notes. Stop chasing followers who'll never engage back.",
    bullets: [
      "Follow engagers of target creators",
      "Bio-keyword targeting on both platforms",
      "Personalized LinkedIn connection notes",
      "Auto-unfollow non-followers (with whitelist)",
    ],
    Art: SmartFollowArt,
  },
  {
    index: "04",
    label: "Smart Scheduling",
    title: "Active hours,",
    highlight: "your way.",
    description:
      "Casper engages on your schedule, in your time zone, with a burst right after you post — and a one-tap pause when life happens.",
    bullets: [
      "Time-zone aware activity windows",
      "Burst mode after you publish",
      "Random delays — never two actions in the same second",
      "One-tap kill switch in the popup",
    ],
    Art: SmartSchedulingArt,
  },
  {
    index: "05",
    label: "Safety Engine",
    title: "Built like",
    highlight: "a vault.",
    description:
      "Safety isn't a feature in Casper — it's the foundation. Random delays, age-aware caps, and auto-pause the moment a platform looks twice.",
    bullets: [
      "Browser-session execution — never headless",
      "Age-aware daily caps that scale conservatively",
      "Auto-pause for 3hrs on any platform anomaly",
      "Transparent action log on every like, comment, follow",
    ],
    Art: SafetyEngineArt,
  },
];

/* ----------------------- Row + Section ----------------------- */

function FeatureRow({
  feature,
  reverse,
}: {
  feature: Feature;
  reverse: boolean;
}) {
  const { index, label, title, highlight, description, bullets, Art } = feature;
  return (
    <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-16">
      {/* Text */}
      <div className={reverse ? "md:order-2" : ""}>
        <div className="flex items-center gap-3">
          <span className="font-sans font-black text-xs tracking-[0.35em] text-coral">
            {index}
          </span>
          <span className="h-px flex-1 max-w-[60px] bg-coral/30" />
          <span className="font-sans font-black text-[11px] tracking-[0.3em] text-cream/70">
            {label.toUpperCase()}
          </span>
        </div>

        <h3 className="mt-5 font-sans font-black text-3xl leading-[1] tracking-tight text-cream sm:text-4xl md:text-5xl">
          {title}
          <br />
          <span className="text-coral">{highlight}</span>
        </h3>

        <p className="mt-5 text-sm text-cream/70 md:text-base">
          {description}
        </p>

        <ul className="mt-6 space-y-2.5">
          {bullets.map((b) => (
            <li
              key={b}
              className="flex items-start gap-3 text-sm text-cream/85"
            >
              <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-coral text-cream">
                <svg
                  viewBox="0 0 12 12"
                  className="h-2.5 w-2.5"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M2.5 6 L5 8.5 L9.5 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Art */}
      <div className={`flex justify-center ${reverse ? "md:order-1" : ""}`}>
        <Art />
      </div>
    </div>
  );
}

export function Features() {
  return (
    <section
      id="features"
      className="relative overflow-hidden bg-grad-a py-24 md:py-32"
    >
      {/* Decorations */}
      <BloodDrip
        className="pointer-events-none absolute right-[4%] top-16 h-12 w-auto opacity-60"
        rotate={15}
      />
      <BloodDrip
        className="pointer-events-none absolute left-[6%] bottom-32 h-8 w-auto opacity-50"
        rotate={-160}
      />
      <ClawScratch
        className="pointer-events-none absolute -left-4 top-[8%] hidden h-24 w-auto opacity-60 lg:block"
        rotate={-12}
      />
      <ClawScratch
        className="pointer-events-none absolute -right-6 bottom-[6%] hidden h-24 w-auto opacity-50 lg:block"
        rotate={172}
      />
      <Eyeball
        className="pointer-events-none absolute right-[3%] top-[36%] hidden h-10 w-auto opacity-80 md:block"
        rotate={20}
      />
      <TextSticker
        text="ON YOUR TONE"
        size="md"
        tilt={9}
        className="absolute right-[4%] top-[6%] hidden lg:block"
      />

      {/* Decorative floating ghosts */}
      <div
        className="pointer-events-none absolute left-[6%] top-[8%] hidden opacity-25 animate-float md:block"
        style={{ animationDelay: "0.4s" }}
      >
        <GhostHeartEyes className="h-12 w-auto" />
      </div>
      <div
        className="pointer-events-none absolute right-[6%] top-[42%] hidden opacity-30 animate-float md:block"
        style={{ animationDelay: "1.6s" }}
      >
        <GhostPeeking className="h-11 w-auto" />
      </div>
      <div
        className="pointer-events-none absolute left-[10%] bottom-[14%] hidden opacity-25 animate-float md:block"
        style={{ animationDelay: "2.7s" }}
      >
        <GhostStarEyes className="h-10 w-auto" />
      </div>
      <div
        className="pointer-events-none absolute left-[10%] top-[20%] text-cream/30 animate-fly"
        style={{ animationDelay: "0.6s" }}
      >
        <Bat className="h-11 w-auto" flap />
      </div>
      <div
        className="pointer-events-none absolute right-[15%] bottom-[18%] text-cream/25 animate-fly"
        style={{ animationDelay: "2.2s" }}
      >
        <Bat className="h-9 w-auto" flap />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-cream/70 md:text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            Features
          </span>
          <h2 className="font-sans font-black text-4xl leading-[0.95] tracking-tight text-cream sm:text-5xl md:text-6xl">
            Everything you need.
            <br />
            None of the <span className="text-coral">noise.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-sm text-cream/70 md:text-base">
            Five simple features that handle your daily likes, comments, and
            follows — quietly, in the background.
          </p>
        </div>

        {/* Zigzag rows */}
        <div className="mt-20 space-y-24 md:mt-28 md:space-y-36">
          {FEATURES.map((f, i) => (
            <FeatureRow key={f.index} feature={f} reverse={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
