"use client";
import React from "react";
import { motion } from "framer-motion";

type Feature = { title: string; desc: string; icon: React.ReactNode };

const icon = (paths: React.ReactNode) => (
  <svg
    width="20"
    height="20"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {paths}
  </svg>
);

const FEATURES: Feature[] = [
  {
    title: "AI Replies",
    desc: "Tone-matched replies, written for you",
    icon: icon(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />),
  },
  {
    title: "Auto-Like",
    desc: "Likes the posts that fit your intent",
    icon: icon(
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l7.84-7.84a5.5 5.5 0 0 0 0-7.78z" />,
    ),
  },
  {
    title: "Auto-Follow",
    desc: "Follows the right creators for you",
    icon: icon(
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <line x1="19" y1="8" x2="19" y2="14" />
        <line x1="22" y1="11" x2="16" y2="11" />
      </>,
    ),
  },
  {
    title: "Follow-Back",
    desc: "Follows back your new followers",
    icon: icon(
      <>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>,
    ),
  },
  {
    title: "Bookmark",
    desc: "Quietly saves great posts for later",
    icon: icon(<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />),
  },
  {
    title: "Repost",
    desc: "Amplifies posts worth sharing",
    icon: icon(
      <>
        <polyline points="17 1 21 5 17 9" />
        <path d="M3 11V9a4 4 0 0 1 4-4h14" />
        <polyline points="7 23 3 19 7 15" />
        <path d="M21 13v2a4 4 0 0 1-4 4H3" />
      </>,
    ),
  },
  {
    title: "Quote-Tweet",
    desc: "Your take, with AI commentary",
    icon: icon(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />),
  },
  {
    title: "Schedule Posts",
    desc: "Draft & schedule original posts with AI",
    icon: icon(
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>,
    ),
  },
  {
    title: "Daily Recap",
    desc: "An end-of-day email of every action",
    icon: icon(
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </>,
    ),
  },
  {
    title: "Kill Switch",
    desc: "One tap pauses everything instantly",
    icon: icon(
      <>
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
        <line x1="12" y1="2" x2="12" y2="12" />
      </>,
    ),
  },
  {
    title: "Human Pacing",
    desc: "Random delays keep your account safe",
    icon: icon(
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>,
    ),
  },
  {
    title: "In Your Browser",
    desc: "Runs as you — no credentials collected",
    icon: icon(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />),
  },
];

function Card({ f }: { f: Feature }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-card/40 p-4 backdrop-blur-sm">
      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-accent/10 text-accent">
        {f.icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-tight text-fg">{f.title}</p>
        <p className="mt-1 text-xs leading-snug text-muted-fg">{f.desc}</p>
      </div>
    </div>
  );
}

function Column({
  items,
  direction,
  duration,
}: {
  items: Feature[];
  direction: "up" | "down";
  duration: number;
}) {
  // Duplicate the list so translating by exactly one list-height loops seamlessly.
  const loop = [...items, ...items];
  return (
    <motion.div
      className="flex flex-col gap-4 will-change-transform"
      animate={{ y: direction === "up" ? ["0%", "-50%"] : ["-50%", "0%"] }}
      transition={{ duration, ease: "linear", repeat: Infinity }}
    >
      {loop.map((f, i) => (
        <Card key={`${f.title}-${i}`} f={f} />
      ))}
    </motion.div>
  );
}

/**
 * Right-hero showcase: two columns of feature cards that scroll continuously in
 * opposite directions (left down, right up). Fills its (relative) parent.
 */
export function FeatureShowcase() {
  const col1 = FEATURES.filter((_, i) => i % 2 === 0);
  const col2 = FEATURES.filter((_, i) => i % 2 === 1);
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="grid h-full grid-cols-2 gap-4 px-4 py-4 md:px-6 lg:px-8">
        <div className="overflow-hidden">
          <Column items={col1} direction="down" duration={34} />
        </div>
        <div className="overflow-hidden">
          <Column items={col2} direction="up" duration={40} />
        </div>
      </div>
      {/* Fade the columns into the section background, top and bottom. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-gradient-to-b from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-gradient-to-t from-bg to-transparent" />
    </div>
  );
}

export default FeatureShowcase;
