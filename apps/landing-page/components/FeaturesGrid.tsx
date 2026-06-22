import React from 'react';
import { FadeInStagger } from "./animations/FadeInStagger";

export function FeaturesGrid() {
  return (
    <section id="features" className="relative overflow-hidden bg-bg py-16 md:py-24 px-3 md:px-10 lg:px-16">

      <div className="relative z-10 mx-auto max-w-[1400px] px-0 sm:px-6 md:px-10">

        {/* --- Section 1 --- */}
        <div className="grid grid-cols-1 w-full items-center sm:gap-16 md:grid-cols-2 md:gap-24 mb-7">
          {/* Text Content (Left) */}
          <div>
            <FadeInStagger y={30} stagger={0.15}>
              <span className="inline-flex items-center border border-border rounded bg-[#1e1e1e] px-2 py-1 font-geist text-[11px] font-semibold  tracking-widest text-fg">
                Core Capabilities
              </span>
              <h2 className="mt-4 sm:mt-6 font-aeonik font-semibold text-[28px] leading-[1.15] text-fg sm:text-4xl md:text-[44px]">
                All Your Engagement, <br />
                Automated <span className="text-iron-slate">Effortlessly</span>
              </h2>
            </FadeInStagger>

            <FadeInStagger y={50} stagger={0.1} className="mt-8 sm:mt-12 grid grid-cols-1 gap-2  sm:grid-cols-2">
              {/* Feature 1 */}
              <div className='bg-card hover:border-white/40 border transition border-b-3 border-r-3 border-white/0 p-4 rounded-lg'>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-green/10 text-emerald-green">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" /></svg>
                </div>
                <h4 className="mb-2 font-inter text-lg font-medium text-fg">All-in-One Engagement</h4>
                <p className="font-inter text-sm leading-relaxed text-halo-pale/70">
                  Like, reply, follow, bookmark, repost &amp; quote — automatically, in one tab.
                </p>
              </div>

              {/* Feature 2 */}
              <div className='bg-card hover:border-white/40 border transition border-b-3 border-r-3 border-white/0 p-4 rounded-lg'>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-spectrum-flare/10 text-spectrum-flare">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" /></svg>
                </div>
                <h4 className="mb-2 font-inter text-lg font-medium text-fg">Smart Targeting</h4>
                <p className="font-inter text-sm leading-relaxed text-halo-pale/70">
                  Engage by keyword, target the creators you pick, and auto follow-back your followers.
                </p>
              </div>

              {/* Feature 3 */}
              <div className='bg-card hover:border-white/40 border transition border-b-3 border-r-3 border-white/0 p-4 rounded-lg'>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-vivid-crimson/10 text-vivid-crimson">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </div>
                <h4 className="mb-2 font-inter text-lg font-medium text-fg">AI Replies</h4>
                <p className="font-inter text-sm leading-relaxed text-halo-pale/70">
                  Context-aware replies drafted in your tone — friendly, professional, or witty.
                </p>
              </div>

              {/* Feature 4 */}
              <div className='bg-card hover:border-white/40 border transition border-b-3 border-r-3 border-white/0 p-4 rounded-lg'>
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-goldenrod/10 text-goldenrod">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <h4 className="mb-2 font-inter text-lg font-medium text-fg">Safety Engine</h4>
                <p className="font-inter text-sm leading-relaxed text-halo-pale/70">
                  Random delays, age-aware caps &amp; auto-pause — all in your own browser.
                </p>
              </div>
            </FadeInStagger>
          </div>

          {/* Image/Art (Right) */}
          <div className="flex justify-center md:justify-end mt-6 md:mt-15">
            {/* Relative wrapper to bound the floating card properly */}
            <div className="relative w-full max-w-lg">
              {/* Main App Window */}
              <div className="w-full rounded-xl bg-card/60 h-[380px] sm:h-[550px] border-border/50 overflow-hidden">

                {/* the img will go here */}
                <img src="/f1.png" alt="img"  className='w-full h-full object-cover'/>
              </div>

            </div>
          </div>
        </div>

        {/* --- Section 2 --- */}
        <div className="hidden grid grid-cols-1 items-center mt-16 md:mt-24">

          <div className='w-full overflow-hidden lg:px-9 bg-card rounded-xl p-9   flex flex-col md:flex-row items-center gap-7 md:gap-16'>

            {/* Text Content */}
            <div className="flex-1 space-y-4">

              <h3 className="font-aeonik text-4xl font-bold text-fg leading-tight">
                Zero bans is the goal. <span className="text-vivid-crimson">Always.</span>
              </h3>
              <p className="font-inter text-[17px] leading-relaxed text-halo-pale max-w-xl">
                If a feature ever conflicts with platform safety, we cut the feature. The tool is here to grow your account — not put it at risk.
              </p>
              <button className="rounded-full bg-white/0 border-2 px-6 py-3 font-inter text-sm mt-4 font-semibold text-fg/80 border-white/70 transition hover:bg-subtle-gray hover:text-black hover:scale-[1.02] active:scale-[0.98]">
                View Security Measures
              </button>
            </div>

            {/* Visual/Image Element */}
            <div className="flex-1 w-full flex justify-center md:justify-end">
              <div className="relative w-full max-w-[320px] rounded-full flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-dashed border-vivid-crimson/20 animate-[spin_20s_linear_infinite]" />
                <div className="absolute inset-4 rounded-full border border-vivid-crimson/10 animate-[spin_15s_linear_infinite_reverse]" />
                <div className="bg-card border border-border rounded-lg p-6  z-10 w-full relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-20">
                    <svg className="h-12 w-12 text-vivid-crimson" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  </div>
                  <div className="flex items-center gap-4 mb-5 relative z-10">
                    <div className="h-12 w-12 rounded-xl bg-emerald-green/10 flex items-center justify-center">
                      <svg className="h-6 w-6 text-emerald-green" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <div>
                      <div className="font-inter text-sm font-semibold text-fg">Platform Safety</div>
                      <div className="font-inter text-xs text-emerald-green mt-0.5 flex items-center gap-1">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-green opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-green"></span>
                        </span>
                        Protected
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3 relative z-10">
                    <div className="flex items-center justify-between text-xs font-inter text-iron-slate">
                      <span>Rate Limits</span>
                      <span className="text-fg">Optimized</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full w-[85%] bg-emerald-green rounded-full" />
                    </div>
                    <div className="flex items-center justify-between text-xs font-inter text-iron-slate mt-2">
                      <span>Action Delays</span>
                      <span className="text-fg">Human-like</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full w-[100%] bg-emerald-green rounded-full" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
