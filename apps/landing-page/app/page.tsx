import { FAQ } from "@/components/FAQ";
import { Testimonials } from "@/components/Testimonials";
import { FeaturesGrid } from "@/components/FeaturesGrid";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { FeaturesSticky } from "@/components/FeaturesSticky";
import { Compare } from "@/components/Compare";
import { Pricing } from "@/components/Pricing";
import { CTA } from "@/components/CTA";
import { Crosshair } from "@/components/Crosshair";
import React from "react";

function SectionWrapper({ children, hideTopBorder }: { children: React.ReactNode, hideTopBorder?: boolean }) {
  return (
    <div className={`relative w-full ${hideTopBorder ? '' : 'border-t border-border'}`}>
      {!hideTopBorder && (
        <>
          <div className="absolute left-[-50vw] right-[-50vw] top-[-1px] h-[1px] bg-border z-[-1]" />
          <Crosshair x="0" y="0" />
          <Crosshair x="100%" y="0" />
        </>
      )}
      {children}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="relative z-10 min-h-screen overflow-clip bg-bg">
      <Hero />
      
      {/* Global wrapper for remaining sections to maintain the 1500px width and side borders */}
      <div className="mx-auto w-full max-w-[1500px] flex flex-col relative z-10 border-x border-border bg-bg">
        <SectionWrapper>
          <FeaturesGrid />
        </SectionWrapper>
        <SectionWrapper>
          <HowItWorks />
        </SectionWrapper>
        <SectionWrapper>
          <FeaturesSticky />
        </SectionWrapper>
        <SectionWrapper>
          <Compare />
        </SectionWrapper>
        <SectionWrapper>
          <Testimonials />
        </SectionWrapper>
        <SectionWrapper>
          <Pricing />
        </SectionWrapper>
        <SectionWrapper>
          <FAQ />
        </SectionWrapper>
        <SectionWrapper>
          <CTA />
        </SectionWrapper>
        <SectionWrapper>
          <Footer />
        </SectionWrapper>
        
        {/* Bottom border for the entire page */}
        <div className="relative border-t border-border w-full">
          <div className="absolute left-[-50vw] right-[-50vw] top-[-1px] h-[1px] bg-border z-[-1]" />
          <Crosshair x="0" y="0" />
          <Crosshair x="100%" y="0" />
        </div>
      </div>
    </main>
  );
}
