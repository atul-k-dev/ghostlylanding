"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { IMG } from "@/lib/assets";
import { SITE } from "@/lib/site";
import { StarsIcon } from "./icons";
import { GhostButton, PrimaryButton } from "./site-nav";
import { Float } from "./motion-primitives";
import { FeatureWall } from "./feature-wall";

const EASE = [0.44, 0, 0.22, 1] as const;

const AVATARS = [IMG.avatar1, IMG.avatar2, IMG.avatar4, IMG.avatar3, IMG.avatar5];

export function Hero() {
  // Reduced motion is handled by the root <MotionConfig reducedMotion="user">,
  // not by branching here — that would desync SSR from the first client render.
  const entry = (delay: number, y = 24) => ({
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: EASE },
  });

  return (
    /*
      Desktop: exactly the viewport height minus the 64px fixed nav, so the
      whole hero fits in view with nothing clipped behind the header. Stacked
      below 1024px, it fills at least the screen below the nav.
    */
    <section className="relative flex w-full flex-col items-center overflow-hidden min-[1024px]:h-[calc(100vh-4rem)] min-[1024px]:min-h-[616px] max-[1023px]:min-h-[calc(100vh-4rem)] max-[1023px]:pb-10 max-[1023px]:pt-16 max-[809px]:pt-10">
      {/*
        Decorations sit around the copy on the left — the right edge belongs to
        the feature wall. Hidden below 1200px, where there is no margin to
        spare for them.
      */}
      <div className="pointer-events-none absolute inset-0 z-[1] max-[1199px]:hidden">
        {/* grinning sun — above the headline */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="absolute h-[110px] w-[110px]"
          style={{ top: "9%", left: "1%" }}
        >
          <Float distance={8} duration={5}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMG.sun} alt="" className="h-full w-full object-contain" />
          </Float>
        </motion.div>

        {/* small blue dot */}
        <div className="absolute h-14 w-14" style={{ top: "3%", left: "30%" }}>
          <Float distance={9} duration={5.5} delay={0.3}>
            <Image
              src={IMG.blueCircle}
              alt=""
              width={56}
              height={56}
              preload
              className="h-full w-full object-contain"
            />
          </Float>
        </div>

        {/* green diamond — below the buttons */}
        <div
          className="absolute h-[73px] w-[73px]"
          style={{ top: "76%", left: "2%" }}
        >
          <Float distance={11} duration={6.4} delay={1}>
            <Image
              src={IMG.greenSquare}
              alt=""
              width={73}
              height={73}
              preload
              className="h-full w-full object-contain"
            />
          </Float>
        </div>

      </div>

      {/* ---- two-column content ---- */}
      <div className="relative z-[2] flex h-full w-full max-w-[1600px] items-stretch gap-10 px-4 sm:px-6 lg:px-8 max-[1023px]:flex-col max-[1023px]:gap-10">
        {/* LEFT — copy, centred in the space below the nav */}
        <div className="relative flex min-w-0 max-w-[720px] flex-1 flex-col items-start justify-center gap-6 sm:gap-8 pb-25 pt-0 max-[1023px]:max-w-none max-[1023px]:flex-none max-[1023px]:items-center max-[1023px]:p-0">
          <motion.div
            {...entry(0.05, 20)}
            className="inline-flex items-center gap-2.5 rounded-full py-1 pl-1 pr-4"
            style={{
              background: "var(--card-80)",
              border: "1px solid var(--line)",
              boxShadow: "0 1px 2px rgb(9 11 12 / 0.04), 0 6px 20px -8px rgb(29 155 240 / 0.25)",
              backdropFilter: "blur(8px)",
            }}
          >
            <span
              className="t-sm-med inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5"
              style={{ background: "var(--brand-050)", color: "var(--brand-800)" }}
            >
              <span className="relative flex size-1.5" aria-hidden="true">
                <span
                  className="absolute inset-0 animate-ping rounded-full opacity-70"
                  style={{ background: "var(--brand)" }}
                />
                <span
                  className="relative size-1.5 rounded-full"
                  style={{ background: "var(--brand)" }}
                />
              </span>
              Free Chrome extension
            </span>
            <p className="t-sm-med" style={{ color: "var(--ink-soft)" }}>
              For creators on X
            </p>
          </motion.div>

          <motion.h1
            {...entry(0.12)}
            className="t-h1 text-left max-[1023px]:text-center"
            style={{ color: "var(--ink)", textWrap: "balance" }}
          >
            Grow your X account while you sleep
          </motion.h1>

          <motion.p
            {...entry(0.2)}
            className="t-h6 max-w-[480px] text-left max-[1023px]:text-center"
            style={{ color: "var(--muted)", textWrap: "balance" }}
          >
            Ghostly247 likes, replies, follows and posts on X for you — and it
            sounds just like you. You stay in control.
          </motion.p>

          <motion.div
            {...entry(0.28)}
            className="flex flex-col items-start gap-3 max-[1023px]:items-center"
          >
            <div className="flex flex-wrap items-center gap-4 max-[1023px]:justify-center">
              <PrimaryButton href={SITE.chromeStoreUrl}>Add to Chrome</PrimaryButton>
              <GhostButton href="#watch">See it work</GhostButton>
            </div>
          </motion.div>

          {/* social proof — pinned to the bottom of the column on desktop */}
          <motion.div
            {...entry(0.36)}
            className="mt-6 flex items-center gap-4 max-[1023px]:mt-2 min-[1024px]:absolute min-[1024px]:inset-x-0 min-[1024px]:bottom-10 min-[1024px]:mt-0"
          >
            <div className="flex -space-x-3">
              {AVATARS.map((src) => (
                <Image
                  key={src}
                  src={src}
                  alt=""
                  width={44}
                  height={44}
                  className="size-11 rounded-full object-cover"
                  style={{ boxShadow: "0 0 0 2.5px var(--page)" }}
                />
              ))}
            </div>
            <div className="flex flex-col gap-1">
              <StarsIcon color="var(--ink)" size={16} />
              <p className="t-sm" style={{ color: "var(--zinc)" }}>
                Trusted by 1000+ creators
              </p>
            </div>
          </motion.div>
        </div>

        {/*
          RIGHT — every feature drifting past, running the full height of the
          screen (under the nav) with no stage behind it.
        */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.34, ease: EASE }}
          className="relative ml-auto w-[600px] flex-none self-stretch max-[1199px]:w-[440px] max-[1023px]:ml-0 max-[1023px]:h-[640px] max-[1023px]:w-full max-[639px]:h-[520px]"
        >
          <FeatureWall />
        </motion.div>
      </div>
    </section>
  );
}
