"use client";

import { MEDIA } from "@/lib/media";
import { Reveal } from "./motion-primitives";

/** The three promises the extension's own onboarding makes, in the same order. */
const BENEFITS = [
  {
    title: "Does the work for you",
    body: "Likes, replies and follows on posts about your topics — while you get on with your day.",
    emoji: "👋",
    tint: "var(--violet)",
    shot: MEDIA.pillarEngage,
  },
  {
    title: "Sounds like you",
    body: "It learns from your own posts, so every reply reads like you wrote it — not a robot.",
    emoji: "💬",
    tint: "var(--lime)",
    shot: MEDIA.pillarVoice,
  },
  {
    title: "Keeps your account safe",
    body: "It works at a human pace, stays inside daily limits, and stops the moment you tap pause.",
    emoji: "🛡️",
    tint: "var(--pink)",
    shot: MEDIA.pillarSafety,
  },
];

export function BenefitCards() {
  return (
    <Reveal className="flex w-full max-w-[1500px] flex-col px-4 sm:px-6 lg:px-8" as="section">
      <div
        className="flex w-full flex-col gap-2 p-2 min-[810px]:flex-row min-[810px]:items-stretch bg-black/10"
        style={{ borderRadius: 32 }}
      >
        {BENEFITS.map((b) => (
          <div
            key={b.title}
            className="flex flex-1 flex-col items-stretch overflow-hidden"
            style={{ background: "var(--card)", borderRadius: 24 }}
          >
            {/* copy */}
            <div className="flex flex-col items-start gap-4 p-5 sm:p-6">
              <span
                className="grid size-16 flex-none place-items-center rounded-2xl text-[28px]"
                style={{ background: b.tint }}
                aria-hidden="true"
              >
                {b.emoji}
              </span>

              <div className="flex flex-col gap-1.5">
                <h3 className="t-h5" style={{ color: "var(--ink)" }}>
                  {b.title}
                </h3>
                <p className="t-body" style={{ color: "var(--zinc)" }}>
                  {b.body}
                </p>
              </div>
            </div>

            {/* shot */}
            <div className="relative mx-4 mb-4 h-[280px] overflow-hidden max-[809px]:h-[320px] max-[479px]:mx-3 max-[479px]:mb-3 max-[479px]:h-[260px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={b.shot}
                alt={b.title}
                className="h-full w-full object-cover"
                style={{ borderRadius: 16 }}
              />
            </div>
          </div>
        ))}
      </div>
    </Reveal>
  );
}
