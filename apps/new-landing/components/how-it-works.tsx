"use client";

import { MEDIA } from "@/lib/media";
import { Reveal } from "./motion-primitives";
import { Section, SectionHead, Shell } from "./kit";

const STEPS = [
  {
    n: "01",
    title: "Add it to Chrome",
    body: "One click, free. Sign in with Google or email — no X password needed.",
    image: MEDIA.stepInstall,
    tint: "var(--violet)",
  },
  {
    n: "02",
    title: "Answer a few questions",
    body: "Tell it your goal. Ghostly reads your X profile, learns your voice, and suggests topics and people for you.",
    image: MEDIA.stepSetup,
    tint: "var(--lime)",
  },
  {
    n: "03",
    title: "Preview, then start",
    body: "See the posts it would pick and the replies it would write — nothing is posted. Happy? Turn it on.",
    image: MEDIA.stepRun,
    tint: "var(--pink)",
  },
];

export function HowItWorks() {
  return (
    <Section id="how">
      <Shell className="flex flex-col items-center gap-10">
        <SectionHead
          eyebrow="How it works"
          title="Set up in a few minutes"
          body="No passwords, no tech skills. Three simple steps."
        />

        <div className="grid w-full grid-cols-3 gap-4 lg:gap-5 max-[809px]:mx-auto max-[809px]:max-w-[560px] max-[809px]:grid-cols-1">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.1}>
              <div
                className="flex h-full flex-col gap-4 p-4 sm:gap-5 min-[1200px]:p-6"
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
