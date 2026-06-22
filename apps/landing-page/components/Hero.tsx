"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import LogoLoop from "./LogoLoop";
import PixelCard from "./PixelCard";
import { FadeInStagger } from "./animations/FadeInStagger";
import { NumberTicker } from "./animations/NumberTicker";
import { GhostLogo } from "./GhostLogo";

const featureChip = (label: string, icon: React.ReactNode) => ({
  node: (
    <div className="flex items-center gap-2.5 text-xl font-bold uppercase tracking-tight text-muted-fg transition-colors hover:text-fg">
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-accent"
      >
        {icon}
      </svg>
      {label}
    </div>
  ),
});

const techLogos = [
  featureChip("AI Replies", <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />),
  featureChip(
    "Auto-Like",
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />,
  ),
  featureChip(
    "Auto-Follow",
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </>,
  ),
  featureChip(
    "Follow-Back",
    <>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </>,
  ),
  featureChip("Bookmark", <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />),
  featureChip(
    "Repost",
    <>
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </>,
  ),
  featureChip("Safe by Design", <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />),
];

export function Hero() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <section className="relative bg-bg text-fg font-sans selection:bg-primary selection:text-black overflow-hidden flex flex-col min-h-screen  p-0">

      {/* Container */}
      <div className="mx-auto w-full max-w-[1500px] flex flex-col flex-1 relative z-10 border-x border-border">

        {/* NAVBAR */}
        <header className="h-[80px] flex items-center justify-between px-6 md:px-10 relative border-b border-border">
          {/* Extended border */}
          <div className="absolute left-[-50vw] right-[-50vw] bottom-[-1px] h-[1px] bg-border z-[-1]" />

          <div className="flex items-center z-50 text-[26px] font-bold lowercase tracking-tight text-fg">
            <GhostLogo className="h-12 w-12 mr-1" />
            <span>ghostly</span><span className="text-accent">247</span>
          </div>

          <nav className="hidden md:flex items-center gap-1 text-[11px] uppercase tracking-[0.18em] font-mono text-muted-fg">
            {[
              { label: "Features", href: "#features" },
              { label: "How It Works", href: "#how-it-works" },
              { label: "Testimonials", href: "#testimonials" },
              { label: "Pricing", href: "#pricing" },
            ].map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="group relative px-3 py-2 transition-colors duration-200 hover:text-fg"
              >
                {l.label}
                <span className="pointer-events-none absolute inset-x-3 bottom-1 h-px origin-left scale-x-0 bg-accent transition-transform duration-300 ease-out group-hover:scale-x-100" />
              </a>
            ))}
          </nav>

          <button className="hidden md:block border border-white/50 px-5 py-2 text-sm font-medium hover:bg-white hover:text-black transition-colors rounded-sm text-muted-fg">
            Get Started
          </button>

          {/* Hamburger Menu Button */}
          <button 
            className="md:hidden z-50 p-2 -mr-2 text-fg flex flex-col justify-center items-center gap-1.5"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            <span className={`block w-6 h-0.5 bg-fg transition-transform duration-300 ${isMobileMenuOpen ? 'translate-y-2 rotate-45' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-fg transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-0' : ''}`}></span>
            <span className={`block w-6 h-0.5 bg-fg transition-transform duration-300 ${isMobileMenuOpen ? '-translate-y-2 -rotate-45' : ''}`}></span>
          </button>

          {/* Crosshairs */}
          <Crosshair x="0" y="100%" />
          <Crosshair x="100%" y="100%" />
        </header>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="fixed inset-0 z-40 bg-bg/95 backdrop-blur-md flex flex-col items-center justify-center min-h-screen pt-20"
            >
              <nav className="flex flex-col items-center gap-8 text-lg uppercase tracking-[0.15em] font-mono text-fg w-full px-6">
                <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-accent transition-colors flex items-center justify-center gap-2 w-full py-4 border-b border-border/50">FEATURES</a>
                <a href="#how-it-works" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-accent transition-colors flex items-center justify-center gap-2 w-full py-4 border-b border-border/50">HOW IT WORKS</a>
                <a href="#testimonials" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-accent transition-colors flex items-center justify-center gap-2 w-full py-4 border-b border-border/50">TESTIMONIALS</a>
                <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-accent transition-colors flex items-center justify-center gap-2 w-full py-4 border-b border-border/50">PRICING</a>
                <button className="mt-8 border border-white/50 px-10 py-4 text-sm font-medium hover:bg-white hover:text-black transition-colors rounded-sm text-fg">
                  Get Started
                </button>
              </nav>
            </motion.div>
          )}
        </AnimatePresence>

        {/* MAIN HERO */}
        <div className="flex flex-col md:flex-row flex-1 relative border-b border-border">
          {/* Extended border */}
          <div className="absolute left-[-50vw] right-[-50vw] bottom-[-1px] h-[1px] bg-border z-[-1]" />

          {/* LEFT COLUMN */}
          <div className="w-full md:w-1/2 relative flex flex-col justify-center px-6 md:px-10 lg:px-17 py-16 md:py-24 bg-bg md:border-r md:border-border">
            {/* Diagonal Pattern Background for Left Column */}
            <div
              className="absolute inset-0 opacity-[0.25] pointer-events-none z-0"
              style={{
                backgroundImage: 'repeating-linear-gradient(-45deg, #444 0, #444 1px, transparent 1px, transparent 8px)'
              }}
            />

            <FadeInStagger y={30} stagger={0.15} className="relative z-10">
              <div className="inline-flex items-center text-[11px] tracking-wider font-mono text-fg/70 bg-white/5 backdrop-blur-sm border border-border px-3 py-1.5 mb-8 rounded-sm">
                Twitter / X on Autopilot <span className="text-fg ml-2 font-bold animate-pulse">_</span>
              </div>

              <h1 className="text-[40px] sm:text-[48px] lg:text-[64px] font-bold leading-[1.05] tracking-tight mb-6 text-fg">
                Automate your reach<br />&amp; presence on <span className="text-accent">X</span>
              </h1>

              <p className="text-muted-fg text-base sm:text-[17px] max-w-[480px] mb-10 leading-relaxed font-medium">
                Likes, replies, follows, reposts &amp; more — on autopilot, in your tone, so you grow your X presence <b className="font-semibold text-accent bg-accent/10 px-1.5 py-0.5 rounded-[3px]">while you sleep.</b> One install away.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <a href="#features" className="w-full sm:w-auto border border-white/50 hover:border-white text-muted-fg hover:text-fg px-7 py-3.5 text-sm font-medium transition-colors rounded-sm text-center">
                  View Features
                </a>
                <button className="w-full sm:w-auto bg-primary text-fg hover:bg-accent px-7 py-3.5 text-sm font-semibold transition-colors rounded-sm text-center">
                  Get Started Free
                </button>
              </div>
            </FadeInStagger>
          </div>

          {/* RIGHT COLUMN */}
          <div className="w-full md:w-1/2 relative min-h-[450px] shrink-0  hidden sm:flex flex-col bg-bg">
            {/* Top status bar inside right column */}
            <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-10">
              <div className="text-fg/80 text-[10px] font-mono tracking-[0.15em] bg-card/80 px-2 py-1 rounded-sm border border-border">
                ALL SYSTEMS OPERATIONAL
              </div>

            </div>

            {/* Product demo video */}
            <div className="flex-1 w-full h-full min-h-[440px] p-3 md:p-5 lg:p-7">
              <PixelCard variant="pink" className="w-full h-full rounded-xl">
                <video
                  src="/Ghostly.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  aria-label="Ghostly247 product demo"
                  className="absolute inset-0 h-full w-full object-contain"
                />
              </PixelCard>
            </div>
          </div>

          {/* Crosshairs for Hero Bottom */}
          <Crosshair x="0" y="100%" />
          <Crosshair x="50%" y="100%" className="hidden md:flex" />
          <Crosshair x="100%" y="100%" />
        </div>

        {/* BOTTOM STATS & LOGOS ROW */}
        <div className="flex flex-col md:flex-row h-auto md:h-[120px] relative bg-bg">
          {/* LEFT LOGOS */}
          <div className="w-full md:w-1/2 flex items-center justify-between py-8 md:py-0 border-b border-border md:border-b-0 md:border-r md:border-border gap-6 relative overflow-hidden h-full min-h-[120px]">
            <div className="absolute inset-y-0 w-full flex items-center">
              <LogoLoop
                logos={techLogos}
                speed={60}
                direction="left"
                logoHeight={32}
                gap={48}
                hoverSpeed={0}
                fadeOut
                scaleOnHover={false}
              />
            </div>
          </div>

          <div className="w-full md:w-1/2 flex items-center justify-between px-3 md:px-10 lg:px-16 py-6 text-center md:py-0">
            <div className="flex flex-col">
              <span className="text-[#666] font-mono text-[10px] tracking-[0.05em] mb-2 uppercase">Total Users</span>
              <div className="text-2xl lg:text-[40px] font-bold tracking-tight text-fg flex items-center justify-center">
                <NumberTicker value={1000} suffix="+" className="flex items-center" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[#666] font-mono text-[10px] tracking-[0.05em] mb-2 uppercase">Avg Rating</span>
              <div className="text-2xl lg:text-[40px]  font-bold tracking-tight text-fg flex items-center justify-center">
                <NumberTicker value={4.9} decimals={1} suffix="⭐" className="flex items-center" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-[#666] font-mono text-[10px] tracking-[0.05em] mb-2 uppercase">Engagements Driven</span>
              <div className="text-2xl lg:text-[40px]  font-bold tracking-tight text-fg flex items-center justify-center">
                <NumberTicker value={500} suffix="K+" className="flex items-center  font-black" />
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}

function Crosshair({ x, y, className = "" }: { x: string, y: string, className?: string }) {
  return (
    <div
      className={`absolute w-[9px] h-[9px] flex items-center justify-center pointer-events-none z-20 ${className}`}
      style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
    >
      <div className="absolute w-full h-[1px] bg-accent" />
      <div className="absolute h-full w-[1px] bg-accent" />
    </div>
  );
}
