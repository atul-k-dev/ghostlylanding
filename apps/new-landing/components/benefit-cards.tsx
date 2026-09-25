"use client";

import { useState } from "react";
import { MEDIA } from "@/lib/media";
import { Reveal } from "./motion-primitives";

/** The three promises the extension's own onboarding makes, in the same order. */
const BENEFITS = [
  {
    title: "Engages for you",
    body: "It works your timeline and your topic feeds while you're doing something else — liking, replying, following, reposting.",
    emoji: "👋",
    tint: "var(--violet)",
    shot: MEDIA.pillarEngage,
  },
  {
    title: "Sounds like you",
    body: "Trained on your own posts, so a reply reads like something you'd type — not a template with your name on it.",
    emoji: "💬",
    tint: "var(--lime)",
    shot: MEDIA.pillarVoice,
  },
  {
    title: "Grows safely",
    body: "Human-paced delays, caps that scale with your account's age, and a kill switch that stops everything in about two seconds.",
    emoji: "🛡️",
    tint: "var(--pink)",
    shot: MEDIA.pillarSafety,
  },
];

/*
  Everything here animates through plain CSS transitions rather than JS.
  Expanding a card is a layout change (flex-grow), and driving that from
  JavaScript means a React render plus a style write on every frame, which is
  what made the panel stutter. Handing the same interpolation to the browser
  keeps it on the style/layout fast path and runs clean.
*/
const EASE = "cubic-bezier(0.44, 0, 0.22, 1)";
const DURATION = "520ms";

export function BenefitCards() {
  const [open, setOpen] = useState(0);

  return (
    <Reveal className="flex w-full max-w-[1500px] flex-col px-5" as="section">
      <div
        className="flex w-full flex-col gap-2 p-2 min-[810px]:flex-row min-[810px]:items-stretch bg-black/10"
        style={{  borderRadius: 32 }}
      >
        {BENEFITS.map((b, i) => {
          const isOpen = open === i;

          return (
            <div
              key={b.title}
              onMouseEnter={() => setOpen(i)}
              onFocus={() => setOpen(i)}
              tabIndex={0}
              role="button"
              aria-expanded={isOpen}
              className="relative flex cursor-pointer flex-col items-stretch overflow-hidden outline-none min-[810px]:flex-row min-[810px]:items-center"
              style={{
                // 1.7 : 1 : 1 — the ratio the export uses for open vs closed.
                flexGrow: isOpen ? 1.7 : 1,
                flexBasis: 0,
                background: isOpen ? "var(--card)" : "var(--card)",
                borderRadius: 24,
                transition: `flex-grow ${DURATION} ${EASE}, background-color ${DURATION} ${EASE}`,
                willChange: "flex-grow",
              }}
            >
              {/* copy column */}
              <div className="flex h-[402px] min-w-0 flex-1 flex-col items-start p-6 max-[809px]:h-auto max-[809px]:w-full max-[809px]:gap-4 max-[809px]:px-4">
                <span
                  className="grid size-16 flex-none place-items-center rounded-2xl text-[28px]"
                  style={{ background: b.tint }}
                  aria-hidden="true"
                >
                  {b.emoji}
                </span>

                <div className="flex min-w-0 flex-1 flex-col justify-end gap-1.5 max-[809px]:flex-none max-[809px]:justify-start">
                  <h3 className="t-h5" style={{ color: "var(--ink)" }}>
                    {b.title}
                  </h3>
                  <p className="t-body" style={{ color: "var(--zinc)" }}>
                    {b.body}
                  </p>
                </div>
              </div>

              {/*
                Image panel. Open it claims its share of the row; closed it
                collapses to zero width and the card's overflow clips it.
              */}
              <div
                className="relative h-[386px] shrink-0 overflow-hidden max-[809px]:!h-[350px] max-[809px]:!w-full max-[809px]:!max-w-none max-[809px]:!opacity-100"
                style={{
                  width: isOpen ? 290 : 0,
                  opacity: isOpen ? 1 : 0,
                  marginRight: isOpen ? 8 : 0,
                  borderRadius: 16,
                  transition: `width ${DURATION} ${EASE}, opacity 320ms ${EASE}, margin-right ${DURATION} ${EASE}`,
                  willChange: "width",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={b.shot}
                  alt={b.title}
                  className="h-full w-[290px] max-w-none object-cover max-[809px]:w-full"
                  style={{ borderRadius: 16 }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </Reveal>
  );
}
