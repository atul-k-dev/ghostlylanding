"use client";

import Image from "next/image";
import { IMG } from "@/lib/assets";
import { SITE } from "@/lib/site";
import { PrimaryButton } from "./site-nav";
import { Reveal, Float } from "./motion-primitives";

export function Closing() {
  return (
    <section
      className="relative flex w-full flex-col items-center px-5 pb-[60px]"
    >
      {/* ================= CTA ================= */}
      <div className="relative flex w-full max-w-[1600px] flex-col items-center px-5 pb-20 pt-64 max-[809px]:px-5 max-[809px]:pb-10 max-[809px]:pt-20">
        {/* --- scattered decorations, offsets straight from the export --- */}

        {/* blurred pink dot */}
        <div
          className="pointer-events-none absolute z-[1] h-10 w-10 max-[1199px]:left-[calc(10.6494%-20px)] max-[1199px]:top-[calc(28.5714%-20px)] max-[809px]:left-[calc(-25.1429%-20px)] max-[809px]:top-[calc(9.81997%-20px)]"
          style={{
            top: "calc(32.4324% - 20px)",
            left: "calc(14.3103% - 20px)",
            background: "var(--pink)",
            filter: "blur(5px)",
            borderRadius: 100,
          }}
        />

        {/* blurred lime dot */}
        <div
          className="pointer-events-none absolute z-[1] h-[35px] w-[35px]"
          style={{
            top: 174,
            right: 364,
            background: "var(--lime-soft)",
            filter: "blur(4px)",
            borderRadius: 100,
          }}
        />

        {/* the sun */}
        <div
          className="pointer-events-none absolute z-[1] h-[108px] w-[108px]"
          style={{
            top: "calc(20.0772% - 54px)",
            left: "calc(49.0517% - 54px)",
          }}
        >
          <Float distance={8} duration={6}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={IMG.sun} alt="" className="h-full w-full object-contain" />
          </Float>
        </div>

        {/* violet mascot */}
        <div
          className="pointer-events-none absolute z-[1] h-[191px] w-[108px]"
          style={{
            top: "calc(101.737% - 95.5px)",
            left: "calc(14.1379% - 54px)",
          }}
        >
          <Float distance={10} duration={7} delay={0.5}>
            <Image
              src={IMG.mrViolet}
              alt=""
              width={216}
              height={382}
              className="h-full w-full object-contain"
            />
          </Float>
        </div>

        {/* pale cloud, upper right */}
        <div
          className="pointer-events-none absolute z-[1] h-[241px] w-[480px]"
          style={{
            top: "calc(28.5714% - 120.5px)",
            left: "calc(88.7931% - 240px)",
          }}
        >
          <Image
            src={IMG.ctaCloud}
            alt=""
            width={1920}
            height={964}
            className="h-full w-full object-contain"
          />
        </div>

        {/* blue mascot, lower right */}
        <div
          className="pointer-events-none absolute z-[1] h-[169px] w-[169px]"
          style={{
            top: "calc(85.5212% - 84.5px)",
            left: "calc(93.9655% - 84.5px)",
          }}
        >
          <Float distance={12} duration={6.5} delay={0.8}>
            <Image
              src={IMG.ctaBlue}
              alt=""
              width={338}
              height={338}
              className="h-full w-full object-contain"
            />
          </Float>
        </div>

        {/* wide cloud behind the footer card */}
        <div
          className="pointer-events-none absolute z-0 h-[234px] w-[480px]"
          style={{
            top: "calc(90.2542% - 117px)",
            left: "calc(15.5833% - 240px)",
          }}
        >
          <Image
            src={IMG.footerCloud}
            alt=""
            width={1920}
            height={936}
            className="h-full w-full object-contain"
          />
        </div>

        {/* --- the actual message --- */}
        <Reveal className="relative z-[1] flex w-full max-w-[780px] flex-col items-center gap-8">
          <div className="flex w-full flex-col items-center gap-1">
            <h2
              className="t-h2 text-center"
              style={{ color: "var(--ink)", textWrap: "balance" }}
            >
              Let the ghost do the boring half
            </h2>
            <p
              className="t-h6 text-center"
              style={{ color: "var(--muted)", textWrap: "balance" }}
            >
              Free for 50 actions a month. No card, no contract, and you can
              switch it off in two seconds.
            </p>
          </div>
          <PrimaryButton href={SITE.chromeStoreUrl} className="border border-blue-400">Add to Chrome — it&rsquo;s free</PrimaryButton>
        </Reveal>
      </div>

    </section>
  );
}
