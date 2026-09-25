import { MotionProvider, SmoothScroll } from "@/components/motion-primitives";
import { SiteNav } from "@/components/site-nav";
import { Hero } from "@/components/hero";
import { WatchItWork } from "@/components/watch-it-work";
import { BenefitCards } from "@/components/benefit-cards";
import { EngagementActions } from "@/components/engagement-actions";
import { FeatureCards } from "@/components/feature-cards";
import { Safety } from "@/components/safety";
import { Growth } from "@/components/growth";
import { Control } from "@/components/control";
import { HowItWorks } from "@/components/how-it-works";
import { Pricing } from "@/components/pricing";
import { FAQ } from "@/components/faq";
import { Closing } from "@/components/closing";
import { Footer } from "@/components/footer";

export default function Home() {
  return (
    <MotionProvider>
      <SmoothScroll />
      <SiteNav />
      <main className="flex w-full flex-col items-center">
        <Hero />
        <WatchItWork />
        <BenefitCards />
        <EngagementActions />
        <FeatureCards />
        <Safety />
        <Growth />
        <Control />
        <HowItWorks />
        <Pricing />
        <FAQ />
        <Closing />
      </main>
      <div className="flex w-full justify-center pb-[60px]">
        <Footer />
      </div>
    </MotionProvider>
  );
}
