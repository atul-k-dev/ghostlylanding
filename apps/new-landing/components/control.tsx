"use client";

import { MEDIA } from "@/lib/media";
import { Reveal } from "./motion-primitives";
import { Section, SectionHead, Shell } from "./kit";

const PANELS = [
  {
    eyebrow: "Review",
    tint: "var(--violet)",
    title: "Check replies before they post",
    body: "Every reply waits for your OK, right next to the post it answers. Edit it, approve it, or skip it.",
    bullets: [
      "Change any word — your version is what goes out",
      "Want it hands-off? Switch approval off anytime",
      "After 20 approvals with no edits, it asks if it can post on its own — only if you say yes",
    ],
    image: MEDIA.reviewQueue,
    alt: "Review tab showing a queued reply beside the post it answers",
  },
  {
    eyebrow: "Daily recap",
    tint: "var(--pink)",
    title: "A summary every morning",
    body: "One short email: what Ghostly did yesterday, who it followed, and every reply it sent.",
    bullets: [
      "Read every reply to check it still sounds like you",
      "A weekly email too — your growth and your best post",
      "When it's resting, it tells you why — like “Back at 9am”",
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
          title="Automatic, but always in your hands"
          body="See replies before they go out, and see everything it did after."
        />

        <div className="grid w-full grid-cols-2 gap-4 sm:gap-5 max-w-[1500px] mx-auto max-[1023px]:grid-cols-1 max-[1023px]:max-w-[720px]">
          {PANELS.map((p, i) => (
            <Reveal key={p.eyebrow} delay={i * 0.1}>
              <div
                className="flex h-full flex-col gap-5 p-3 sm:gap-6 sm:p-4"
                style={{
                  background: "var(--card)",
                  borderRadius: 32,
                }}
              >
                <div className="flex flex-col items-start gap-3 p-3 pb-0">
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

                <ul className="flex flex-col gap-2.5 p-3 pt-0">
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
