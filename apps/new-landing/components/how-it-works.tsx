"use client";

import { MEDIA } from "@/lib/media";
import { Reveal } from "./motion-primitives";
import { Section, SectionHead, Shell } from "./kit";

const STEPS = [
  {
    n: "01",
    title: "Add it to Chrome",
    body: "One click from the Web Store. Sign in with Google or an email address — never your X password.",
    image: MEDIA.stepInstall,
    tint: "var(--violet)",
  },
  {
    n: "02",
    title: "Teach it your voice",
    body: "Pick what you're here for, then tap train. Ghostly reads your own posts and works out how you write.",
    image: MEDIA.stepSetup,
    tint: "var(--lime)",
  },
  {
    n: "03",
    title: "Press Active",
    body: "Set your topics and caps, then let it run for a session. Watch it work, or close the panel and read the recap tomorrow.",
    image: MEDIA.stepRun,
    tint: "var(--pink)",
  },
];

export function HowItWorks() {
  return (
    <Section id="how">
      <Shell className="flex flex-col items-center gap-10">
        <SectionHead
          eyebrow="Setup"
          title="Running in about four minutes"
          body="No API keys, no cookies to paste, no spreadsheet of accounts. Install it and go."
        />

        <div className="grid w-full grid-cols-3 gap-5 max-[809px]:grid-cols-1">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div
                className="flex h-full flex-col gap-5 p-6"
                style={{
                  background: "var(--card)",
                  borderRadius: 32,
                }}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="t-sm-med grid size-9 place-items-center rounded-full"
                    style={{ background: s.tint, color: "var(--ink)" }}
                  >
                    {s.n}
                  </span>
                  <h3 className="t-h5" style={{ color: "var(--ink)" }}>
                    {s.title}
                  </h3>
                </div>

                <p className="t-body" style={{ color: "var(--zinc)" }}>
                  {s.body}
                </p>

                <div
                  className="mt-auto overflow-hidden"
                  style={{ borderRadius: 20, background: "var(--surface-2)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={s.image}
                    alt={s.title}
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
