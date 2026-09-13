"use client";

import { MEDIA } from "@/lib/media";
import { ACTION_ICONS } from "./action-icons";
import { Reveal } from "./motion-primitives";
import { Section, SectionHead, Shell } from "./kit";

const ACTIONS = [
  {
    key: "like" as const,
    label: "Like",
    body: "New posts about your topics.",
    tint: "var(--pink)",
  },
  {
    key: "reply" as const,
    label: "Reply",
    body: "Short, real replies in your voice.",
    tint: "var(--lime)",
  },
  {
    key: "follow" as const,
    label: "Follow",
    body: "People likely to follow you back.",
    tint: "var(--violet)",
  },
  {
    key: "bookmark" as const,
    label: "Bookmark",
    body: "Save good posts to read later.",
    tint: "var(--lime-soft)",
  },
  {
    key: "repost" as const,
    label: "Repost",
    body: "Share great posts with your followers.",
    tint: "var(--pink)",
  },
  {
    key: "quote" as const,
    label: "Quote",
    body: "Repost with your own take on top.",
    tint: "var(--violet)",
  },
  {
    key: "autopost" as const,
    label: "Auto-post",
    body: "Writes posts for you and shares them at the best time.",
    tint: "var(--pink)",
  },
  {
    key: "search" as const,
    label: "Real-time search",
    body: "Finds fresh posts about your topics across all of X.",
    tint: "var(--lime)",
  },
  {
    key: "mentions" as const,
    label: "Answer mentions",
    body: "Replies to people who reply to or mention you.",
    tint: "var(--violet)",
  },
  {
    key: "schedule" as const,
    label: "Schedule posts",
    body: "Plan your week. Posts go out right on time.",
    tint: "var(--lime-soft)",
  },
  {
    key: "followback" as const,
    label: "Follow back",
    body: "Follows back your new followers automatically.",
    tint: "var(--pink)",
  },
  {
    key: "early" as const,
    label: "Early replies",
    body: "Replies first on new posts from creators you pick.",
    tint: "var(--violet)",
  },
];

export function EngagementActions() {
  return (
    <Section id="features" className="max-w-[1500px]">
      <Shell className="flex flex-col items-center gap-2">
        <SectionHead
          eyebrow="What it does"
          title="Everything you'd do on X, done for you"
          body="Pick what you want Ghostly to do. Turn the rest off."
        />

        <div className="grid w-full grid-cols-3 gap-1.5 max-[1023px]:grid-cols-2 max-[639px]:grid-cols-1 mt-8 sm:mt-10 max-w-[1400px]">
          {ACTIONS.map((a, i) => {
            const Icon = ACTION_ICONS[a.key];
            return (
              <Reveal key={a.key} delay={i * 0.05}>
                <div
                  className="group flex h-full items-start gap-4 p-5 sm:p-6 transition-colors"
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
            className="flex w-full bg-white items-center gap-10 overflow-hidden p-4 pl-8 max-[1023px]:flex-col max-[1023px]:items-stretch max-[1023px]:gap-6 max-[1023px]:p-6 max-[639px]:p-4"
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
                See every like, reply and follow Ghostly made — who it was for,
                and when it happened. If Ghostly did it, you can see it.
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
