import React from 'react';

const LOGOS = [
  {
    name: 'Twitter',
    svg: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    )
  },
  {
    name: 'LinkedIn',
    svg: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    )
  },
  {
    name: 'Instagram',
    svg: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
        <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
        <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
      </svg>
    )
  },
  {
    name: 'Reddit',
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 0 1-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 0 1 .042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 0 1 4.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 0 1 .14-.197.35.35 0 0 1 .238-.042l2.906.617a1.214 1.214 0 0 1 1.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.562-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.688-.561-1.249-1.249-1.249zm-5.466 3.99a.327.327 0 0 0-.231.094.33.33 0 0 0 0 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 0 0 .029-.463.33.33 0 0 0-.464 0c-.547.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 0 0-.232-.095z" />
      </svg>
    )
  },
  {
    name: 'YouTube',
    svg: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
      </svg>
    )
  },
  {
    name: 'TikTok',
    svg: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93v7.02c-.01 1.64-.61 3.25-1.72 4.41-1.11 1.16-2.73 1.83-4.37 1.83-1.65 0-3.26-.67-4.38-1.83-1.11-1.16-1.71-2.77-1.72-4.41.01-1.64.61-3.25 1.72-4.41 1.12-1.16 2.73-1.83 4.38-1.83.66 0 1.32.1 1.95.29v4.11c-.6-.17-1.23-.19-1.84-.04-.6.15-1.16.48-1.58.94-.42.46-.66 1.07-.66 1.7 0 .63.24 1.24.66 1.7.42.46.98.79 1.58.94.61.15 1.24.13 1.84-.04.6-.16 1.15-.49 1.57-.95.42-.45.67-1.07.68-1.7v-14.4z" />
      </svg>
    )
  }
];

export function BackedBy() {
  const logoElements = LOGOS.map((logo, idx) => (
    <div key={idx} className="flex items-center gap-2 text-fg/80 hover:text-fg transition-colors cursor-pointer">
      {logo.svg}
      <span className="text-base sm:text-xl font-bold tracking-tight">{logo.name}</span>
    </div>
  ));

  return (
    <div className="relative z-10 w-full pb-16 sm:pb-24 pt-5">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex justify-center items-center gap-3 mb-10">
          <div className="w-3 h-3 rounded-full bg-white/50"></div>
          <h2 className="text-center text-xl sm:text-3xl font-medium tracking-wide text-fg/90">
            Backed by the best
          </h2>
          <div className="w-3 h-3 rounded-full bg-white/50"></div>
        </div>

        <div className="relative flex overflow-hidden">
          <style>{`
            @keyframes marquee {
              0% { transform: translateX(0%); }
              100% { transform: translateX(-100%); }
            }
            .animate-marquee {
              animation: marquee 35s linear infinite;
            }
          `}</style>

          {/* Gradient masks for fading edges */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-black to-transparent z-10"></div>
          <div className="pointer-events-none absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-black to-transparent z-10"></div>

          <div className="flex w-max min-w-full group">
            <div className="flex w-max min-w-full animate-marquee items-center justify-around gap-4 pr-4 opacity-60  transition-all group-hover:grayscale-0 hover:[animation-play-state:paused]">
              {logoElements}
            </div>
            <div aria-hidden="true" className="flex w-max min-w-full animate-marquee items-center justify-around gap-4 pr-4 opacity-60  transition-all group-hover:grayscale-0 hover:[animation-play-state:paused]">
              {logoElements}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
