"use client";

import { MEDIA } from "@/lib/media";
import { Reveal } from "./motion-primitives";
import { Section, SectionHead, Shell } from "./kit";

const POINTS = [
  {
    title: "It shows you the post",
    body: "Spotlight outlines the exact post the engine is reading, right on x.com, with a label saying what it's doing.",
  },
  {
    title: "The outline stays put",
    body: "It moves to the next post rather than vanishing, so you can always see where Ghostly is — or where it last was.",
  },
  {
    title: "Or run it in the background",
    body: "Watch-it-work mode is a toggle. Turn it off and the same work happens quietly in a tab you never look at.",
  },
];

export function WatchItWork() {
  return (
    <Section id="watch" >
      <Shell className="flex flex-col items-center gap-8">
        <SectionHead
          eyebrow="Watch it work"
          tone="lime"
          title="Nothing happens off-screen"
          body="Most automation tools ask you to trust a dashboard. Ghostly does the work on X itself, and points at it while it happens."
        />

        <Reveal className="w-full">
          <div
            className="relative w-full overflow-hidden bg-black/20 rounded-2xl p-2 "
          >
            {/* WebM first: browsers take the first source they can play, so
                most get the 8 MB VP9 and only the rest fall back to the MP4. */}
            <video
              className="block h-auto w-full"
              style={{ borderRadius: 12 }}
              poster={MEDIA.spotlightPoster}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Ghostly247 highlighting and acting on posts in the X timeline"
            >
              <source src={MEDIA.spotlightVideoWebm} type="video/webm" />
              <source src={MEDIA.spotlightVideo} type="video/mp4" />
            </video>
          </div>
        </Reveal>

        <div className="grid w-full grid-cols-3 gap-1 max-[809px]:grid-cols-1 max-w-[1500px] bg-black/10 rounded-3xl p-1">
          {POINTS.map((p, i) => (
            <Reveal key={p.title} delay={i * 0.08}>
              <div
                className="flex h-full flex-col gap-2 p-6"
                style={{
                  background: "var(--card)",
                  borderRadius: 24,
                }}
              >
                <h3 className="t-h5" style={{ color: "var(--ink)" }}>
                  {p.title}
                </h3>
                <p className="t-body" style={{ color: "var(--zinc)" }}>
                  {p.body}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </Shell>
    </Section>
  );
}
