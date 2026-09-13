"use client";

import { MEDIA } from "@/lib/media";
import { Reveal } from "./motion-primitives";
import { Section, SectionHead, Shell } from "./kit";

const PANELS = [
  {
    eyebrow: "Review queue",
    tint: "var(--violet)",
    title: "Read it before X does",
    body: "Turn on approval and a generated reply never posts straight away. It waits beside the post it answers, so you can judge it in context, fix a word, then approve or skip.",
    bullets: [
      "Edit in place — your version is what goes out",
      "Skip once and Ghostly never revisits that post",
      "Holds 30, and when it's full it stops drafting rather than quietly binning work you never saw",
    ],
    image: MEDIA.reviewQueue,
    alt: "Review tab showing a queued reply beside the post it answers",
  },
  {
    eyebrow: "Daily recap",
    tint: "var(--pink)",
    title: "One email, every morning",
    body: "A end-of-day summary timed to your local morning: what Ghostly did, who it followed, and the full text of every AI reply and quote it sent.",
    bullets: [
      "Per-action counts for the day",
      "Every reply in full, so you can check it still sounds like you",
      "A weekly edition too — followers against last week, and the post that won it",
    ],
    image: MEDIA.recapEmail,
    alt: "The Ghostly247 daily recap email",
  },
];

export function Control() {
  return (
    <Section>
      <Shell className="flex flex-col items-center gap-10">
        <SectionHead
          eyebrow="In your hands"
          tone="violet"
          title="Automated, not unattended"
          body="Two habits keep the whole thing honest: you see the reply before it goes out, and you see everything it did after."
        />

        <div className="grid w-full grid-cols-2 gap-5 max-[1023px]:grid-cols-1">
          {PANELS.map((p, i) => (
            <Reveal key={p.eyebrow} delay={i * 0.1}>
              <div
                className="flex h-full flex-col gap-6 p-8 max-[809px]:p-5"
                style={{
                  background: "var(--card)",
                  borderRadius: 32,
                }}
              >
                <div className="flex flex-col items-start gap-3">
                  <span
                    className="t-sm-med rounded-full px-3 py-1"
                    style={{ background: p.tint, color: "var(--ink)" }}
                  >
                    {p.eyebrow}
                  </span>
                  <h3 className="t-h3" style={{ color: "var(--ink)" }}>
                    {p.title}
                  </h3>
                  <p className="t-body" style={{ color: "var(--zinc)" }}>
                    {p.body}
                  </p>
                </div>

                <ul className="flex flex-col gap-2.5">
                  {p.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3">
                      <span
                        aria-hidden="true"
                        className="mt-[7px] size-1.5 flex-none rounded-full"
                        style={{ background: "var(--ink)" }}
                      />
                      <span className="t-body" style={{ color: "var(--zinc)" }}>
                        {b}
                      </span>
                    </li>
                  ))}
                </ul>

                <div
                  className="mt-auto overflow-hidden"
                  style={{ borderRadius: 20, background: "var(--surface-2)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image}
                    alt={p.alt}
                    className="block h-auto w-full"
                  />
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </Shell>
    </Section>
  );
}
