import Image from "next/image";
import { Balloon } from "./Balloon";
import { Bat } from "./Bat";
import { BloodDrip } from "./BloodDrip";
import { HeroVisual } from "./HeroVisual";
import { SocialProof } from "./SocialProof";
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
        tilt={-10}
        className="absolute left-[3%] bottom-[12%] hidden lg:block"
      />
      <TextSticker
        text="ZZZ..."
        size="lg"
        tilt={8}
        className="absolute right-[6%] bottom-[8%] hidden lg:block"
      />

      {/* Nav */}
      <nav className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-5 md:px-10">
        <a href="#" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Casper AI"
            width={44}
            height={44}
            className="h-11 w-11"
            priority
          />
          <span className="font-display text-xl tracking-wider">
            Casper AI
          </span>
        </a>
        <div className="flex items-center gap-2.5">
          <a
            href="#"
            className="rounded-full border border-cream/25 px-4 py-2 text-sm font-medium text-cream/85 transition hover:border-cream/60 hover:text-cream md:px-5"
          >
            Sign in
          </a>
          <a
            href="#"
            className="rounded-full bg-coral px-4 py-2 text-sm font-semibold text-cream shadow-[0_6px_24px_rgba(185,28,28,0.4)] transition hover:bg-coral-dim md:px-5"
          >
            Get started
          </a>
        </div>
      </nav>

      {/* Two-column content */}
      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 grid-cols-1 items-center gap-10 px-6 pb-10 md:px-10 lg:grid-cols-2 lg:gap-12">
        {/* Left — text */}
        <div className="text-center lg:text-left">
          {/* Eyebrow pill */}
          <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-cream/70 md:text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            Browser extension · Twitter + LinkedIn
          </span>

          {/* Headline */}
          <h1 className="font-display text-4xl leading-[1] tracking-tight text-cream sm:text-5xl md:text-6xl lg:text-[52px] xl:text-[64px]">
            Grow your socials
            <br />
            while you <span className="text-coral">sleep.</span>
          </h1>

          {/* Sub */}
          <p className="mx-auto mt-6 max-w-lg text-sm text-cream/70 md:text-base lg:mx-0 lg:text-lg">
            Casper likes, comments, and follows for you — automatically, in
            your tone, right inside your own browser.
          </p>

          {/* CTAs */}
          <div className="mt-7 flex flex-col items-center gap-3 sm:flex-row lg:items-start lg:justify-start">
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
          <div className="mt-8 flex justify-center lg:justify-start">
            <SocialProof />
          </div>
        </div>

        {/* Right — animated product demo */}
        <div className="order-first flex justify-center lg:order-none lg:justify-end">
          <HeroVisual />
        </div>
      </div>
    </section>
  );
}
