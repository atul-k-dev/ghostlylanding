import { Bat } from "./Bat";
import { BloodEdge } from "./BloodEdge";
import { BloodSplatter } from "./BloodSplatter";
import { GhostHeartEyes } from "./GhostHeartEyes";
import { GhostSleeping } from "./GhostSleeping";
import { GhostWaving } from "./GhostWaving";
import { CuteSkull } from "./stickers/CuteSkull";
import { TextSticker } from "./stickers/TextSticker";

export function FinalCTA() {
  return (
    <section
      id="final-cta"
      className="relative overflow-hidden bg-grad-a py-32 md:py-40"
    >
      {/* Drip curtain at top — right 60% */}
      <BloodEdge
        className="absolute left-[40%] right-0 top-0 h-24 opacity-90 md:h-28"
        color="#B81336"
      />

      {/* Background splatter */}
      <BloodSplatter
        className="pointer-events-none absolute -left-32 top-1/3 h-[500px] w-[500px] opacity-[0.06]"
        rotate={-30}
      />
      <BloodSplatter
        className="pointer-events-none absolute -right-24 -bottom-32 h-[420px] w-[420px] opacity-[0.05]"
        rotate={60}
      />

      {/* Bats flying near the top */}
      <div
        className="pointer-events-none absolute left-[20%] top-[18%] text-cream/50 animate-fly"
        style={{ animationDelay: "0.3s" }}
      >
        <Bat className="h-12 w-auto" flap />
      </div>
      <div
        className="pointer-events-none absolute right-[24%] top-[14%] text-cream/40 animate-fly"
        style={{ animationDelay: "1.6s" }}
      >
        <Bat className="h-11 w-auto" flap />
      </div>

      {/* Stickers */}
      <CuteSkull
        className="pointer-events-none absolute left-[5%] bottom-[14%] hidden h-24 w-auto opacity-85 lg:block"
        rotate={-12}
      />
      <TextSticker
        text="SLEEP TIGHT"
        size="md"
        tilt={-8}
        className="absolute left-[8%] top-[28%] hidden lg:block"
      />
      <TextSticker
        text="GO REST"
        size="lg"
        tilt={11}
        className="absolute right-[5%] bottom-[28%] hidden lg:block"
      />

      {/* Decorative floating ghosts */}
      <div
        className="pointer-events-none absolute left-[14%] top-[22%] hidden opacity-30 animate-float md:block"
        style={{ animationDelay: "0.5s" }}
      >
        <GhostWaving className="h-12 w-auto" />
      </div>
      <div
        className="pointer-events-none absolute right-[18%] top-[40%] hidden opacity-25 animate-float md:block"
        style={{ animationDelay: "2s" }}
      >
        <GhostHeartEyes className="h-11 w-auto" />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 pt-12 text-center md:px-10 md:pt-16">
        {/* Sleeping ghost — visual reinforcement of "while you sleep" */}
        <div className="mb-8 flex justify-center">
          <div className="relative animate-float">
            <div
              className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-30 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, #B81336 0%, transparent 70%)",
              }}
              aria-hidden="true"
            />
            <GhostSleeping className="h-32 w-auto md:h-40" />
          </div>
        </div>

        <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-cream/70 md:text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" />
          One last thing
        </span>

        <h2 className="font-sans font-black text-4xl leading-[0.95] tracking-tight text-cream sm:text-5xl md:text-6xl">
          Get your <span className="text-coral">nights</span> back.
        </h2>

        <p className="mx-auto mt-6 max-w-md text-sm text-cream/75 md:text-base">
          Casper handles your likes, comments, and follows on your schedule.
          You get the followers — and your sleep back.
        </p>

        <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href="#"
            className="rounded-full bg-coral px-8 py-3.5 text-sm font-semibold text-cream shadow-[0_10px_40px_rgba(184,19,54,0.45)] transition hover:bg-coral-dim"
          >
            Get started free
          </a>
          <a
            href="#pricing"
            className="text-sm text-cream/70 transition hover:text-cream"
          >
            See pricing →
          </a>
        </div>

        <p className="mt-6 text-[11px] text-cream-dim">
          No card needed · Cancel any time · Browser-session only
        </p>
      </div>
    </section>
  );
}
