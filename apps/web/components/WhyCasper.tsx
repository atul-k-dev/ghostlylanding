import { Bat } from "./Bat";
import { BloodDrip } from "./BloodDrip";
import { BloodSplatter } from "./BloodSplatter";
import { GhostMascot } from "./GhostMascot";
import { Eyeball } from "./stickers/Eyeball";
import { TextSticker } from "./stickers/TextSticker";

const THEM = [
  "Made for big sales teams",
  "Works only on LinkedIn",
  "Runs from cloud servers logged into your account",
  "Sends generic, copy-paste comments",
  "Looks like heavy enterprise software",
  "Pushes you to send more, faster",
];

const US = [
  "Made for one creator — you",
  "Works on Twitter and LinkedIn from day one",
  "Runs inside your own browser — never the cloud",
  "Writes comments in your tone, post by post",
  "Looks like a friendly ghost in your toolbar",
  "Helps you grow on your own schedule",
];

function CrossIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={className}
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3 3 L9 9 M9 3 L3 9"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={className}
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
  );
}

export function WhyCasper() {
  return (
    <section
      id="why-casper"
      className="relative overflow-hidden bg-ink pattern-diagonal py-24 md:py-32"
    >
      {/* Background splatter */}
      <BloodSplatter
        className="pointer-events-none absolute -right-20 -top-20 h-96 w-96 opacity-[0.07]"
        rotate={25}
      />
      <BloodSplatter
        className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 opacity-[0.05]"
        rotate={-40}
      />

      {/* Drips */}
      <BloodDrip
        className="pointer-events-none absolute right-[8%] top-12 h-10 w-auto opacity-70"
        rotate={10}
      />
      <BloodDrip
        className="pointer-events-none absolute left-[10%] bottom-32 h-8 w-auto opacity-50"
        rotate={-170}
      />

      {/* Single bat flying in */}
      <div
        className="pointer-events-none absolute right-[15%] top-[10%] text-coral/70 animate-fly"
        style={{ animationDelay: "1s" }}
      >
        <Bat className="h-14 w-auto" flap />
      </div>

      {/* Stickers */}
      <TextSticker
        text="NOPE."
        size="md"
        tilt={-14}
        className="absolute left-[4%] top-[40%] hidden lg:block"
      />
      <TextSticker
        text="YES!"
        size="md"
        tilt={8}
        className="absolute right-[3%] bottom-[22%] hidden lg:block"
      />
      <Eyeball
        className="pointer-events-none absolute left-[8%] bottom-[10%] hidden h-12 w-auto opacity-80 md:block"
        rotate={-15}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-10">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-cream/70 md:text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            Why Casper
          </span>
          <h2 className="font-display text-3xl leading-[1] tracking-tight text-cream sm:text-4xl md:text-5xl">
            Built for one creator.
            <br />
            Not a <span className="text-coral">sales floor.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-sm text-cream/70 md:text-base">
            Other growth tools are built for big sales teams. Casper is built
            for one person — you.
          </p>
        </div>

        {/* Two cards */}
        <div className="mt-14 grid grid-cols-1 gap-5 md:mt-20 md:gap-6 lg:grid-cols-2">
          {/* THEM */}
          <article className="relative flex flex-col rounded-3xl border border-cream/10 bg-ink/60 p-6 md:p-8">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-cream/10 pb-5">
              <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full border border-cream/20 text-cream/55">
                <CrossIcon className="h-4 w-4" />
              </span>
              <div>
                <div className="font-display text-[11px] tracking-[0.3em] text-cream/55">
                  OTHER TOOLS
                </div>
                <div className="font-display text-lg leading-tight text-cream md:text-xl">
                  Cold sales-team feel
                </div>
              </div>
            </div>

            {/* List */}
            <ul className="mt-5 space-y-3.5">
              {THEM.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-sm text-cream/55 md:text-[15px]"
                >
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full border border-cream/20 text-cream/55">
                    <CrossIcon className="h-2.5 w-2.5" />
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>

          {/* US */}
          <article className="relative flex flex-col overflow-hidden rounded-3xl border border-coral/40 bg-gradient-to-br from-coral/[0.10] via-ink-soft to-ink p-6 md:p-8">
            {/* Background mascot */}
            <div className="pointer-events-none absolute -bottom-6 -right-4 opacity-[0.08]">
              <GhostMascot className="h-44 w-auto md:h-52" />
            </div>

            {/* Header */}
            <div className="relative flex items-center gap-3 border-b border-cream/10 pb-5">
              <span className="inline-flex h-10 w-10 flex-none items-center justify-center rounded-full bg-coral text-cream shadow-[0_4px_18px_rgba(185,28,28,0.4)]">
                <CheckIcon className="h-4 w-4" />
              </span>
              <div>
                <div className="font-display text-[11px] tracking-[0.3em] text-coral">
                  CASPER
                </div>
                <div className="font-display text-lg leading-tight text-cream md:text-xl">
                  Friendly tool for solo creators
                </div>
              </div>
            </div>

            {/* List */}
            <ul className="relative mt-5 space-y-3.5">
              {US.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-sm text-cream md:text-[15px]"
                >
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-coral text-cream shadow-[0_2px_10px_rgba(185,28,28,0.35)]">
                    <CheckIcon className="h-2.5 w-2.5" />
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>

        <p className="mt-10 text-center text-xs text-cream-dim md:text-sm">
          A friendly tool for one creator — not a cold dashboard built for a
          sales floor.
        </p>
      </div>
    </section>
  );
}
