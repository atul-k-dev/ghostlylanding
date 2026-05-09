import { Bat } from "./Bat";
import { BloodDrip } from "./BloodDrip";
import { BloodEdge } from "./BloodEdge";
import { BloodSplatter } from "./BloodSplatter";
import { GhostMascot } from "./GhostMascot";
import { ClawScratch } from "./stickers/ClawScratch";
import { CuteSkull } from "./stickers/CuteSkull";
import { Handprint } from "./stickers/Handprint";
import { TextSticker } from "./stickers/TextSticker";

type Pillar = {
  title: string;
  body: string;
  metric?: string;
};

const PILLARS: Pillar[] = [
  {
    title: "Browser-session only",
    body: "Casper acts in your already-logged-in browser, the way you would. No credentials collected. No cloud-side logins. No headless servers.",
    metric: "0 passwords stored",
  },
  {
    title: "Random delays per action",
    body: "Every like, comment, and follow waits a randomized 8-45 seconds. Never two actions in the same second.",
    metric: "8-45s",
  },
  {
    title: "Caps that scale with age",
    body: "New accounts get conservative quotas — older accounts ramp up. Casper never exceeds platform-safe thresholds.",
    metric: "30-300/day",
  },
  {
    title: "Auto-pause on anomaly",
    body: "If the platform returns a rate-limit, soft-block, or anything weird — Casper halts for 3 hours and pings you immediately.",
    metric: "3hr cooldown",
  },
  {
    title: "One-tap kill switch",
    body: "Stop every queued and scheduled action from the extension popup, instantly. No confirmation modal, no friction.",
    metric: "1 tap",
  },
  {
    title: "Transparent action logs",
    body: "Every like, comment, and follow is logged with target URL and timestamp. No silent activity. Ever.",
    metric: "100% logged",
  },
];

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

      {/* Bats — chamgadar */}
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

      <div className="relative z-10 mx-auto max-w-6xl px-6 pt-12 md:px-10 md:pt-16">
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
            Solo creators are paranoid about losing accounts they spent years
            building — for good reason. Six product decisions make Casper the
            safest option in this category.
          </p>
        </div>

        {/* Big mascot in middle, with surrounding pillars */}
        <div className="relative mt-16 grid grid-cols-1 gap-5 md:mt-20 md:grid-cols-2 lg:grid-cols-3">
          {PILLARS.map((p, i) => (
            <article
              key={p.title}
              className={`group relative flex flex-col rounded-3xl border border-cream/10 bg-ink-soft/80 p-7 backdrop-blur-sm transition hover:border-coral/40 hover:bg-ink-soft md:p-8 ${
                i === 2 ? "lg:order-3" : ""
              }`}
            >
              {p.metric && (
                <span className="mb-4 inline-flex w-fit items-baseline gap-1 rounded-full bg-coral/10 px-3 py-1 font-display text-xs tracking-[0.15em] text-coral">
                  {p.metric}
                </span>
              )}
              <h3 className="font-display text-lg leading-tight tracking-tight text-cream md:text-xl">
                {p.title}
              </h3>
              <p className="mt-3 text-sm text-cream/70 md:text-[15px]">
                {p.body}
              </p>
              <span
                aria-hidden="true"
                className="mt-5 block h-px w-8 bg-coral transition-all duration-300 group-hover:w-16"
              />
            </article>
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
