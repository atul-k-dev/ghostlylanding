"use client";

import { MEDIA } from "@/lib/media";
import { ACTION_ICONS } from "./action-icons";
import { Reveal } from "./motion-primitives";
import { Section, SectionHead, Shell } from "./kit";

const ACTIONS = [
  {
    key: "like" as const,
    label: "Like",
    body: "Fresh posts that match your keywords.",
    tint: "var(--pink)",
  },
  {
    key: "reply" as const,
    label: "Reply",
    body: "AI-written, in your trained voice.",
    tint: "var(--lime)",
  },
  {
    key: "follow" as const,
    label: "Follow",
    body: "Authors worth knowing, plus follow-backs.",
    tint: "var(--violet)",
  },
  {
    key: "bookmark" as const,
    label: "Bookmark",
    body: "Quietly saved for you to read later.",
    tint: "var(--lime-soft)",
  },
  {
    key: "repost" as const,
    label: "Repost",
    body: "Amplify the posts that fit your topic.",
    tint: "var(--pink)",
  },
  {
    key: "quote" as const,
    label: "Quote",
    body: "A short take of your own on top.",
    tint: "var(--violet)",
  },
];

export function EngagementActions() {
  return (
    <Section id="features" className="max-w-[1500px]">
      <Shell className="flex flex-col items-center gap-2">
        <SectionHead
          eyebrow="Six actions"
          title="One tab, scrolling your real timeline"
          body="Ghostly opens a single tab, scrolls your feed like a person would, and acts in place — no scraping, no second account, no headless server."
        />

        <div className="grid w-full grid-cols-3 gap-1.5 max-[1023px]:grid-cols-2 max-[639px]:grid-cols-1 mt-10 max-w-[1400px]">
          {ACTIONS.map((a, i) => {
            const Icon = ACTION_ICONS[a.key];
            return (
              <Reveal key={a.key} delay={i * 0.05}>
                <div
                  className="group flex h-full items-start gap-4 p-6 transition-colors"
                  style={{
                    background: "var(--card)",
                    borderRadius: 24,
                  }}
                >
                  <span
                    className="grid size-12 flex-none place-items-center  rounded-2xl transition-transform duration-300 group-hover:-rotate-6"
                    style={{ background: a.tint, color: "var(--ink)" }}
                  >
                    <Icon />
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="t-h5" style={{ color: "var(--ink)" }}>
                      {a.label}
                    </h3>
                    <p className="t-body" style={{ color: "var(--zinc)" }}>
                      {a.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>

        {/* every action, logged */}
        <Reveal className="w-full">
          <div
            className="flex w-full bg-white items-center gap-10 overflow-hidden p-4 pl-8 max-[1023px]:flex-col max-[1023px]:p-6"
            style={{ borderRadius: 32 }}
          >
            <div className="flex min-w-0 flex-1 flex-col items-start gap-4">
              <h3 className="t-h3" style={{ color: "var(--ink)" }}>
                Every action, written down
              </h3>
              <p
                className="t-body max-w-[520px]"
                style={{ color: "var(--zinc)" }}
              >
                Each like, reply, follow, bookmark, repost and quote lands in the
                activity log with a timestamp, the target, and whether it
                succeeded. There is no silent activity anywhere in the product —
                if Ghostly did it, you can see it.
              </p>
            </div>

            <div className="min-w-0 flex-1 max-[1023px]:w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={MEDIA.activityLog}
                alt="Activity log listing recent actions with status and timestamps"
                className="block h-auto w-full"
                style={{ borderRadius: 16, boxShadow: "var(--shadow-card)" }}
              />
            </div>
          </div>
        </Reveal>
      </Shell>
    </Section>
  );
}
