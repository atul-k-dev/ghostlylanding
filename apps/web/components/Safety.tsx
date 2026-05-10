import { Bat } from "./Bat";
import { BloodDrip } from "./BloodDrip";
import { BloodEdge } from "./BloodEdge";
import { BloodSplatter } from "./BloodSplatter";
import { GhostMascot } from "./GhostMascot";
import { ClawScratch } from "./stickers/ClawScratch";
import { CuteSkull } from "./stickers/CuteSkull";
import { Handprint } from "./stickers/Handprint";
import { TextSticker } from "./stickers/TextSticker";

/* ---------------- Per-pillar SVG icons ---------------- */

function BrowserShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* Browser window frame */}
      <rect
        x="14"
        y="22"
        width="92"
        height="76"
        rx="6"
        stroke="#e8ddc7"
        strokeOpacity="0.45"
        strokeWidth="2"
      />
      <line
        x1="14"
        y1="36"
        x2="106"
        y2="36"
        stroke="#e8ddc7"
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      <circle cx="22" cy="29" r="2" fill="#e8ddc7" fillOpacity="0.4" />
      <circle cx="30" cy="29" r="2" fill="#e8ddc7" fillOpacity="0.4" />
      <circle cx="38" cy="29" r="2" fill="#e8ddc7" fillOpacity="0.4" />
      {/* Shield over window */}
      <path
        d="M60 46 L86 56 V78 C86 90 76 98 60 104 C44 98 34 90 34 78 V56 Z"
        fill="#b91c1c"
        fillOpacity="0.18"
        stroke="#b91c1c"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <path
        d="M51 76 L57 82 L70 68"
        stroke="#e8ddc7"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function RandomClockIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="40"
        cy="42"
        r="22"
        stroke="#e8ddc7"
        strokeOpacity="0.5"
        strokeWidth="2"
      />
      {/* Hour ticks */}
      <line x1="40" y1="22" x2="40" y2="26" stroke="#e8ddc7" strokeWidth="2" strokeLinecap="round" />
      <line x1="60" y1="42" x2="56" y2="42" stroke="#e8ddc7" strokeWidth="2" strokeLinecap="round" />
      <line x1="40" y1="62" x2="40" y2="58" stroke="#e8ddc7" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="42" x2="24" y2="42" stroke="#e8ddc7" strokeWidth="2" strokeLinecap="round" />
      {/* Hands */}
      <line x1="40" y1="42" x2="40" y2="30" stroke="#e8ddc7" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="40" y1="42" x2="50" y2="46" stroke="#b91c1c" strokeWidth="3" strokeLinecap="round" />
      <circle cx="40" cy="42" r="2.5" fill="#b91c1c" />
      {/* Random sparkles around */}
      <path d="M67 22 L68 26 L72 27 L68 28 L67 32 L66 28 L62 27 L66 26 Z" fill="#b91c1c" />
      <path d="M14 16 L14.5 18 L17 18.5 L14.5 19 L14 21 L13.5 19 L11 18.5 L13.5 18 Z" fill="#b91c1c" fillOpacity="0.6" />
      <circle cx="68" cy="60" r="1.5" fill="#b91c1c" fillOpacity="0.5" />
    </svg>
  );
}

function PauseShieldIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M40 14 L64 24 V44 C64 56 54 66 40 70 C26 66 16 56 16 44 V24 Z"
        fill="#b91c1c"
        fillOpacity="0.12"
        stroke="#e8ddc7"
        strokeOpacity="0.45"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <rect x="31" y="32" width="5" height="18" rx="1" fill="#b91c1c" />
      <rect x="44" y="32" width="5" height="18" rx="1" fill="#b91c1c" />
    </svg>
  );
}

function PowerKillIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <circle
        cx="40"
        cy="42"
        r="22"
        stroke="#e8ddc7"
        strokeOpacity="0.45"
        strokeWidth="2"
      />
      <line
        x1="40"
        y1="24"
        x2="40"
        y2="42"
        stroke="#b91c1c"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <path
        d="M28 36 A14 14 0 1 0 52 36"
        stroke="#b91c1c"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GrowingCapsIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      {/* Bars */}
      <rect x="12" y="50" width="9" height="14" rx="1.5" fill="#b91c1c" fillOpacity="0.35" />
      <rect x="26" y="42" width="9" height="22" rx="1.5" fill="#b91c1c" fillOpacity="0.55" />
      <rect x="40" y="32" width="9" height="32" rx="1.5" fill="#b91c1c" fillOpacity="0.75" />
      <rect x="54" y="22" width="9" height="42" rx="1.5" fill="#b91c1c" />
      {/* Trend arrow */}
      <path
        d="M14 52 L29 44 L43 34 L58 24"
        stroke="#e8ddc7"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M58 24 L52 22 M58 24 L56 30"
        stroke="#e8ddc7"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LogListIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 80"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="14"
        y="16"
        width="52"
        height="48"
        rx="4"
        stroke="#e8ddc7"
        strokeOpacity="0.45"
        strokeWidth="2"
      />
      {/* Row 1 */}
      <circle cx="22" cy="28" r="2" fill="#b91c1c" />
      <line x1="29" y1="28" x2="50" y2="28" stroke="#e8ddc7" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
      <line x1="55" y1="28" x2="60" y2="28" stroke="#e8ddc7" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
      {/* Row 2 */}
      <circle cx="22" cy="40" r="2" fill="#b91c1c" />
      <line x1="29" y1="40" x2="46" y2="40" stroke="#e8ddc7" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
      <line x1="51" y1="40" x2="60" y2="40" stroke="#e8ddc7" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
      {/* Row 3 */}
      <circle cx="22" cy="52" r="2" fill="#b91c1c" />
      <line x1="29" y1="52" x2="52" y2="52" stroke="#e8ddc7" strokeOpacity="0.7" strokeWidth="2" strokeLinecap="round" />
      <line x1="57" y1="52" x2="60" y2="52" stroke="#e8ddc7" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

/* ---------------- Card data ---------------- */

type Pillar = {
  metric: string;
  title: string;
  body: string;
  Icon: ({ className }: { className?: string }) => React.ReactElement;
  className: string;
  iconSize: string;
  featured?: boolean;
};

const PILLARS: Pillar[] = [
  {
    metric: "0 passwords stored",
    title: "Browser-session only",
    body: "Casper acts in your already-logged-in browser, just like you would. We never see your passwords. We never log in from cloud servers.",
    Icon: BrowserShieldIcon,
    className: "md:col-span-3 md:row-span-2",
    iconSize: "h-32 md:h-40",
    featured: true,
  },
  {
    metric: "8-45s delays",
    title: "Random delays per action",
    body: "Every like, comment, and follow waits 8-45 random seconds. Two actions never happen in the same second.",
    Icon: RandomClockIcon,
    className: "md:col-span-3",
    iconSize: "h-16",
  },
  {
    metric: "3hr cooldown",
    title: "Auto-pause if anything looks off",
    body: "Rate limit, soft-block, anything weird — Casper stops for 3 hours and pings you immediately.",
    Icon: PauseShieldIcon,
    className: "md:col-span-3",
    iconSize: "h-16",
  },
  {
    metric: "1 tap",
    title: "One-tap kill switch",
    body: "Stop every queued and scheduled action instantly from the extension popup. No confirmation, no friction.",
    Icon: PowerKillIcon,
    className: "md:col-span-2",
    iconSize: "h-14",
  },
  {
    metric: "30-300/day",
    title: "Caps that scale with age",
    body: "New accounts start with conservative limits. Older accounts ramp up. We never push past safe thresholds.",
    Icon: GrowingCapsIcon,
    className: "md:col-span-2",
    iconSize: "h-14",
  },
  {
    metric: "100% logged",
    title: "Transparent action logs",
    body: "Every like, comment, and follow is logged with the target URL and timestamp. No silent activity, ever.",
    Icon: LogListIcon,
    className: "md:col-span-2",
    iconSize: "h-14",
  },
];

/* ---------------- Cards ---------------- */

function PillarCard({ pillar }: { pillar: Pillar }) {
  const { metric, title, body, Icon, className, iconSize, featured } = pillar;

  if (featured) {
    return (
      <article
        className={`group relative flex flex-col overflow-hidden rounded-3xl border border-coral/40 bg-gradient-to-br from-coral/[0.10] via-ink-soft to-ink p-7 transition hover:border-coral/60 md:p-8 ${className}`}
      >
        {/* Background mascot watermark */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-4 -right-4 opacity-[0.06]"
        >
          <GhostMascot className="h-44 w-auto md:h-52" />
        </div>

        <div className="relative flex flex-1 flex-col">
          <span className="mb-5 inline-flex w-fit items-center gap-2 rounded-full bg-coral/15 px-3 py-1 font-display text-[11px] tracking-[0.2em] text-coral">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            {metric.toUpperCase()}
          </span>

          <Icon className={`${iconSize} w-auto text-cream`} />

          <h3 className="mt-6 font-display text-2xl leading-tight tracking-tight text-cream md:text-3xl">
            {title}
          </h3>
          <p className="mt-4 max-w-md text-sm text-cream/75 md:text-[15px]">
            {body}
          </p>

          <span
            aria-hidden="true"
            className="mt-auto block h-px w-12 bg-coral pt-0 transition-all duration-300 group-hover:w-24"
          />
        </div>
      </article>
    );
  }

  return (
    <article
      className={`group relative flex flex-col rounded-3xl border border-cream/10 bg-ink-soft/80 p-6 backdrop-blur-sm transition hover:border-coral/40 hover:bg-ink-soft md:p-7 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-coral/10 px-2.5 py-0.5 font-display text-[10px] tracking-[0.18em] text-coral">
          {metric.toUpperCase()}
        </span>
        <Icon className={`${iconSize} w-auto text-cream`} />
      </div>

      <h3 className="mt-4 font-display text-lg leading-tight tracking-tight text-cream md:text-xl">
        {title}
      </h3>
      <p className="mt-2.5 text-sm text-cream/70 md:text-[14px]">{body}</p>

      <span
        aria-hidden="true"
        className="mt-5 block h-px w-8 bg-coral transition-all duration-300 group-hover:w-16"
      />
    </article>
  );
}

/* ---------------- Section ---------------- */

export function Safety() {
  return (
    <section
      id="safety"
      className="relative overflow-hidden bg-ink py-32 md:py-40"
    >
      {/* Drip curtain at the top — bleeding into this section */}
      <BloodEdge className="absolute left-0 right-0 top-0 h-24 opacity-90 md:h-28" />

      {/* Splatters */}
      <BloodSplatter
        className="pointer-events-none absolute right-[-8%] top-[20%] h-[420px] w-[420px] opacity-[0.06]"
        rotate={15}
      />
      <BloodSplatter
        className="pointer-events-none absolute -left-24 bottom-[10%] h-72 w-72 opacity-[0.05]"
        rotate={140}
      />

      {/* Loose drips */}
      <BloodDrip
        className="pointer-events-none absolute left-[12%] top-[18%] h-7 w-auto opacity-60"
        rotate={5}
      />
      <BloodDrip
        className="pointer-events-none absolute right-[6%] top-[35%] h-12 w-auto opacity-70"
        rotate={-10}
      />
      <BloodDrip
        className="pointer-events-none absolute left-[40%] bottom-[12%] h-6 w-auto opacity-40"
        rotate={170}
      />

      {/* Bats */}
      <div
        className="pointer-events-none absolute left-[8%] top-[14%] text-cream/70 animate-fly"
        style={{ animationDelay: "0.2s" }}
      >
        <Bat className="h-16 w-auto" flap />
      </div>
      <div
        className="pointer-events-none absolute right-[12%] top-[8%] text-cream/60 animate-fly"
        style={{ animationDelay: "1.2s" }}
      >
        <Bat className="h-14 w-auto" flap />
      </div>
      <div
        className="pointer-events-none absolute right-[28%] top-[24%] text-cream/40 animate-fly"
        style={{ animationDelay: "2s" }}
      >
        <Bat className="h-11 w-auto" flap />
      </div>

      {/* Stickers */}
      <CuteSkull
        className="pointer-events-none absolute right-[4%] top-[20%] hidden h-28 w-auto opacity-95 lg:block"
        rotate={12}
      />
      <Handprint
        className="pointer-events-none absolute left-[3%] bottom-[28%] hidden h-28 w-auto opacity-85 lg:block"
        rotate={-22}
      />
      <ClawScratch
        className="pointer-events-none absolute right-[6%] bottom-[18%] hidden h-20 w-auto opacity-70 md:block"
        rotate={-15}
      />
      <TextSticker
        text="ZERO BANS"
        size="lg"
        tilt={-9}
        className="absolute left-[7%] top-[18%] hidden lg:block"
      />
      <TextSticker
        text="SAFE!"
        size="md"
        tilt={6}
        className="absolute right-[24%] bottom-[8%] hidden lg:block"
      />

      <div className="relative z-10 mx-auto max-w-7xl px-6 pt-12 md:px-10 md:pt-16">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-cream/70 md:text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            Safety promise
          </span>
          <h2 className="font-display text-3xl leading-[1] tracking-tight text-cream sm:text-4xl md:text-5xl">
            Your account is yours.
            <br />
            <span className="text-coral">Forever.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-sm text-cream/70 md:text-base">
            Losing an account you spent years building is a real fear. Six
            simple choices make Casper the safest way to grow.
          </p>
        </div>

        {/* Bento grid */}
        <div className="mt-16 grid grid-cols-1 gap-5 md:mt-20 md:grid-cols-6 md:gap-6">
          {PILLARS.map((p) => (
            <PillarCard key={p.title} pillar={p} />
          ))}
        </div>

        {/* Footer reassurance with mascot */}
        <div className="mt-16 flex flex-col items-center justify-center gap-4 rounded-3xl border border-cream/10 bg-ink-soft/60 p-8 text-center md:mt-20 md:flex-row md:gap-6 md:text-left">
          <GhostMascot className="h-20 w-auto md:h-24" />
          <div className="max-w-xl">
            <h3 className="font-display text-xl leading-tight tracking-tight text-cream md:text-2xl">
              Zero bans is the goal. Always.
            </h3>
            <p className="mt-2 text-sm text-cream/70">
              If a feature ever conflicts with platform safety, we cut the
              feature. The tool is here to grow your account — not put it at
              risk.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
