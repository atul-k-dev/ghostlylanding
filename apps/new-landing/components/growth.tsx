"use client";

import { MEDIA } from "@/lib/media";
import { Reveal } from "./motion-primitives";
import { Section, SectionHead, Shell } from "./kit";

const METRICS = [
  {
    label: "Followers over time",
    body: "A simple chart of your followers, and how much you've grown this week and month.",
  },
  {
    label: "Your best replies",
    body: "Which replies got the most likes and views — so you know what works.",
  },
  {
    label: "What's working",
    body: "Which topics and creators bring you results. It can even drop the ones that stopped working.",
  },
];

export function Growth() {
  return (
    <Section id="growth" >
      <Shell className="flex flex-col items-center gap-10">
        <SectionHead
          eyebrow="Growth"
          tone="lime"
          title="See what you're actually getting"
          body="Not just what Ghostly did — what it got you. Checking your numbers is free and never counts toward your limits."
        />

        <Reveal className="w-full">
          <div
            className="flex w-full items-center gap-10 p-4 max-w-[1350px] mx-auto pr-8 max-[1023px]:flex-col max-[1023px]:items-stretch max-[1023px]:gap-6 max-[1023px]:p-6 max-[639px]:p-4"
            style={{ background: "var(--card)", borderRadius: 32 }}
          >
            <div className="min-w-0 flex-[1.3] max-[1023px]:w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={MEDIA.growthBoard}
                alt="Growth tab showing a follower sparkline, deltas and best-performing replies"
                className="mx-auto block h-auto w-auto max-w-full max-h-[650px] max-[639px]:max-h-[460px]"
                style={{ borderRadius: 16, boxShadow: "var(--shadow-card)" }}
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-6">
              {METRICS.map((m) => (
                <div key={m.label} className="flex flex-col gap-1.5">
                  <h3 className="t-h5" style={{ color: "var(--ink)" }}>
                    {m.label}
                  </h3>
                  <p className="t-body" style={{ color: "var(--zinc)" }}>
                    {m.body}
                  </p>
                </div>
              ))}

              <p
                className="t-sm rounded-2xl p-4"
                style={{ background: "var(--line-2)", color: "var(--zinc)" }}
              >
                <strong>No made-up numbers.</strong> If Ghostly doesn&apos;t know
                something yet, it tells you instead of guessing.
              </p>
            </div>
          </div>
        </Reveal>
      </Shell>
    </Section>
  );
}
