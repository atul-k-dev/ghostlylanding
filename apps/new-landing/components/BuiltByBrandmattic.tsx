"use client";

import React, { useState } from "react";
import Image from "next/image";
import GhostFibers from "./GhostFibers";

/* ---------------------------------------------------------------------------
 * BuiltByBrandmattic — footer credit. A liquid-glass pill (red mark +
 * "Brandmattic" wordmark in the site font) links to brandmattic.com; on hover
 * / keyboard focus a flat horizontal card opens above it with the brand, a
 * short description and two CTAs. The card's black background runs the
 * GhostFibers WebGL effect, which is only mounted after the first hover and
 * paused whenever the card is closed.
 * --------------------------------------------------------------------------- */

const SITE = "https://brandmattic.com";

export default function BuiltByBrandmattic() {
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);

  const show = () => {
    setOpen(true);
    setEverOpened(true);
  };

  return (
    <div
      className="group relative flex items-center gap-3"
      onMouseEnter={show}
      onMouseLeave={() => setOpen(false)}
      onFocus={show}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <span className="text-sm text-[color:var(--muted)]">Built by</span>

      {/* Liquid glass: translucent fill, strong blur + saturation, and a thin
          specular rim (inset highlights only — no outer shadow). */}
      <a
        href={SITE}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Brandmattic — visit brandmattic.com"
        className="flex items-center gap-2.5 rounded-full border border-black/10 bg-black/[0.04] py-2 pl-3.5 pr-5 backdrop-blur-xl backdrop-saturate-[1.8] shadow-[inset_0_1.5px_0_rgba(255,255,255,0.75),inset_0_-1px_0_rgba(255,255,255,0.2)] transition-colors duration-300 hover:bg-black/[0.08] group-focus-within:bg-black/[0.08]"
      >
        <Image
          src="/brand/brandmattic-mark.png"
          alt=""
          width={640}
          height={389}
          sizes="40px"
          className="h-5 w-auto"
        />
        <span className="text-[15px] font-bold leading-none tracking-[-0.03em] text-[color:var(--ink)]">
          Brandmattic
        </span>
      </a>

      {/* Hover card. pb-3 is a transparent bridge so the pointer can travel
          from the pill into the card without the hover state dropping. */}
      <div className="pointer-events-none invisible absolute bottom-full left-1/2 z-30 w-[480px] max-w-[calc(100vw-1.5rem)] -translate-x-1/2 translate-y-2 pb-3 opacity-0 transition-all duration-300 ease-out group-hover:pointer-events-auto group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100 sm:left-auto sm:right-0 sm:translate-x-0">
        <div className="relative overflow-hidden rounded-[14px] ring-2 ring-[#ea0722]  border-2 border-solid border-white  bg-[#282828] text-left">
          {everOpened && (
            <div aria-hidden="true" className="absolute inset-0">
              <GhostFibers
                glowColor="#f02b42"
                layers={2}
                threads={48}
                twist={1.2}
                fiberStyle="dots"
                depthOfField={0.6}
                hoverEffect="focus"
                particles={0.3}
                brightness={0.75}
                vignette={0.2}
                grain={0.04}
                pulseOnClick={false}
                dpr={1.5}
                paused={!open}
              />
            </div>
          )}

          <div className="relative z-10 flex items-center gap-5 p-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-[14px] bg-white/[0.08] ring-1 ring-white/15">
              <Image
                src="/brand/brandmattic-mark.png"
                alt="Brandmattic logo"
                width={640}
                height={389}
                sizes="64px"
                className="h-9 w-auto"
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xl font-extrabold leading-none tracking-[-0.04em] text-white">
                Brandmattic
              </p>
              <p className="mt-2! text-[13px] font-medium leading-[1.55] text-white/70">
                A strategy-led growth agency — consulting &amp; PR, digital marketing, web &amp; IT
                development and creative design.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                <a
                  href={`${SITE}/about-us`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/30 px-5 py-3 text-sm font-semibold leading-none text-white! transition-colors hover:bg-white hover:text-black!"
                >
                  Know more about us
                </a>
                <a
                  href={`${SITE}/contacts`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full bg-[#f02b42] px-5 py-3 text-sm font-semibold leading-none text-white! transition-colors hover:bg-[#d9213a]"
                >
                  Build with us
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
