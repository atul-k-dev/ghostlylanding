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
    title: "Talk to it like a person",
    body: "“Stop following people for now.” “Which creators are working best?” “Write a post about today's launch.” Ask understands all of it — and anything that would change something arrives as a proposal card. Nothing is applied until you tap Do it, and settings changes can be undone.",
    tags: ["Proposes, never applies", "Remembers your rules", "Dry run"],
    image: MEDIA.askPanel,
    tint: "var(--violet)",
    stickyTop: 150,
  },
  {
    id: "voice",
    eyebrow: "Your voice",
    title: "Replies that sound like you wrote them",
    body: "One tap and Ghostly reads your last ~50 posts — sentence length, lowercase habits, punctuation, how you open and close a thought — and writes every reply, quote and draft that way. The posts are analysed and thrown away; only the short style summary is kept, and you can read or delete it any time.",
    tags: ["Learns from your posts", "Overrides tone presets", "Retrain anytime"],
    image: MEDIA.voicePanel,
    tint: "var(--lime)",
    stickyTop: 150,
  },
  {
    id: "create",
    eyebrow: "Create & schedule",
    title: "Write ahead, post on time",
    body: "Describe a post in a line and AI drafts it. Add a link, an image, or follow-up tweets and Ghostly posts the whole thread as one — if any part fails to build, nothing goes out at all. Queue up to 25, pick the day and the hour, and watch each move Scheduled → Posting → Posted.",
    tags: ["Threads", "25 queued", "280 / 1k / 4k"],
    image: MEDIA.composerPanel,
    tint: "var(--pink)",
    stickyTop: 150,
  },
  {
    id: "targeting",
    eyebrow: "Targeting",
    title: "Reply where it actually counts",
    body: "Save up to 5 searches and Ghostly works X's Latest tab for each — real posts on your subject, newest first, instead of whatever the home feed decides to show you. X's own operators work. Turn on early replies and it re-checks a creator every few minutes, engaging only posts from the last ~3 hours.",
    tags: ["5 topic feeds", "Search operators", "Early replies"],
    image: MEDIA.targetingPanel,
    tint: "var(--lime-soft)",
    stickyTop: 135,
  },
];

export function FeatureCards() {
  return (
    <section className="flex w-full flex-col items-center overflow-x-clip py-10">
      <Shell className="flex flex-col items-center gap-10">
        <Reveal className="flex w-full items-end gap-5 max-w-[820px]">
          <h2
            className="t-h2  flex-1 text-center"
            style={{ color: "var(--ink)", textWrap: "balance" }}
          >
            Four things that make it yours, not a bot&apos;s
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
              className="flex h-[580px] w-full items-start gap-10 p-4 max-[1199px]:h-auto max-[1199px]:flex-col max-[809px]:gap-8 max-[809px]:p-5"
              style={{ background: "var(--card)", borderRadius: 24 }}
            >
              {/* copy column */}
              <div className="flex h-full p-4 min-w-0 flex-1 flex-col items-start justify-between gap-10 max-[1199px]:h-auto max-[1199px]:w-full max-[1199px]:flex-none">
                <div className="flex w-full flex-col items-start gap-5">
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
                className="relative h-[550px] w-[660px] max-w-full flex-none overflow-hidden max-[1199px]:w-full max-[809px]:h-[340px]"
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
