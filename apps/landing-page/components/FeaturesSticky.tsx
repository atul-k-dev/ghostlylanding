"use client";

import Image from "next/image";
import { useRef } from "react";
import { useScroll, useTransform, motion } from "framer-motion";
import { FadeInStagger } from "./animations/FadeInStagger";

const features = [
  {
    number: "01",
    category: "SMART AUTO-LIKE",
    title: "Like the right posts.\nSkip the noise.",
    description: "Target posts by hashtag, keyword, or specific creator. Casper only likes posts worth liking — and skips the spam.",
    bullets: [
      "Hashtag, keyword, and creator-list targeting",
      "Fresh-post filter — no resurfacing month-old content",
      "Junk-post skip and per-account dedupe",
      "Daily caps with random variance"
    ],
    stats: (
      <div className="flex gap-12">
        <div>
          <div className="text-4xl font-medium text-fg mb-2">1.2k</div>
          <div className="text-xs font-mono tracking-widest text-fg/50 uppercase">likes</div>
        </div>
      </div>
    ),
    visual: (
      <div className="w-full h-full relative bg-card">
        <Image src="/feature/1.png" alt="Smart Auto-Like" fill className="object-cover" />
      </div>
    )
  },
  {
    number: "02",
    category: "AI COMMENTS",
    title: "Comments that sound\nlike you.",
    description: "Casper reads the full post, drafts in your tone, and runs every line through a profanity + risk filter before it ever reaches your queue.",
    bullets: [
      "Tone presets — Designer, Founder, Coach, Writer",
      "Custom voice training on 10 of your past comments",
      "Length and structure controls per platform",
      "Approval queue or auto-post mode"
    ],
    stats: (
      <div className="flex flex-col gap-4 w-full">
        <div className="text-xs font-mono tracking-widest text-fg/50 uppercase">Drafted in your tone</div>
        <div className="bg-white/5 border border-border rounded-xl p-4 text-sm text-fg/80 italic relative">
          <span className="absolute -left-2 -top-2 text-2xl text-fg/20">"</span>
          Love the typographic balance — that asymmetric headline really sells the kerning choice. What grid did you land on?
          <span className="absolute -right-2 -bottom-4 text-2xl text-fg/20">"</span>
        </div>
        <div className="flex gap-3 text-xs font-mono text-fg/40 mt-1">
          <span className="bg-white/5 px-2 py-1 rounded">Designer</span>
          <span className="bg-white/5 px-2 py-1 rounded">Short</span>
          <span className="bg-white/5 px-2 py-1 rounded flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
            AI · tone matched
          </span>
        </div>
      </div>
    ),
    visual: (
      <div className="w-full h-full relative bg-card">
        <Image src="/feature/2.png" alt="AI Comments" fill className="object-cover" />
      </div>
    )
  },
  {
    number: "03",
    category: "SMART FOLLOW & CONNECT",
    title: "Reach the right\npeople.",
    description: "Follow the engagers of creators you admire. Send personalized LinkedIn connection notes. Stop chasing followers who'll never engage back.",
    bullets: [
      "Follow engagers of target creators",
      "Bio-keyword targeting on both platforms",
      "Personalized LinkedIn connection notes",
      "Auto-unfollow non-followers (with whitelist)"
    ],
    stats: (
      <div className="flex flex-col gap-3">
        <div className="text-xs font-mono tracking-widest text-fg/50 uppercase mb-2">Auto-Engagement</div>
        <div className="flex items-center gap-4">
          <div className="bg-white text-black px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Follow
          </div>
          <div className="bg-white/10 text-fg px-4 py-2 rounded-full text-sm font-medium border border-border">
            Follow
          </div>
          <div className="bg-white/5 text-fg/40 px-4 py-2 rounded-full text-sm font-medium border border-border line-through">
            Follow
          </div>
        </div>
      </div>
    ),
    visual: (
      <div className="w-full h-full relative bg-card">
        <Image src="/feature/3.png" alt="Smart Follow & Connect" fill className="object-cover" />
      </div>
    )
  },
  {
    number: "04",
    category: "SMART SCHEDULING",
    title: "Active hours,\nyour way.",
    description: "Casper engages on your schedule, in your time zone, with a burst right after you post — and a one-tap pause when life happens.",
    bullets: [
      "Time-zone aware activity windows",
      "Burst mode after you publish",
      "Random delays — never two actions in the same second",
      "One-tap kill switch in the popup"
    ],
    stats: (
      <div className="flex items-end gap-12">
        <div className="relative flex flex-col items-center justify-center w-24 h-24 border-2 border-green-500/30 rounded-full">
           <div className="absolute top-2 text-[10px] text-fg/50">12</div>
           <div className="absolute right-2 text-[10px] text-fg/50">3</div>
           <div className="absolute bottom-2 text-[10px] text-fg/50">6</div>
           <div className="absolute left-2 text-[10px] text-fg/50">9</div>
           <div className="w-1 h-8 bg-green-500 rounded-full absolute bottom-1/2 origin-bottom rotate-45 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>
           <div className="w-1 h-6 bg-white/60 rounded-full absolute bottom-1/2 origin-bottom -rotate-12"></div>
           <div className="w-2 h-2 bg-white rounded-full absolute"></div>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-mono tracking-widest text-green-500 uppercase">ACTIVE NOW</span>
          </div>
          <div className="text-fg/40 font-mono text-xs">z z z (paused)</div>
        </div>
      </div>
    ),
    visual: (
      <div className="w-full h-full relative bg-card">
        <Image src="/feature/4.png" alt="Smart Scheduling" fill className="object-cover" />
      </div>
    )
  },
  {
    number: "05",
    category: "SAFETY ENGINE",
    title: "Built like\na vault.",
    description: "Safety isn't a feature in Casper — it's the foundation. Random delays, age-aware caps, and auto-pause the moment a platform looks twice.",
    bullets: [
      "Browser-session execution — never headless",
      "Age-aware daily caps that scale conservatively",
      "Auto-pause for 3hrs on any platform anomaly",
      "Transparent action log on every like, comment, follow"
    ],
    stats: null,
    visual: (
      <div className="w-full h-full relative bg-card">
        <Image src="/feature/5.png" alt="Safety Engine" fill className="object-cover" />
      </div>
    )
  }
];

function FeatureCard({ feature, index, scrollYProgress, totalCards }: any) {
  const targetScale = 1 - (totalCards - 1 - index) * 0.05;
  const scale = useTransform(
    scrollYProgress,
    [index * (1 / totalCards), 1],
    [1, targetScale]
  );

  return (
    <div
      className={`${index === totalCards - 1 ? 'relative' : 'sticky'} w-full transition-all duration-500`}
      style={{
        top: index === totalCards - 1 ? undefined : `calc(10vh + ${index * 30}px)`,
        zIndex: index + 10,
      }}
    >
      <motion.div
        style={{ scale, transformOrigin: "top center" }}
        className="w-full bg-[#111111] border border-white/20 rounded-xl overflow-hidden flex flex-col md:flex-row  h-[600px] sm:h-[750px] md:h-[650px] lg:h-[700px] group "
      >
        {/* Left side - Visuals */}
        <div className="w-full md:w-[45%] lg:w-1/2 bg-card border-b md:border-b-0 md:border-r border-border relative overflow-hidden">
          {/* Subtle noise overlay */}
          <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noiseFilter%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noiseFilter)%22/%3E%3C/svg%3E")' }}></div>
          
          {feature.visual}
        </div>

        {/* Right side - Content */}
        <div className="w-full md:w-[55%] lg:w-1/2 p-5 md:p-12  flex flex-col justify-between relative bg-card overflow-hidden">
          
  
          <div className="relative z-10">
            {/* Top Category */}
            <div className="inline-flex items-center gap-3 text-[11px] font-mono tracking-widest text-fg/70 uppercase mb-4 px-2 py-1 rounded ">
              <span className="font-semibold text-fg">{feature.number}</span>
              <span className="w-1 h-1 rounded-full bg-white/30"></span>
              <span>{feature.category}</span>
            </div>

            {/* Title & Description */}
            <div className="mb-6">
              <h3 className="text-3xl md:text-5xl font-bold tracking-tight mb-3 whitespace-pre-line leading-tight bg-gradient-to-br from-white to-accent/40 bg-clip-text text-transparent">
                {feature.title}
              </h3>
              <p className="text-fg/60 text-[17px] leading-relaxed">
                {feature.description}
              </p>
            </div>

            {/* Bullet Points */}
            <ul className="space-y-4 mb-12">
              {feature.bullets.map((bullet: string, i: number) => (
                <li key={i} className="group flex items-start gap-4 text-fg/70 hover:text-fg transition-colors duration-300">
                  <div className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center shrink-0 mt-0.5 border border-white/10 group-hover:bg-white/15 group-hover:border-white/30 group-hover:scale-110 transition-all duration-300 shadow-sm shadow-black/20">
                    <svg className="w-3.5 h-3.5 text-fg/60 group-hover:text-white transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-[15px] pt-0.5 leading-snug">{bullet}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Stats / Bottom Info */}
          <div className="mt-auto border-t border-white/10 pt-8 relative z-10">
            {feature.stats}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export function FeaturesSticky() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return (
    <section className="bg-bg relative py-16 md:py-24 px-3 md:px-10 lg:px-16" id="features" ref={containerRef}>
      <div className="container mx-auto px-0">
        {/* Header */}
        <FadeInStagger y={30} stagger={0.15} className="text-center mb-23 relative z-10">
          <div className="inline-flex items-center justify-center mb-8">
            <span className="text-[10px]  uppercase text-fg border border-border rounded-sm px-2 py-1 bg-card ">
              Features
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-medium tracking-tight text-fg mb-8">
            Everything you need.<br />
            <span className="text-fg">None of the noise.</span>
          </h2>
        </FadeInStagger>

        {/* Sticky Cards Container */}
        <div className="relative w-full max-w-7xl mx-auto flex flex-col gap-7 lg:gap-24">
          {features.map((feature, index) => (
            <FeatureCard
              key={feature.number}
              feature={feature}
              index={index}
              scrollYProgress={scrollYProgress}
              totalCards={features.length}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
