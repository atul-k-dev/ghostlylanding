import React from "react";
import { GhostLogo } from "./GhostLogo";

const TwitterXIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
  </svg>
);

const FacebookIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.477 2 2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V14.89h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.989C18.343 21.129 22 16.99 22 12c0-5.523-4.477-10-10-10z" />
  </svg>
);

const LINKS = [
  {
    heading: "Product",
    items: [
      { label: "Features", href: "#features" },
      { label: "How It Works", href: "#how-it-works" },
      { label: "Pricing", href: "#pricing" },
      { label: "Compare", href: "#comparison" },
    ],
  },
  {
    heading: "Company",
    items: [
      { label: "Testimonials", href: "#testimonials" },
      { label: "FAQ", href: "#faq" },
      { label: "Contact", href: "mailto:support@ghostly247.com" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="w-full text-fg px-4 sm:px-6 md:px-10 pt-16 sm:pt-20 pb-8 font-sans">
      <div className="mx-auto max-w-[1400px]">
        {/* Top: brand + link columns */}
        <div className="grid grid-cols-1 gap-12 md:grid-cols-[1.4fr_1fr_1fr] md:gap-8">
          {/* Brand */}
          <div className="max-w-sm">
            <div className="mb-5 flex items-center gap-2">
              <GhostLogo className="h-10 w-10" />
              <span className="text-2xl font-bold tracking-tight">
                Ghostly<span className="text-accent">247</span>
              </span>
            </div>
            <p className="text-[15px] leading-relaxed text-muted-fg">
              The friendly little ghost that grows your Twitter / X presence while you sleep —
              likes, replies, follows &amp; more, in your tone.
            </p>

            {/* Socials */}
            <div className="mt-6 flex gap-2.5">
              <a
                href="https://x.com/ghostly247"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Ghostly247 on X"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-[#111111] text-muted-fg transition-colors hover:border-white/30 hover:text-fg"
              >
                <TwitterXIcon />
              </a>
              <a
                href="#"
                aria-label="Ghostly247 on Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-[#111111] text-muted-fg transition-colors hover:border-white/30 hover:text-fg"
              >
                <FacebookIcon />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {LINKS.map((col) => (
            <div key={col.heading}>
              <h4 className="mb-5 text-[10px] font-bold uppercase tracking-widest text-[#666666]">
                {col.heading}
              </h4>
              <ul className="space-y-3.5">
                {col.items.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-[14.5px] font-medium text-[#cfcfcf] transition-colors hover:text-fg"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Giant watermark wordmark + overlapping bottom line */}
        <div className="relative mt-14 select-none border-t border-border pt-14">
          <div className="pointer-events-none overflow-hidden text-center">
            <span className="block whitespace-nowrap bg-gradient-to-b from-accent/35 to-accent/[0.04] bg-clip-text font-black leading-[0.78] tracking-tighter text-transparent text-[clamp(54px,15.5vw,248px)]">
              Ghostly247
            </span>
          </div>
          <div className="absolute inset-x-0 bottom-1 flex flex-col items-center justify-between gap-2 px-1 sm:flex-row">
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-fg/55">
              © 2026 Ghostly247. All rights reserved.
            </p>
            <p className="text-[11px] text-fg/55">
              The friendly little ghost for solo creators on X.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
