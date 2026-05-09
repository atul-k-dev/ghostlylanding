import { FAQ } from "@/components/FAQ";
import { Features } from "@/components/Features";
import { FinalCTA } from "@/components/FinalCTA";
import { Footer } from "@/components/Footer";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { Pricing } from "@/components/Pricing";
import { Safety } from "@/components/Safety";
import { Testimonials } from "@/components/Testimonials";
import { WhyCasper } from "@/components/WhyCasper";

export default function HomePage() {
  return (
    <>
      <main className="relative z-10 min-h-screen overflow-hidden">
        <Hero />
        <HowItWorks />
        <Features />
        <WhyCasper />
        <Safety />
        <Testimonials />
        <Pricing />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
