import { GhostMascot } from "./GhostMascot";
import { INSTALL_URL } from "@/lib/install";

export function FinalCTA() {
  return (
    <section
      id="final-cta"
      className="relative overflow-hidden bg-deep-space py-16 md:py-24 px-6 md:px-10 lg:px-16"
    >
      {/* Structural faint grid pattern */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20" 
        style={{ backgroundImage: "linear-gradient(rgba(255, 255, 255, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255, 255, 255, 0.5) 1px, transparent 1px)", backgroundSize: "64px 64px" }}
      />
      
      {/* Central fade to put focus on the content */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#000000_80%)] pointer-events-none" />

      <div className="relative z-10 mx-auto max-w-4xl px-6 pt-12 text-center md:px-10 md:pt-16">
        {/* Abstract ghost visual */}
        <div className="mb-12 flex justify-center">
          <div className="relative">
            <div
              className="pointer-events-none absolute inset-0 -z-10 rounded-full opacity-10 blur-3xl"
              style={{
                background:
                  "radial-gradient(circle, #ffffff 0%, transparent 70%)",
              }}
              aria-hidden="true"
            />
            <GhostMascot className="h-28 w-auto invert brightness-0 md:h-36" />
          </div>
        </div>

        <span className="mb-5 inline-flex items-center gap-2 rounded-sm border border-iron-slate/20 bg-shadow-tint px-3 py-1 font-geist text-[11px] uppercase tracking-widest text-iron-slate">
          <span className="h-1.5 w-1.5 rounded-full bg-ghost-white" />
          One last thing
        </span>

        <h2 className="font-aeonik font-light text-5xl leading-[1] tracking-[-0.02em] text-fg sm:text-6xl md:text-7xl">
          Get your <span className="text-iron-slate">nights</span> back.
        </h2>

        <p className="mx-auto mt-8 max-w-md font-inter text-lg text-halo-pale">
          Casper handles your likes, comments, and follows on your schedule.
          You get the followers — and your sleep back.
        </p>

        <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href={INSTALL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-sm bg-ghost-white px-8 py-4 font-geist text-[12px] font-semibold uppercase tracking-widest text-deep-space transition hover:bg-white/90"
          >
            Add to Chrome — free
          </a>
          <a
            href="#pricing"
            className="rounded-sm border border-iron-slate/30 bg-transparent px-8 py-4 font-geist text-[12px] font-semibold uppercase tracking-widest text-fg transition hover:border-ghost-white"
          >
            See pricing →
          </a>
        </div>

        <p className="mt-8 font-geist text-[10px] uppercase tracking-wider text-iron-slate">
          30 free actions · Upgrade inside the extension · Browser-session only
        </p>
      </div>
    </section>
  );
}
