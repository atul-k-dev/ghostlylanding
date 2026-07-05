"use client";
import React from "react";
import { motion } from "framer-motion";

type Feature = {
  title: string;
  desc: string;
  accent: string; // hex, e.g. "#a855f7" — drives the card's color
  badge: string;
  badgeIcon: React.ReactNode;
  icon: React.ReactNode;
};

const mk = (size: number, paths: React.ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {paths}
  </svg>
);
const icon = (paths: React.ReactNode) => mk(24, paths);
const bico = (paths: React.ReactNode) => mk(12, paths);

// Badge glyphs
const SHIELD = bico(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />);
const STAR = bico(
  <polygon points="12 2 15 8.2 22 9.3 17 14.1 18.2 21 12 17.8 5.8 21 7 14.1 2 9.3 9 8.2" />,
);
const SPARKLE = bico(<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" />);
const TREND = bico(
  <>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </>,
);
const TARGET = bico(
  <>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4" />
  </>,
);
const ZAP = bico(<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />);
const BOOKMARK = bico(<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />);
const CALENDAR = bico(
  <>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </>,
);
const PENCIL = bico(<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />);
const MAIL = bico(
  <>
    <rect x="3" y="5" width="18" height="14" rx="2" />
    <path d="m3 7 9 6 9-6" />
  </>,
);
const LOCK = bico(
  <>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </>,
);

const FEATURES: Feature[] = [
  {
    title: "Human Pacing",
    desc: "Random delays keep your account safe and natural.",
    accent: "#fb7185",
    badge: "Safe",
    badgeIcon: SHIELD,
    icon: icon(
      <>
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 14" />
      </>,
    ),
  },
  {
    title: "Auto-Like",
    desc: "Likes the posts that fit your intent.",
    accent: "#f43f5e",
    badge: "Smart",
    badgeIcon: STAR,
    icon: icon(
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l7.84-7.84a5.5 5.5 0 0 0 0-7.78z" />,
    ),
  },
  {
    title: "AI Replies",
    desc: "Tone-matched replies, written just for you.",
    accent: "#a855f7",
    badge: "AI-Powered",
    badgeIcon: SPARKLE,
    icon: icon(
      <>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
        <path d="M8.5 12h.01M12 12h.01M15.5 12h.01" />
      </>,
    ),
  },
  {
    title: "Follow-Back",
    desc: "Follows back your new followers.",
    accent: "#f59e0b",
    badge: "Growth",
    badgeIcon: TREND,
    icon: icon(
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="m17 11 2 2 4-4" />
      </>,
    ),
  },
  {
    title: "Auto-Follow",
    desc: "Follows the right creators that match your vibe.",
    accent: "#22c55e",
    badge: "Smart",
    badgeIcon: TARGET,
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
    title: "Repost",
    desc: "Amplifies posts worth sharing.",
    accent: "#3b82f6",
    badge: "Engage",
    badgeIcon: ZAP,
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
    title: "Bookmark",
    desc: "Quietly saves great posts for later.",
    accent: "#eab308",
    badge: "Save",
    badgeIcon: BOOKMARK,
    icon: icon(<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />),
  },
  {
    title: "Schedule Posts",
    desc: "Draft & schedule original posts with AI.",
    accent: "#8b5cf6",
    badge: "Plan",
    badgeIcon: CALENDAR,
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
    title: "Quote-Tweet",
    desc: "Your take, with AI commentary.",
    accent: "#06b6d4",
    badge: "Create",
    badgeIcon: PENCIL,
    icon: icon(
      <>
        <path d="M10 11H7a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6c0 2-1 3-3 4" />
        <path d="M20 11h-3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v6c0 2-1 3-3 4" />
      </>,
    ),
  },
  {
    title: "Kill Switch",
    desc: "One tap pauses everything instantly.",
    accent: "#ef4444",
    badge: "Control",
    badgeIcon: SHIELD,
    icon: icon(
      <>
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
        <line x1="12" y1="2" x2="12" y2="12" />
      </>,
    ),
  },
  {
    title: "Daily Recap",
    desc: "An end-of-day email of every action.",
    accent: "#14b8a6",
    badge: "Insight",
    badgeIcon: MAIL,
    icon: icon(
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </>,
    ),
  },
  {
    title: "In Your Browser",
    desc: "Runs as you — no credentials collected.",
    accent: "#3b82f6",
    badge: "Private",
    badgeIcon: LOCK,
    icon: icon(
      <>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <line x1="2" y1="9" x2="22" y2="9" />
        <circle cx="5.5" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
        <circle cx="8" cy="6.5" r="0.6" fill="currentColor" stroke="none" />
      </>,
    ),
  },
];

const CHEVRON = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="m9 18 6-6-6-6" />
  </svg>
);

function Card({ f }: { f: Feature }) {
  const a = f.accent;
  return (
    <div
      className="group relative overflow-hidden rounded-2xl border p-4 pl-5 transition-colors duration-300"
      style={{ borderColor: `${a}26`, background: "#0d0d0f" }}
    >
      {/* soft colored glow behind the icon */}
      <span
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(150px 100px at 14% 24%, ${a}22, transparent 70%)` }}
      />
      {/* left accent bar */}
      <span
        className="absolute left-0 inset-y-3 w-1 rounded-r-full"
        style={{ background: a, boxShadow: `0 0 12px ${a}88` }}
      />

      <div className="relative flex gap-3.5">
        <div
          className="flex h-12 w-12 flex-none items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-105"
          style={{
            background: `linear-gradient(135deg, ${a}38, ${a}0d)`,
            border: `1px solid ${a}33`,
            color: a,
            boxShadow: `0 0 18px -6px ${a}77`,
          }}
        >
          {f.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-[15px] font-semibold leading-tight text-fg">{f.title}</h3>
            <span
              className="flex flex-none items-center gap-1 rounded-full border bg-white/[0.03] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ borderColor: `${a}55`, color: a }}
            >
              {f.badgeIcon}
              {f.badge}
            </span>
          </div>
          <p className="mt-1 pr-9 text-[13px] leading-snug text-muted-fg">{f.desc}</p>
        </div>
      </div>

      {/* chevron */}
      <span className="absolute bottom-3.5 right-3 flex h-7 w-7 items-center justify-center rounded-full border border-white/10 bg-white/5 text-muted-fg transition-colors duration-300 group-hover:text-fg">
        {CHEVRON}
      </span>
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
      <div className="grid h-full grid-cols-2 gap-3 px-2.5 py-4 md:px-3 lg:px-4">
        <div className="overflow-hidden">
          <Column items={col1} direction="down" duration={38} />
        </div>
        <div className="overflow-hidden">
          <Column items={col2} direction="up" duration={44} />
        </div>
      </div>
      {/* Fade the columns into the section background, top and bottom. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-24 bg-linear-to-b from-bg to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-24 bg-linear-to-t from-bg to-transparent" />
    </div>
  );
}

export default FeatureShowcase;
