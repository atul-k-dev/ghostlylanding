"use client";

import { MEDIA } from "@/lib/media";
import { Reveal } from "./motion-primitives";
import { Section, SectionHead, Shell } from "./kit";

const POINTS = [
  {
    title: "It highlights the post",
    body: "A coloured outline shows the post Ghostly is on, with a note like “Liking this” or “Reply ready for you”.",
  },
  {
    title: "A little ghost keeps you posted",
    body: "A small ghost in the corner of X shows it's working, and tells you when something needs your OK.",
  },
  {
    title: "Reply for me, anytime",
    body: "Hover any post on X and tap the ghost. You get a reply in your voice, ready to send.",
  },
];

export function WatchItWork() {
  return (
    <Section id="watch" >
      <Shell className="flex flex-col items-center gap-6 sm:gap-8">
        <SectionHead
          eyebrow="Watch it work"
          tone="lime"
          title="See exactly what it's doing"
          body="Ghostly works right on X, in its own tab, and highlights each post as it goes. Nothing hidden — and you can keep using your browser."
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
                className="flex h-full flex-col gap-2 p-5 min-[1200px]:p-6"
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
