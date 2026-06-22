"use client";

import React from 'react';
import Image from 'next/image';
import { FadeIn, FadeInStagger } from "./animations/FadeInStagger";
import { NumberTicker } from "./animations/NumberTicker";

const TESTIMONIALS = [
  {
    logo: "Solo Designer",
    quote: "I set up Ghostly247 before bed and woke up to 40+ genuine interactions on my timeline. People started replying back \u2014 they had no idea it wasn\u2019t me typing at midnight.",
    name: "Maya Collins",
    role: "FREELANCE BRAND DESIGNER",
    image: "/testimonials/maya_collins.jpg"
  },
  {
    logo: "Indie Founder",
    quote: "I was spending 2 hours a day replying on X just to stay visible. Ghostly247 does it overnight in my exact tone. My impressions tripled in the first week.",
    name: "James Okafor",
    role: "FOUNDER, SAAS STARTUP",
    image: "/testimonials/james_okafor.jpg"
  },
  {
    logo: "Coach",
    quote: "The tone matching is scary good. I picked the friendly preset and Ghostly247 nailed my voice \u2014 warm but direct. My audience engagement went up and nobody noticed the difference.",
    name: "Priya Sharma",
    role: "EXECUTIVE COACH & SPEAKER",
    image: "/testimonials/priya_sharma.jpg"
  },
  {
    logo: "Growth",
    quote: "Ghostly247 runs in my own browser \u2014 no cloud login, no API tokens, no risk. It feels like the only tool that actually respects how platforms work instead of trying to hack around them.",
    name: "Marcus Thorne",
    role: "GROWTH MARKETER",
    image: "/testimonials/marcus_thorne.jpg"
  },
  {
    logo: "Writer",
    quote: "I was mass-unfollowed by a bot tool before. Ghostly247 is the opposite \u2014 random delays, daily caps, auto-pause. It behaves like a real person because it runs like one.",
    name: "Elena Voss",
    role: "NEWSLETTER WRITER, 28K SUBS",
    image: "/testimonials/elena_voss.jpg"
  },
  {
    logo: "Agency",
    quote: "We run Ghostly247 for 3 client accounts. The action log keeps everyone in the loop, and setup took minutes — no prompt engineering, no dashboards to learn. Dead simple.",
    name: "David Chen",
    role: "SOCIAL MEDIA AGENCY OWNER",
    image: "/testimonials/david_chen.jpg"
  }
];

const STATS = [
  { value: 50, symbol: "+", label: "NIGHTLY ENGAGEMENTS" },
  { value: 3, symbol: "x", label: "IMPRESSION GROWTH" },
  { value: 14, symbol: "h", label: "SAVED PER WEEK" },
  { value: 0, symbol: "%", label: "ACCOUNTS FLAGGED" }
];

export function Testimonials() {
  return (
    <section id="testimonials" className="relative w-full bg-bg text-fg overflow-hidden py-16 md:py-24 px-0 md:px-10 lg:px-0">
      
      {/* Top Header Row (Constrained) */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-10 flex flex-col md:flex-row md:items-end justify-between mb-8 sm:mb-12 gap-6">
        <FadeInStagger y={30} stagger={0.15} className='w-full flex-col flex items-center justify-center text-center'>
          <div className="inline-flex items-center rounded-sm bg-card border border-border px-2 py-0.5 font-geist text-[10px] font-bold uppercase tracking-widest text-fg/60 mb-6 shadow-sm">
            TESTIMONIALS
          </div>
          <h2 className="font-aeonik text-[28px] sm:text-4xl md:text-[44px] font-medium tracking-tight leading-tight text-fg">
            Real people. Real growth. <br className="hidden md:block" />While they slept.
          </h2>
        </FadeInStagger>
      </div>

      {/* Carousel (Infinite smooth loop) */}
      <FadeIn y={50} className="w-full overflow-hidden relative">
        <div className="flex w-max animate-scroll-left hover:[animation-play-state:paused] pb-8">
          {[...TESTIMONIALS, ...TESTIMONIALS].map((t, idx) => (
            <div
              key={idx}
              className="shrink-0 w-[78vw] sm:w-[85vw] md:w-[700px] bg-[#161616] border border-border rounded-xl flex flex-col sm:flex-row overflow-hidden mx-2 sm:mx-3"
            >
              {/* Text Side */}
              <div className="p-4 sm:p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-4 sm:mb-8">
                    {/* Placeholder Logo Icon */}
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-fg" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                    </svg>
                    <span className="font-aeonik text-base sm:text-xl font-medium tracking-wide">{t.logo}</span>
                  </div>
                  <p className="font-inter text-sm sm:text-lg md:text-2xl leading-relaxed text-fg/90">
                    {t.quote}
                  </p>
                </div>

                <div className="mt-5 sm:mt-12 flex items-center gap-3">
                  <img
                    src={t.image}
                    alt={t.name}
                    className="w-9 h-9 sm:hidden rounded-full object-cover border border-border"
                  />
                  <div>
                    <div className="font-inter font-medium text-fg/90 text-xs sm:text-sm">{t.name}</div>
                    <div className="font-geist text-[9px] sm:text-[10px] uppercase tracking-widest text-fg/50 mt-0.5 sm:mt-1">
                      {t.role}
                    </div>
                  </div>
                </div>
              </div>

              {/* Image Side — hidden on mobile, shown as sidebar on sm+ */}
              <div className="hidden sm:block sm:w-[280px] md:w-[300px] p-2 shrink-0">
                <div className="relative w-full h-full rounded-lg overflow-hidden">
                  <img
                    src={t.image}
                    alt={t.name}
                    className="w-full h-full object-cover hover:grayscale-0 transition-all duration-500"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </FadeIn>

      {/* Bottom Stats Row (Constrained) */}
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 md:px-10">
        <FadeInStagger stagger={0.1} className="mt-9 border border-white/50 rounded flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-white/50 ">
          {STATS.map((stat, idx) => (
            <div key={idx} className="flex-1 p-6 sm:p-10 flex items-center justify-start gap-3">
              <div className="font-aeonik text-4xl sm:text-5xl md:text-6xl font-bold text-fg tracking-tight">
                <NumberTicker value={stat.value} />
              </div>
              <div className="flex flex-col justify-center">
                <div className="text-xl font-semibold text-fg leading-none">{stat.symbol}</div>
                <div className="text-[9px] uppercase tracking-[0.2em] text-fg/80 mt-2 font-bold whitespace-nowrap">
                  {stat.label}
                </div>
              </div>
            </div>
          ))}
        </FadeInStagger>
      </div>

    </section>
  );
}
