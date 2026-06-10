"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeroVisual } from "./HeroVisual";
import LogoLoop from "./LogoLoop";
import PixelCard from "./PixelCard";
import { FadeInStagger } from "./animations/FadeInStagger";
import { NumberTicker } from "./animations/NumberTicker";
import { GhostLogo } from "./GhostLogo";

const techLogos = [
  { node: <div className="text-muted-fg font-bold  text-xl flex items-center gap-2 hover:text-fg transition-colors uppercase"><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M23.643 4.937c-.835.37-1.732.62-2.675.733.962-.576 1.7-1.49 2.048-2.578-.9.534-1.897.922-2.958 1.13-.85-.904-2.06-1.47-3.4-1.47-2.572 0-4.658 2.086-4.658 4.66 0 .364.042.718.12 1.06-3.873-.195-7.304-2.05-9.602-4.868-.4.69-.63 1.49-.63 2.342 0 1.616.823 3.043 2.072 3.878-.764-.025-1.482-.234-2.11-.583v.06c0 2.257 1.605 4.14 3.737 4.568-.392.106-.803.162-1.227.162-.3 0-.593-.028-.877-.082.593 1.85 2.313 3.198 4.352 3.234-1.595 1.25-3.604 1.995-5.786 1.995-.376 0-.747-.022-1.112-.065 2.062 1.323 4.51 2.093 7.14 2.093 8.57 0 13.255-7.098 13.255-13.254 0-.2-.005-.402-.014-.602.91-.658 1.7-1.477 2.323-2.41z" /></svg>TWITTER</div> },
  { node: <div className="text-muted-fg font-bold  text-xl flex items-center gap-2 hover:text-fg transition-colors uppercase"><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" /></svg>YOUTUBE</div> },
  { node: <div className="text-muted-fg font-bold  text-xl flex items-center gap-2 hover:text-fg transition-colors uppercase"><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" /></svg>INSTAGRAM</div> },
  { node: <div className="text-muted-fg font-bold  text-xl flex items-center gap-2 hover:text-fg transition-colors uppercase"><svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>LINKEDIN</div> },
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

          <div className="text-2xl font-medium tracking-tight text-fg flex items-center z-50">
            <GhostLogo className="h-12 w-12 text-2xl mr-3" />
            <span>Casper</span><span className='text-accent font-bold text-3xl'>AI</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-[11px] uppercase tracking-[0.15em] font-mono text-muted-fg">
            <a href="#features" className="hover:text-fg transition-colors flex items-center gap-2"><span className="text-[#444]">/</span> FEATURES</a>
            <a href="#how-it-works" className="hover:text-fg transition-colors flex items-center gap-2"><span className="text-[#444]">/</span> HOW IT WORKS</a>
            <a href="#testimonials" className="hover:text-fg transition-colors flex items-center gap-2"><span className="text-[#444]">/</span> TESTIMONIALS</a>
            <a href="#pricing" className="hover:text-fg transition-colors flex items-center gap-2"><span className="text-[#444]">/</span> PRICING</a>
          </nav>

          <button className="hidden md:block border border-white/50 px-5 py-2 text-sm font-medium hover:bg-white hover:text-black transition-colors rounded-sm text-muted-fg">
            Get Now
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
                  Get Now
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
                Automated Social Growth <span className="text-fg ml-2 font-bold animate-pulse">_</span>
              </div>

              <h1 className="text-[40px] sm:text-[48px] lg:text-[64px] font-bold leading-[1.05] tracking-tight mb-6 text-fg">
                Your Autonomous<br />Engagement Copilot
              </h1>

              <p className="text-muted-fg text-base sm:text-[17px] max-w-[480px] mb-10 leading-relaxed font-medium">
                AI-powered interactions on autopilot. Build genuine relationships, grow your audience, and scale your personal brand — <b className='text-white'>while you sleep.</b> 
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <a href="#features" className="w-full sm:w-auto border border-white/50 hover:border-white text-muted-fg hover:text-fg px-7 py-3.5 text-sm font-medium transition-colors rounded-sm text-center">
                  View Features
                </a>
                <button className="w-full sm:w-auto bg-primary text-fg hover:bg-accent px-7 py-3.5 text-sm font-semibold transition-colors rounded-sm text-center">
                  Start Free Trial
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

            {/* 3D Visual */}
            <div className="flex-1 w-full h-full min-h-[400px]">
              <PixelCard variant="pink" className="w-full h-full">
                <HeroVisual />
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
                <NumberTicker value={11000} suffix="+" className="flex items-center" />
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
                <NumberTicker value={2.1} decimals={1} suffix="M" className="flex items-center  font-black" />
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
