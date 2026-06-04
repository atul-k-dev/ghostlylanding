import React from 'react';
import Image from 'next/image';
import { FadeIn, FadeInStagger } from "./animations/FadeInStagger";

const CheckIcon = () => (
  <svg className="h-4 w-4 flex-shrink-0 text-green-400/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const CrossIcon = () => (
  <svg className="h-4 w-4 flex-shrink-0 text-[#ff577a]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const WarnIcon = () => (
  <svg className="h-4 w-4 flex-shrink-0 text-amber-500/60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  </svg>
);

const Icon = ({ type }: { type: 'check' | 'cross' | 'warn' }) => {
  if (type === 'check') return <CheckIcon />;
  if (type === 'cross') return <CrossIcon />;
  return <WarnIcon />;
};

export function Compare() {
  const rows = [
    {
      title: "Built For",
      casper: { text: "Friendly tool for solo creators", icon: "check" as const },
      other: { text: "Cold sales-team feel", icon: "cross" as const },
      inhouse: { text: "Made for big sales teams", icon: "warn" as const }
    },
    {
      title: "Platforms",
      casper: { text: "Twitter and LinkedIn from day one", icon: "check" as const },
      other: { text: "Works only on LinkedIn", icon: "cross" as const },
      inhouse: { text: "Manual posting across platforms", icon: "warn" as const }
    },
    {
      title: "How It Runs",
      casper: { text: "Inside your own browser — never the cloud", icon: "check" as const },
      other: { text: "Runs from cloud servers logged into your account", icon: "cross" as const },
      inhouse: { text: "You do everything yourself", icon: "warn" as const }
    },
    {
      title: "Comments",
      casper: { text: "Writes in your tone, post by post", icon: "check" as const },
      other: { text: "Sends generic, copy-paste comments", icon: "cross" as const },
      inhouse: { text: "Your voice, but hours of work", icon: "warn" as const }
    },
    {
      title: "Experience",
      casper: { text: "A friendly ghost in your toolbar", icon: "check" as const },
      other: { text: "Looks like heavy enterprise software", icon: "cross" as const },
      inhouse: { text: "Scattered tabs and spreadsheets", icon: "warn" as const }
    },
    {
      title: "Pacing",
      casper: { text: "Grow on your own schedule", icon: "check" as const },
      other: { text: "Pushes you to send more, faster", icon: "cross" as const },
      inhouse: { text: "Limited by your free time", icon: "warn" as const }
    }
  ];

  return (
    <section id="comparison" className="relative w-full bg-bg text-fg overflow-hidden py-16 md:py-24 px-3 md:px-10 lg:px-16">
      {/* Background Image & Blending */}
      <div className="absolute inset-0 z-0">
        <Image 
          src="/comparebg.jpeg" 
          alt="Mountains Background" 
          fill 
          className="object-cover mix-blend-luminosity" 
          priority
        />
        {/* Gradients to blend smoothly into the section above and below */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#050505] via-[#050505]/80 to-[#050505]" />
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-0 sm:px-6 md:px-10">
        
        {/* Header Section */}
        <FadeInStagger y={30} stagger={0.15} className="mx-auto max-w-3xl text-center flex flex-col items-center mb-16">
          <div className="inline-flex items-center rounded-sm bg-card border border-border px-2 py-0.5 font-geist text-[10px] font-bold uppercase tracking-widest text-fg/60 mb-6 shadow-sm">
            WHY CASPER
          </div>
          <h2 className="font-aeonik text-[28px] sm:text-4xl md:text-[44px] font-medium tracking-tight mb-3 leading-tight text-fg">
            Built for one creator. <br className="hidden md:block" />Not a sales floor.
          </h2>
        </FadeInStagger>

        {/* Comparison Table */}
        <FadeIn y={40} className="w-full overflow-x-auto  sm:px-4 sm:mx-0 sm:px-0">
        <div className="min-w-[600px] sm:min-w-0 w-full rounded border border-white/50 bg-black/40 backdrop-blur-md flex flex-col font-inter text-[13px] sm:text-[14px]">
          
          {/* Table Header */}
          <div className="grid grid-cols-4 border-b border-white/50">
            <div className="p-4 sm:p-6"></div>
            
            {/* Highlighted Casper Column Header */}
            <div className="p-4 sm:p-6 bg-white/[0.04] border-x border-white/50 flex items-center gap-3">
              {/* Fake Logo for Casper */}
              <div className="w-6 h-6 border border-white/30 rounded flex items-center justify-center bg-white/5">
                <svg className="w-4 h-4 text-fg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <path d="M3 9h18M9 21V9"/>
                </svg>
              </div>
              <span className="font-aeonik text-[20px] font-medium text-fg tracking-wide">Casper</span>
            </div>
            
            <div className="p-4 sm:p-6 flex items-center text-fg/90 font-medium">Other Tools</div>
            <div className="p-4 sm:p-6 flex items-center text-fg/90 font-medium">DIY / Manual</div>
          </div>

          {/* Table Rows */}
          {rows.map((row, idx) => (
            <div key={idx} className={`grid grid-cols-4 ${idx !== rows.length - 1 ? 'border-b border-white/50' : ''}`}>
              
              <div className="p-4 sm:p-6 flex items-center text-fg/90 font-medium text-[12px] sm:text-[14px]">
                {row.title}
              </div>
              
              {/* Highlighted Casper Column Cell */}
              <div className="p-4 sm:p-6 bg-white/[0.04] border-x border-white/50 flex items-center gap-2 sm:gap-3 text-fg">
                <Icon type={row.casper.icon} />
                {row.casper.text}
              </div>
              
              <div className="p-4 sm:p-6 flex items-center gap-3 text-fg/60">
                <Icon type={row.other.icon} />
                {row.other.text}
              </div>
              
              <div className="p-4 sm:p-6 flex items-center gap-3 text-fg/60">
                <Icon type={row.inhouse.icon} />
                {row.inhouse.text}
              </div>
            </div>
          ))}
        </div>
        </FadeIn>

      </div>
    </section>
  );
}
