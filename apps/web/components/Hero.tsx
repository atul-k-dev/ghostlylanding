import { Balloon } from "./Balloon";
import { Bat } from "./Bat";
import { BloodDrip } from "./BloodDrip";
import { GhostMascot } from "./GhostMascot";
import { SocialProof } from "./SocialProof";
import { Eyeball } from "./stickers/Eyeball";
import { TextSticker } from "./stickers/TextSticker";

export function Hero() {
  return (
    <section className="relative flex min-h-[100svh] flex-col overflow-hidden">
      {/* Decorative balloons */}
      <div
        className="pointer-events-none absolute left-[6%] top-[26%] hidden opacity-50 animate-drift lg:block"
        aria-hidden="true"
      >
        <Balloon className="h-20 w-auto" />
      </div>
      <div
        className="pointer-events-none absolute right-[7%] top-[30%] hidden opacity-40 animate-drift lg:block"
        style={{ animationDelay: "1.5s" }}
        aria-hidden="true"
      >
        <Balloon className="h-16 w-auto" />
      </div>

      {/* Bats flying near top corners */}
      <div
        className="pointer-events-none absolute left-[18%] top-[12%] hidden text-cream/40 animate-fly md:block"
        style={{ animationDelay: "0.4s" }}
      >
        <Bat className="h-11 w-auto" flap />
      </div>
      <div
        className="pointer-events-none absolute right-[20%] top-[18%] hidden text-cream/30 animate-fly md:block"
        style={{ animationDelay: "1.8s" }}
      >
        <Bat className="h-9 w-auto" flap />
      </div>

      {/* Subtle drips at edges */}
      <BloodDrip
        className="pointer-events-none absolute right-[3%] top-[8%] h-6 w-auto opacity-50"
        rotate={20}
      />
      <BloodDrip
        className="pointer-events-none absolute left-[3%] bottom-[18%] h-5 w-auto opacity-40"
        rotate={-160}
      />

      {/* Stickers */}
      <TextSticker
        text="AUTOPILOT"
        size="md"
        tilt={-12}
        className="absolute left-[6%] top-[26%] hidden lg:block"
      />
      <TextSticker
        text="BOO!"
        size="lg"
        tilt={8}
        className="absolute right-[8%] bottom-[22%] hidden lg:block"
      />
      <Eyeball
        className="pointer-events-none absolute right-[14%] top-[36%] hidden h-12 w-auto opacity-90 md:block"
        rotate={-12}
      />

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5 md:px-10">
        <a href="#" className="flex items-center gap-2.5">
          <GhostMascot className="h-8 w-8" />
          <span className="font-display text-base tracking-wider">CASPER</span>
        </a>
        <a
          href="#"
          className="text-sm text-cream/70 transition hover:text-cream"
        >
          Sign in
        </a>
      </nav>

      {/* Centered content */}
      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-6 pb-10 text-center">
        {/* Mascot with soft glow */}
        <div className="relative mb-5 animate-float">
          <div
            className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-40 blur-3xl"
            style={{
              background:
                "radial-gradient(circle, #b91c1c 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />
          <GhostMascot className="h-20 w-auto md:h-24" />
        </div>

        {/* Eyebrow pill */}
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-cream/70 md:text-[11px]">
          <span className="h-1.5 w-1.5 rounded-full bg-coral" />
          Browser extension · Twitter + LinkedIn
        </span>

        {/* Headline */}
        <h1 className="font-display text-4xl leading-[0.95] tracking-tight text-cream sm:text-5xl md:text-6xl lg:text-7xl xl:text-[96px]">
          Grow your socials
          <br />
          while you <span className="text-coral">sleep.</span>
        </h1>

        {/* Sub */}
        <p className="mx-auto mt-7 max-w-lg text-sm text-cream/70 md:mt-9 md:text-lg">
          The friendly little ghost that likes, comments, and follows in your
          tone — on autopilot, in your browser.
        </p>

        {/* CTAs */}
        <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row">
          <a
            href="#"
            className="rounded-full bg-coral px-7 py-3 text-sm font-semibold text-cream shadow-[0_8px_30px_rgba(185,28,28,0.4)] transition hover:bg-coral-dim"
          >
            Get started free
          </a>
          <a
            href="#features"
            className="text-sm text-cream/70 transition hover:text-cream"
          >
            See how it works →
          </a>
        </div>

        {/* Social proof */}
        <div className="mt-8">
          <SocialProof />
        </div>
      </div>
    </section>
  );
}
