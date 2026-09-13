"use client";

import {
  Dices,
  Gauge,
  Hourglass,
  Laptop,
  OctagonPause,
  Siren,
  Sprout,
  type LucideIcon,
} from "lucide-react";
import { Reveal } from "./motion-primitives";
import { Section, SectionHead, Shell } from "./kit";

type Size = "lg" | "sm" | "wide";

type Guarantee = {
  title: string;
  body: string;
  icon: LucideIcon;
  tint: string;
  size: Size;
};

const GUARANTEES: Guarantee[] = [
  {
    title: "Uses your own browser",
    body: "Ghostly works from your own Chrome, just like you would. It never asks for your X password.",
    icon: Laptop,
    tint: "var(--violet)",
    size: "lg",
  },
  {
    title: "Moves like a person",
    body: "Random pauses between every action, never rushed.",
    icon: Dices,
    tint: "var(--pink)",
    size: "sm",
  },
  {
    title: "Choose your pace",
    body: "Careful, Balanced or Growth. One choice sets every limit.",
    icon: Gauge,
    tint: "var(--lime-soft)",
    size: "sm",
  },
  {
    title: "Starts slow",
    body: "New setups and newer accounts begin gently, then build up.",
    icon: Sprout,
    tint: "var(--pink)",
    size: "sm",
  },
  {
    title: "Stops in a second",
    body: "One tap on pause and everything stops.",
    icon: OctagonPause,
    tint: "var(--violet)",
    size: "sm",
  },
  {
    title: "Works your hours, takes breaks",
    body: "It only works when you'd be awake, and rests between sessions — just like a real person.",
    icon: Hourglass,
    tint: "var(--lime-soft)",
    size: "wide",
  },
  {
    title: "Stops if something's off",
    body: "If it can't see X properly, it pauses by itself and tells you why.",
    icon: Siren,
    tint: "var(--pink)",
    size: "wide",
  },
];

/*
  A 4-column bento: the first card (lg) claims a 2x2 block, the grid's
  default row-major auto-placement then slots the four "sm" cards into the
  remaining two cells per row, and the trailing "wide" pair closes the grid
  as a full-width row. Order in GUARANTEES drives the placement, so keep the
  lg card first and the two wide cards last.
*/
const SIZE_CLASS: Record<Size, string> = {
  lg: "col-span-2 row-span-2 min-h-[320px] max-[1023px]:row-span-1 max-[1023px]:min-h-[220px] max-[639px]:col-span-1",
  sm: "col-span-1 row-span-1 min-h-[150px]",
  wide: "col-span-2 row-span-1 min-h-[140px] max-[639px]:col-span-1",
};

export function Safety() {
  return (
    <Section id="safety">
      <Shell className="flex flex-col items-center gap-10">
        <SectionHead
          eyebrow="Safety"
          tone="lime"
          title="Your account comes first"
          body="Ghostly is careful by design. You don't need to set anything up to stay safe."
        />

        <div className="grid w-full grid-cols-4 gap-2 sm:gap-2 max-[1023px]:grid-cols-2 max-[639px]:grid-cols-1">
          {GUARANTEES.map((g, i) => {
            const Icon = g.icon;
            return (
              <Reveal key={g.title} delay={i * 0.05} className={SIZE_CLASS[g.size]}>
                <div
                  className={
                    "group flex h-full flex-col gap-4 p-5 sm:p-6 transition-colors" +
                    (g.size === "lg" ? " justify-between" : "")
                  }
                  style={{ background: "var(--card)", borderRadius: 24 }}
                >
                  <span
                    className={
                      "grid flex-none place-items-center rounded-2xl transition-transform duration-300 group-hover:-rotate-6 " +
                      (g.size === "lg" ? "size-14" : "size-12")
                    }
                    style={{ background: g.tint, color: "var(--ink)" }}
                  >
                    <Icon size={g.size === "lg" ? 26 : 22} strokeWidth={1.75} />
                  </span>

                  <div className="flex flex-col gap-1.5">
                    <h3 className="t-h5" style={{ color: "var(--ink)" }}>
                      {g.title}
                    </h3>
                    <p className="t-body" style={{ color: "var(--zinc)" }}>
                      {g.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        <p
          className="t-sm max-w-[760px] text-center"
          style={{ color: "var(--muted)" }}
        >
          An honest note: no tool can promise zero risk on X, and X&apos;s own
          rules on automation apply. Ghostly keeps things slow and human, and
          you&apos;re always in charge.
        </p>
      </Shell>
    </Section>
  );
}
