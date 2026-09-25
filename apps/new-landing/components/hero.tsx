"use client";

import Image from "next/image";
import { motion } from "motion/react";
import { IMG } from "@/lib/assets";
import { SITE } from "@/lib/site";
import { MEDIA } from "@/lib/media";
import { StarsIcon } from "./icons";
import { GhostButton, PrimaryButton } from "./site-nav";
import { Float } from "./motion-primitives";

const EASE = [0.44, 0, 0.22, 1] as const;

export function Hero() {
  // Reduced motion is handled by the root <MotionConfig reducedMotion="user">,
  // not by branching here — that would desync SSR from the first client render.
  const entry = (delay: number, y = 24) => ({
    initial: { opacity: 0, y },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.7, delay, ease: EASE },
  });

  return (
    <section className="relative flex w-full flex-col items-center overflow-hidden py-10 max-[1199px]:pb-10 max-[1199px]:pt-20 max-[809px]:pt-[120px]">
      {/*
        Decorations sit in the section's outer margins and around the copy so
        they frame the hero without landing on the dashboard. Hidden below
        1200px, where there is no margin to spare for them.
      */}
      <div className="pointer-events-none absolute inset-0 z-[1] max-[1199px]:hidden">
        {/* grinning sun — above the headline */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: EASE }}
          className="absolute h-[140px] w-[140px]"
          style={{ top: "6%", left: "3%" }}
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

        {/* pink arc — right margin, top */}
        <div
          className="absolute h-[169px] w-[169px]"
          style={{ top: "8%", right: "-2%" }}
        >
          <Float distance={14} duration={7}>
            <Image
              src={IMG.mrPink}
              alt=""
              width={485}
              height={485}
              preload
              className="h-full w-full object-contain"
            />
          </Float>
        </div>

        {/* blue mascot — right margin, bottom */}
        <div
          className="absolute h-[235px] w-[178px]"
          style={{ top: "66%", right: "-1%" }}
        >
          <Float distance={10} duration={8} delay={0.6}>
            <Image
              src={IMG.mrBlue}
              alt=""
              width={356}
              height={471}
              preload
              className="h-full w-full object-contain"
            />
          </Float>
        </div>
      </div>

      {/* ---- two-column content ---- */}
      <div className="relative z-[2] flex w-full max-w-[1600px] items-center gap-10 px-5 max-[1023px]:flex-col max-[1023px]:items-stretch max-[1023px]:gap-12">
        {/* LEFT — copy */}
        <div className="flex flex-[0_0_46%] flex-col items-start gap-8 max-[1023px]:flex-none max-[1023px]:items-center">
          <motion.div {...entry(0.05, 20)} className="flex items-center gap-2">
            <StarsIcon /> <br />
            <p className="t-body" style={{ color: "var(--muted)" }}>
              Built for solo creators on X
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
            Ghostly247 likes, replies, follows and posts for you — in your own
            voice, from your own browser. You approve everything, and every
            action is logged.
          </motion.p>

          <motion.div
            {...entry(0.28)}
            className="flex flex-col items-start gap-3 max-[1023px]:items-center"
          >
            <div className="flex flex-wrap items-center gap-4 max-[1023px]:justify-center">
              <PrimaryButton href={SITE.chromeStoreUrl} className="border border-blue-400">Add to Chrome</PrimaryButton>
              <GhostButton href="#watch">See it work</GhostButton>
            </div>
            
          </motion.div>
        </div>

        {/* RIGHT — the side panel on its square stage */}
        <motion.div {...entry(0.34)} className="min-w-0 flex-1">
          <div
            className="relative w-full overflow-hidden rounded-3xl"
            style={{ aspectRatio: "1 / 1" }}
          >
            <Image
              src={IMG.tabPlate}
              alt=""
              width={2480}
              height={1380}
              preload
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div
              className="absolute overflow-hidden"
              style={{
                left: "1.5%",
                right: "1.5%",
                top: "1.5%",
                bottom: "1.5%",
                
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={MEDIA.heroPanel}
                alt="The Ghostly247 side panel running beside X"
                className=" w-full object-cover object-top rounded-3xl"
              />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
