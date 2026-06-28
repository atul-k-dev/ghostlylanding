"use client";

import React, { useState, useEffect } from 'react';
import { GhostLogo } from './GhostLogo';

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      className={`fixed top-1 left-0 right-0 z-50  flex max-w-min min-w-max mx-auto rounded-lg border border-white/0 justify-center transition-colors duration-300 ${
        isScrolled ? 'bg-[#252525d6] backdrop-blur-md border-white/25 ' : 'bg-transparent'
      }`}
    >
      <nav className="relative z-10 mx-auto gap-4 sm:gap-10 lg:gap-28 flex w-full max-w-[1400px] items-center justify-between px-4 py-3 sm:px-6 sm:py-4 md:px-10">
        <a href="#" className="flex items-center gap-2">
          <GhostLogo className="h-11 w-11 text-2xl" />
          <span className="font-inter text-[20px] sm:text-[27px] font-semibold text-fg tracking-tight">
            Ghostly247
          </span>
        </a>

        {/* Center links — desktop only */}
        <div className="hidden items-center gap-10 lg:flex">
          {[
            { label: 'Features', href: '#features' },
            { label: 'How to Use', href: '#how-to-use' },
            { label: 'Pricing', href: '#pricing' },
            { label: 'Compare', href: '#comparison' },
            { label: 'FAQ', href: '#faq' },
          ].map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-[15px] font-inter font-medium text-muted-fg transition-colors duration-200 hover:text-fg py-1 px-0"
            >
              {label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-4">
          <a
            href="#pricing"
            className="rounded-full border border-white px-3 py-2 sm:px-5 sm:py-2.5 text-[13px] sm:text-[14px] font-medium text-black transition-all duration-200 hover:bg-white/0 bg-white hover:text-fg"
          >
            Get Started
          </a>
          
        </div>
      </nav>
    </div>
  );
}
