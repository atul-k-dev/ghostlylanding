"use client";

import { MEDIA } from "@/lib/media";
import { SITE } from "@/lib/site";
import { PrimaryButton } from "./site-nav";
import { Reveal } from "./motion-primitives";
import { Shell } from "./kit";

const FEATURES = [
  {
    id: "ask",
    eyebrow: "Ask",
    title: "Just tell it what you want",
    body: "“Post more.” “Stop following people.” “What's working for me?” Ask answers from your real numbers — and nothing changes until you tap Do it. Changed your mind? Undo it.",
    tags: ["Plain English", "Asks before changing anything", "Remembers your rules"],
    image: MEDIA.askPanel,
    tint: "var(--violet)",
    stickyTop: 150,
  },
  {
    id: "voice",
    eyebrow: "Your voice",
    title: "Replies that sound like you",
    body: "One tap and Ghostly reads your recent posts to learn how you write — then every reply and post sounds like you. It keeps only a short note about your style, never your posts, and you can delete it anytime.",
    tags: ["Learns your style", "Private", "Retrain anytime"],
    image: MEDIA.voicePanel,
    tint: "var(--lime)",
    stickyTop: 150,
  },
  {
    id: "create",
    eyebrow: "Create & schedule",
    title: "Never miss a day of posting",
    body: "Describe an idea in one line and AI writes the post. Add an image or a thread, pick a time, and you're done. Short on ideas? Ghostly can write posts for you and suggest the best time to share them — each one waits for your OK.",
    tags: ["AI writing", "Threads & images", "Best times"],
    image: MEDIA.composerPanel,
    tint: "var(--pink)",
    stickyTop: 150,
  },
  {
    id: "targeting",
    eyebrow: "Targeting",
    title: "Reach the right people",
    body: "Tell Ghostly your topics and it finds fresh posts about them all over X — not just from people you already follow. Add creators you admire, and it replies early on their new posts, when replies get seen the most.",
    tags: ["Your topics", "Creators you pick", "Early replies"],
    image: MEDIA.targetingPanel,
    tint: "var(--lime-soft)",
    stickyTop: 150,
  },
  {
    id: "mentions",
    eyebrow: "Mentions",
    title: "Never leave a reply unanswered",
    body: "When someone replies to you or mentions you, Ghostly writes an answer that fits the conversation. The most important ones come first — and if a big account replies, it can give you a heads-up.",
    tags: ["Answers replies", "Knows the context", "Big-account alerts"],
    image: MEDIA.mentionsPanel,
    tint: "var(--violet)",
    stickyTop: 135,
  },
];

export function FeatureCards() {
  return (
    <section className="flex w-full flex-col items-center overflow-x-clip py-10 xl:py-12">
      <Shell className="flex flex-col items-center gap-5 sm:gap-8 xl:gap-10">
        <Reveal className="flex w-full items-end gap-5 max-w-[820px]">
          <h2
            className="t-h2  flex-1 text-center"
            style={{ color: "var(--ink)", textWrap: "balance" }}
          >
            What makes Ghostly different
          </h2>
        </Reveal>

        {/*
          The cards stack as you scroll: each sticks 15px lower than the last,
          so the edge of every card underneath stays visible.
        */}
        {FEATURES.map((f) => (
          <div
            key={f.id}
            id={f.id}
            className="z-[1] h-[580px] w-full max-[1199px]:h-auto max-[1199px]:!static  max-w-[1450px]"
            style={{ position: "sticky", top: f.stickyTop }}
          >
            <div
              className="flex h-[580px] w-full items-start gap-10 p-4 max-[1199px]:h-auto max-[1199px]:flex-col max-[1199px]:gap-6 max-[809px]:gap-4 max-[809px]:p-3"
              style={{ background: "var(--card)", borderRadius: 24 }}
            >
              {/* copy column */}
              <div className="flex h-full p-4 min-w-0 flex-1 flex-col items-start justify-between gap-10 max-[1199px]:h-auto max-[1199px]:w-full max-[1199px]:flex-none max-[1199px]:gap-6 max-[809px]:p-2">
                <div className="flex w-full flex-col items-start gap-4 sm:gap-5">
                  <span
                    className="t-sm-med inline-flex items-center rounded-full px-3 py-1"
                    style={{ background: f.tint, color: "var(--ink)" }}
                  >
                    {f.eyebrow}
                  </span>

                  <h3 className="t-h3" style={{ color: "var(--ink)" }}>
                    {f.title}
                  </h3>
                  <p
                    className="t-body max-w-[600px]"
                    style={{ color: "var(--zinc)" }}
                  >
                    {f.body}
                  </p>

                  <div className="flex flex-wrap items-start gap-2">
                    {f.tags.map((t) => (
                      <span
                        key={t}
                        className="t-sm rounded-full px-4 py-1.5"
                        style={{
                          background: "var(--page)",
                          color: "var(--ink)",
                        }}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <PrimaryButton href={SITE.chromeStoreUrl}>Add to Chrome</PrimaryButton>
              </div>

              {/* screenshot panel */}
              <div
                className="relative h-[550px] w-[660px] max-w-full flex-none overflow-hidden max-[1199px]:w-full max-[1023px]:h-[480px] max-[809px]:h-[340px] max-[479px]:h-[280px]"
                style={{ borderRadius: 20, background: "var(--surface-2)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.image}
                  alt={f.title}
                  className="h-full w-full object-cover object-top"
                />
              </div>
            </div>
          </div>
        ))}
      </Shell>
    </section>
  );
}
