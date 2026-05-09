import { Bat } from "./Bat";
import { BloodDrip } from "./BloodDrip";
import { BloodSplatter } from "./BloodSplatter";
import { Eyeball } from "./stickers/Eyeball";
import { TextSticker } from "./stickers/TextSticker";

type Row = {
  label: string;
  them: string;
  us: string;
};

const ROWS: Row[] = [
  {
    label: "Built for",
    them: "Sales teams running 50+ accounts",
    us: "One creator with one (or two) accounts",
  },
  {
    label: "Platforms",
    them: "LinkedIn-only — Twitter is an afterthought",
    us: "Twitter + LinkedIn under one license, day one",
  },
  {
    label: "Where it runs",
    them: "Cloud servers logged into your account",
    us: "Your real browser session — no headless infra",
  },
  {
    label: "How comments feel",
    them: "Generic templated cadences",
    us: "Trained on your voice, drafted post-by-post",
  },
  {
    label: "How it looks",
    them: "Salesforce-grade dashboards",
    us: "A friendly little ghost in your toolbar",
  },
];

export function WhyCasper() {
  return (
    <section
      id="why-casper"
      className="relative overflow-hidden bg-ink-soft py-24 md:py-32"
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
        className="absolute left-[4%] top-[34%] hidden lg:block"
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

      <div className="relative z-10 mx-auto max-w-5xl px-6 md:px-10">
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
            Most automation tools in this space were built to staff cold-outbound
            teams. Casper is the opposite of that — by design.
          </p>
        </div>

        {/* Comparison table */}
        <div className="mt-14 overflow-hidden rounded-3xl border border-cream/10 bg-ink/60 md:mt-20">
          {/* Column headers */}
          <div className="grid grid-cols-3 border-b border-cream/10 px-5 py-4 text-[10px] font-medium uppercase tracking-[0.25em] text-cream/50 md:px-8 md:text-xs">
            <div></div>
            <div className="text-center">Sales-team tools</div>
            <div className="text-center text-coral">Casper</div>
          </div>

          {ROWS.map((row, idx) => (
            <div
              key={row.label}
              className={`grid grid-cols-3 items-center gap-3 px-5 py-5 md:gap-6 md:px-8 md:py-6 ${
                idx !== ROWS.length - 1 ? "border-b border-cream/5" : ""
              }`}
            >
              <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-cream-dim md:text-xs">
                {row.label}
              </div>

              <div className="flex items-start gap-2 text-xs text-cream/55 md:text-sm">
                <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border border-cream/20">
                  <svg
                    viewBox="0 0 12 12"
                    className="h-2 w-2"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 3 L9 9 M9 3 L3 9"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
                <span>{row.them}</span>
              </div>

              <div className="flex items-start gap-2 text-xs text-cream md:text-sm">
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
                <span>{row.us}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-10 text-center text-xs text-cream-dim md:text-sm">
          Cute branding isn&apos;t a gimmick. It&apos;s a moat. The cold tools
          can&apos;t become friendly without rewriting their whole product.
        </p>
      </div>
    </section>
  );
}
