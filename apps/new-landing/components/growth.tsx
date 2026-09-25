"use client";

import { MEDIA } from "@/lib/media";
import { Reveal } from "./motion-primitives";
import { Section, SectionHead, Shell } from "./kit";

const METRICS = [
  {
    label: "Follower trend",
    body: "A reading a day, charted, with change over 1, 7 and 30 days — each labelled with the span it actually covers.",
  },
  {
    label: "Reply performance",
    body: "Likes, replies, reposts and views on the replies Ghostly sent, with your best ones linked.",
  },
  {
    label: "Follow-back payoff",
    body: "How many of your recent followers are accounts Ghostly followed first.",
  },
];

export function Growth() {
  return (
    <Section id="growth" >
      <Shell className="flex flex-col items-center gap-10">
        <SectionHead
          eyebrow="Growth"
          tone="lime"
          title="Everything else counts what it did. This counts what it got."
          body="Once a day Ghostly opens your own profile in a background tab and just reads — no clicks, nothing spent against your caps or your monthly allowance."
        />

        <Reveal className="w-full">
          <div
            className="flex w-full items-center gap-10 p-4 pr-8 max-[1023px]:flex-col max-[1023px]:p-6"
            style={{ background: "var(--card)", borderRadius: 32 }}
          >
            <div className="min-w-0 flex-[1.3] max-[1023px]:w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={MEDIA.growthBoard}
                alt="Growth tab showing a follower sparkline, deltas and best-performing replies"
                className="block h-auto w-full"
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
                A three-day-old install says <strong>+21 over 2d</strong> — never
                a month of history it doesn&apos;t have. If a number isn&apos;t
                honestly knowable, Ghostly leaves it out.
              </p>
            </div>
          </div>
        </Reveal>
      </Shell>
    </Section>
  );
}
