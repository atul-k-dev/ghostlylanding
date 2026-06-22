import React from "react";
import { FadeInStagger } from "./animations/FadeInStagger";
import { RevealText } from "./animations/RevealText";

export function CTA() {
  return (
    <section className="relative w-full bg-bg h-[70vh] font-sans overflow-hidden py-16 md:py-24 px-6 md:px-10 lg:px-16">
      {/* Background Image with top and bottom fade */}
      <div className="absolute inset-0 z-0">
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-[0.55]"
          style={{ backgroundImage: "url('/comparebg.jpeg')" }}
        />
        {/* Top Fade */}
        <div className="absolute top-0 left-0 right-0 h-32 sm:h-112 bg-gradient-to-b from-[#050505] via-[#050505]/70 to-transparent z-10" />
        {/* Bottom Fade */}
        <div className="absolute bottom-0 left-0 right-0 h-32 sm:h-92 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent z-10" />
      </div>

      <FadeInStagger y={30} stagger={0.15} className="relative z-20 mx-auto max-w-4xl h-full justify-center sm:px-4 text-center flex flex-col items-center">
        {/* Tagline */}
        <div className="mb-6 inline-flex rounded-sm border border-white/20 bg-card/50  px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-fg">
          LET'S GET STARTED
        </div>

        {/* Title */}
        <h2 className="mb-6 text-[36px] sm:text-[44px] md:text-[56px] font-medium leading-[1.05] tracking-tight text-fg">
          <RevealText text="Ready to Automate" as="span" />
          <RevealText text="Your Engagement?" as="span" />
        </h2>

        {/* Subtitle */}
        <p className="mb-10 max-w-[500px] text-[15px] sm:text-[17px] leading-[1.5] text-muted-fg">
          Connect your X account today. We.ll grow your reach on autopilot, completely in your own tone.
        </p>

        {/* CTA Button */}
        <a
          href="#"
          className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 sm:px-9 sm:py-4 text-[14.5px] sm:text-[15px] font-semibold text-black transition-all hover:bg-gray-200"
        >
          Get Started for Free
        </a>
      </FadeInStagger>
    </section>
  );
}
