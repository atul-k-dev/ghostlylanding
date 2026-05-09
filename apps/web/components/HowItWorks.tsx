import { Bat } from "./Bat";
import { BloodDrip } from "./BloodDrip";
import { GhostMascot } from "./GhostMascot";
import { GhostSleeping } from "./GhostSleeping";
import { GhostWaving } from "./GhostWaving";
import { Handprint } from "./stickers/Handprint";
import { TextSticker } from "./stickers/TextSticker";

/* ----------------------- Per-step UI mockups ----------------------- */

function Step1Mock() {
  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      {/* Browser window */}
      <div className="relative overflow-hidden rounded-2xl border border-cream/15 bg-ink-soft/95 shadow-[0_25px_70px_rgba(0,0,0,0.55)]">
        {/* chrome bar */}
        <div className="flex items-center gap-1.5 border-b border-cream/10 px-3 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-cream/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-cream/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-cream/15" />
          <div className="ml-3 flex flex-1 items-center gap-2 rounded-md bg-ink/60 px-2.5 py-1 text-[10px] text-cream/45">
            <span className="text-coral">●</span>
            x.com/home
          </div>
          <div className="ml-2 rounded-md bg-coral/20 p-1 ring-2 ring-coral">
            <GhostMascot className="h-4 w-4" />
          </div>
        </div>
        {/* page content silhouette */}
        <div className="space-y-2.5 p-4 pb-12">
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 flex-none rounded-full bg-cream/15" />
            <div className="space-y-1">
              <div className="h-1.5 w-20 rounded bg-cream/25" />
              <div className="h-1.5 w-12 rounded bg-cream/10" />
            </div>
          </div>
          <div className="space-y-1.5 pl-9">
            <div className="h-1.5 w-full rounded bg-cream/10" />
            <div className="h-1.5 w-[80%] rounded bg-cream/10" />
            <div className="h-1.5 w-[55%] rounded bg-cream/10" />
          </div>
        </div>
      </div>

      {/* Casper popup */}
      <div className="absolute -right-4 top-14 w-[210px] rotate-[3deg] rounded-2xl border border-coral/40 bg-ink-soft p-4 shadow-[0_15px_50px_rgba(185,28,28,0.25)]">
        <div className="flex items-center gap-2.5">
          <GhostWaving className="h-7 w-7" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-cream">Casper</div>
            <div className="flex items-center gap-1 text-[10px] text-coral">
              <span className="h-1 w-1 rounded-full bg-coral" />
              Watching
            </div>
          </div>
          <div className="relative h-4 w-7 rounded-full bg-coral">
            <div className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-cream" />
          </div>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-cream/55">Today</span>
            <span className="font-semibold text-cream">12 / 80</span>
          </div>
          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-cream/10">
            <div className="h-full w-[15%] rounded-full bg-coral" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Step2Mock() {
  const niches = ["Designer", "Founder", "Coach", "Writer"];
  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      <div className="overflow-hidden rounded-2xl border border-cream/15 bg-ink-soft/95 p-5 shadow-[0_25px_70px_rgba(0,0,0,0.55)] md:p-6">
        <div className="mb-4 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-coral">
          <svg
            className="h-3 w-3"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M8 0 L9 7 L16 8 L9 9 L8 16 L7 9 L0 8 L7 7 Z" />
          </svg>
          Train your tone
        </div>

        <div className="mb-2 text-[11px] text-cream/55">
          Pick a niche template
        </div>
        <div className="mb-5 flex flex-wrap gap-2">
          {niches.map((p, i) => (
            <span
              key={p}
              className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition ${
                i === 0
                  ? "bg-coral text-cream shadow-[0_4px_18px_rgba(185,28,28,0.35)]"
                  : "border border-cream/20 text-cream/55"
              }`}
            >
              {p}
            </span>
          ))}
        </div>

        <div className="mb-2 text-[11px] text-cream/55">
          Or paste 10 past comments
        </div>
        <div className="space-y-1.5 rounded-lg border border-cream/10 bg-ink/50 p-3">
          <div className="h-1.5 w-full rounded bg-cream/15" />
          <div className="h-1.5 w-[88%] rounded bg-cream/15" />
          <div className="h-1.5 w-[72%] rounded bg-cream/15" />
          <div className="h-1.5 w-[60%] rounded bg-cream/15" />
          <div className="h-1.5 w-[78%] rounded bg-cream/15" />
        </div>

        <div className="mt-4 flex items-center gap-2.5">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-cream/10">
            <div className="h-full w-[68%] rounded-full bg-coral" />
          </div>
          <span className="text-[10px] font-semibold text-coral">68%</span>
        </div>
        <div className="mt-1.5 text-[10px] text-cream/50">
          Extracting tone profile…
        </div>
      </div>

      {/* Floating ghost mascot */}
      <div className="absolute -bottom-4 -left-6 animate-float">
        <GhostMascot className="h-20 w-auto" />
      </div>
    </div>
  );
}

function Step3Mock() {
  const events: { time: string; action: string; target: string }[] = [
    { time: "10:42 PM", action: "Liked", target: "@designer" },
    { time: "10:54 PM", action: "Commented on", target: "@founder" },
    { time: "11:12 PM", action: "Followed", target: "@writer" },
    { time: "11:34 PM", action: "Liked", target: "@coach" },
    { time: "12:08 AM", action: "Commented on", target: "@indiehacker" },
  ];
  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      <div className="overflow-hidden rounded-2xl border border-cream/15 bg-ink-soft/95 p-5 shadow-[0_25px_70px_rgba(0,0,0,0.55)] md:p-6">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-coral">
              Last night
            </div>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-display text-3xl text-cream">47</span>
              <span className="text-xs text-cream-dim">actions</span>
            </div>
          </div>
          <GhostSleeping className="h-14 w-auto opacity-95" />
        </div>

        <div className="space-y-1.5">
          {events.map((e) => (
            <div
              key={e.time}
              className="flex items-center gap-2.5 rounded-lg bg-ink/40 px-3 py-2"
            >
              <span className="h-1.5 w-1.5 flex-none rounded-full bg-coral" />
              <span className="text-[10px] font-mono text-cream/45">
                {e.time}
              </span>
              <span className="text-[11px] text-cream/85">
                {e.action}{" "}
                <span className="font-semibold text-coral">{e.target}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-cream/10 pt-3">
          <div className="text-[10px] text-cream/55">
            Next action in{" "}
            <span className="font-semibold text-cream/85">14m 22s</span>
          </div>
          <button
            type="button"
            className="rounded-full border border-cream/20 px-3 py-1 text-[10px] font-semibold text-cream/70"
          >
            Pause
          </button>
        </div>
      </div>
    </div>
  );
}

/* ----------------------- Step data ----------------------- */

type Step = {
  index: string;
  label: string;
  title: string;
  highlight: string;
  body: string;
  bullets: string[];
  Mock: () => React.ReactElement;
};

const STEPS: Step[] = [
  {
    index: "01",
    label: "Connect",
    title: "Pin Casper.",
    highlight: "Stay logged in.",
    body: "Add the extension to Chrome and stay logged into Twitter and LinkedIn the way you already do — Casper acts in your real browser session, never a cloud server.",
    bullets: [
      "One-click Chrome install",
      "No new accounts, no new passwords",
      "Works with your existing logins",
    ],
    Mock: Step1Mock,
  },
  {
    index: "02",
    label: "Train",
    title: "Teach Casper",
    highlight: "your voice.",
    body: "Pick a niche preset — Designer, Founder, Coach, Writer — or paste 10 of your past comments. Casper extracts a tone profile and uses it on every reply.",
    bullets: [
      "Four niche templates ready to go",
      "Or train on your own past comments",
      "Length and structure controls",
    ],
    Mock: Step2Mock,
  },
  {
    index: "03",
    label: "Sleep",
    title: "Wake up to a",
    highlight: "fresh log.",
    body: "Casper engages on your schedule with random delays and daily caps. Every action is logged with target and timestamp — no silent activity, ever.",
    bullets: [
      "Random 8–45s delays between actions",
      "Auto-pause on any platform anomaly",
      "Daily summary email at 9pm your time",
    ],
    Mock: Step3Mock,
  },
];

/* ----------------------- Section ----------------------- */

function StepRow({ step, reverse }: { step: Step; reverse: boolean }) {
  const { index, label, title, highlight, body, bullets, Mock } = step;
  return (
    <div className="grid grid-cols-1 items-center gap-12 md:grid-cols-2 md:gap-16">
      {/* Text */}
      <div className={reverse ? "md:order-2" : ""}>
        <div className="flex items-center gap-3">
          <span className="font-display text-xs tracking-[0.35em] text-coral">
            {index}
          </span>
          <span className="h-px w-12 bg-coral/30" />
          <span className="font-display text-[11px] tracking-[0.3em] text-cream/70">
            {label.toUpperCase()}
          </span>
        </div>

        <h3 className="mt-5 font-display text-3xl leading-[1] tracking-tight text-cream sm:text-4xl md:text-5xl">
          {title}
          <br />
          <span className="text-coral">{highlight}</span>
        </h3>

        <p className="mt-5 text-sm text-cream/70 md:text-base">{body}</p>

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

      {/* Mock */}
      <div className={`flex justify-center ${reverse ? "md:order-1" : ""}`}>
        <Mock />
      </div>
    </div>
  );
}

export function HowItWorks() {
  return (
    <section
      id="how-it-works"
      className="relative overflow-hidden bg-ink-soft py-24 md:py-32"
    >
      {/* Decorative drips */}
      <BloodDrip
        className="pointer-events-none absolute left-[3%] top-12 h-10 w-auto opacity-70"
        rotate={-15}
      />
      <BloodDrip
        className="pointer-events-none absolute right-[6%] top-24 h-6 w-auto opacity-50"
        rotate={20}
      />
      <BloodDrip
        className="pointer-events-none absolute right-[12%] bottom-16 h-8 w-auto opacity-60"
        rotate={180}
      />
      <BloodDrip
        className="pointer-events-none absolute left-[8%] bottom-24 h-5 w-auto opacity-40"
        rotate={170}
      />

      {/* Bat */}
      <div
        className="pointer-events-none absolute right-[24%] top-[10%] text-cream/30 animate-fly"
        style={{ animationDelay: "0.8s" }}
      >
        <Bat className="h-11 w-auto" flap />
      </div>

      {/* Stickers */}
      <Handprint
        className="pointer-events-none absolute right-[3%] top-[14%] hidden h-24 w-auto opacity-80 lg:block"
        rotate={18}
      />
      <TextSticker
        text="ON IT!"
        size="md"
        tilt={-8}
        className="absolute left-[3%] top-[36%] hidden lg:block"
      />

      {/* Top hairline */}
      <div className="absolute left-1/2 top-0 h-px w-2/3 -translate-x-1/2 bg-gradient-to-r from-transparent via-cream/15 to-transparent" />

      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-10">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-cream/70 md:text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            How it works
          </span>
          <h2 className="font-display text-4xl leading-[0.95] tracking-tight text-cream sm:text-5xl md:text-6xl">
            Connect. Train.
            <br />
            <span className="text-coral">Sleep.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-sm text-cream/70 md:text-base">
            Three steps to autopilot. No agency setup, no enterprise
            dashboard, no cold templates staring at you.
          </p>
        </div>

        {/* Zigzag steps */}
        <div className="mt-20 space-y-24 md:mt-28 md:space-y-32">
          {STEPS.map((step, i) => (
            <StepRow key={step.index} step={step} reverse={i % 2 === 1} />
          ))}
        </div>
      </div>
    </section>
  );
}
