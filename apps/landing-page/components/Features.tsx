"use client";
import React from "react";
import { motion } from "framer-motion";

/* ------------------------------------------------------------------ icons -- */
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

const I = {
  reply: (
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8z" />
  ),
  heart: (
    <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l7.84-7.84a5.5 5.5 0 0 0 0-7.78z" />
  ),
  userPlus: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </>
  ),
  userCheck: (
    <>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="m17 11 2 2 4-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </>
  ),
  repeat: (
    <>
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  penSquare: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" />
    </>
  ),
  check: <path d="m5 12 5 5L20 7" />,
  arrowDown: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <polyline points="19 12 12 19 5 12" />
    </>
  ),
  trend: (
    <>
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </>
  ),
};

/* ------------------------------------------------------- shared mockup UI -- */
function VisualFrame({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute -inset-6 rounded-[2.5rem] opacity-70 blur-3xl"
        style={{ background: `radial-gradient(closest-side, ${accent}22, transparent)` }}
      />
      <div className="relative overflow-hidden rounded-xl border border-border bg-card/40 p-5 backdrop-blur-sm md:p-7">
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: `radial-gradient(340px 220px at 80% 0%, ${accent}14, transparent 70%)` }}
        />
        <div className="relative">{children}</div>
      </div>
    </div>
  );
}

const bar = (w: string, o = 0.1) => (
  <div className="h-2.5 rounded-full" style={{ width: w, background: `rgba(255,255,255,${o})` }} />
);

function Avatar({ accent, size = 40 }: { accent: string; size?: number }) {
  return (
    <div
      className="flex-none rounded-full"
      style={{ width: size, height: size, background: `${accent}33` }}
    />
  );
}

function Chip({ children, accent }: { children: React.ReactNode; accent: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
      style={{ borderColor: `${accent}55`, color: accent, background: `${accent}14` }}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------- 8 visuals -- */
function VAiReplies(accent: string) {
  return (
    <VisualFrame accent={accent}>
      <div className="rounded-lg border border-border bg-bg/70 p-4">
        <div className="flex items-center gap-3">
          <Avatar accent={accent} />
          <div className="space-y-1.5">
            <div className="h-2.5 w-28 rounded-full bg-white/20" />
            <div className="h-2 w-16 rounded-full bg-white/10" />
          </div>
        </div>
        <p className="mt-3 text-sm text-fg/90">just shipped my first SaaS after 6 months 🎉</p>
      </div>
      <div
        className="mt-3 ml-6 rounded-lg border p-4"
        style={{ borderColor: `${accent}40`, background: `${accent}0d` }}
      >
        <div className="mb-2 flex items-center gap-2">
          <Chip accent={accent}>✦ AI reply</Chip>
          <Chip accent={accent}>Friendly</Chip>
        </div>
        <p className="text-sm text-fg/90">
          six months of nights &amp; weekends — that grind shows. huge congrats 🙌
        </p>
        <div className="mt-2 text-[11px] font-semibold text-emerald-400">Posted ✓</div>
      </div>
    </VisualFrame>
  );
}

function VAutoLike(accent: string) {
  return (
    <VisualFrame accent={accent}>
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-bg/60 p-3">
            <Avatar accent={accent} size={36} />
            <div className="flex-1 space-y-1.5">
              {bar("70%", 0.16)}
              {bar("45%", 0.09)}
            </div>
            <span style={{ color: accent }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill={i < 2 ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.9">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 1 0-7.78 7.78L12 21.23l7.84-7.84a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4">
        <Chip accent={accent}>24 posts liked today</Chip>
      </div>
    </VisualFrame>
  );
}

function VAutoFollow(accent: string) {
  const rows = [
    { following: true },
    { following: false },
    { following: false },
  ];
  return (
    <VisualFrame accent={accent}>
      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-bg/60 p-3">
            <Avatar accent={accent} size={36} />
            <div className="flex-1 space-y-1.5">
              {bar("60%", 0.18)}
              {bar("40%", 0.09)}
            </div>
            {r.following ? (
              <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
                Following ✓
              </span>
            ) : (
              <span
                className="rounded-full px-3.5 py-1 text-[11px] font-semibold text-black"
                style={{ background: accent }}
              >
                Follow
              </span>
            )}
          </div>
        ))}
      </div>
      <div
        className="mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold"
        style={{ borderColor: `${accent}44`, color: accent, background: `${accent}12` }}
      >
        {mk(14, I.trend)}
        Matched to your niche
      </div>
    </VisualFrame>
  );
}

function VFollowBack(accent: string) {
  return (
    <VisualFrame accent={accent}>
      <div className="rounded-lg border border-border bg-bg/70 p-4">
        <div className="flex items-center gap-3">
          <Avatar accent={accent} />
          <div className="space-y-1.5">
            <div className="h-2.5 w-24 rounded-full bg-white/20" />
            <p className="text-xs text-muted-fg">started following you</p>
          </div>
        </div>
        <div className="my-3 flex justify-center" style={{ color: accent }}>
          {mk(20, I.arrowDown)}
        </div>
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3 text-emerald-400">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
            {I.check}
          </svg>
          <span className="text-sm font-semibold">Followed back — just now</span>
        </div>
      </div>
      <div className="mt-4">
        <Chip accent={accent}>12 followed back today</Chip>
      </div>
    </VisualFrame>
  );
}

function VSchedule(accent: string) {
  return (
    <VisualFrame accent={accent}>
      <div className="rounded-lg border border-border bg-bg/70 p-4">
        <div className="mb-3">
          <Chip accent={accent}>✦ AI drafted</Chip>
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-fg/90">
          {"3 reasons to schedule your posts:\n\n• Stay consistent on busy days\n• Batch ideas while you're in flow\n• Stop breaking focus to post"}
        </p>
        <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
          <div className="flex items-center gap-2 text-xs text-muted-fg">
            <span style={{ color: accent }}>{mk(15, I.calendar)}</span>
            Post on · Jul 12
          </div>
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-semibold text-emerald-400">
            Scheduled ✓
          </span>
        </div>
      </div>
    </VisualFrame>
  );
}

function VRepost(accent: string) {
  return (
    <VisualFrame accent={accent}>
      <div className="rounded-lg border border-border bg-bg/70 p-4">
        <div className="mb-2 flex items-center gap-2">
          <Chip accent={accent}>✦ AI quote</Chip>
        </div>
        <p className="text-sm text-fg/90">the cleanest take on shipping fast i&apos;ve seen 👇</p>
        {/* embedded original post */}
        <div className="mt-3 rounded-lg border border-border bg-bg/60 p-3">
          <div className="flex items-center gap-2">
            <Avatar accent={accent} size={26} />
            <div className="h-2 w-20 rounded-full bg-white/20" />
          </div>
          <div className="mt-2 space-y-1.5">
            {bar("100%", 0.1)}
            {bar("75%", 0.1)}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 text-xs font-semibold" style={{ color: accent }}>
          {mk(15, I.repeat)}
          Reposted + Quoted
        </div>
      </div>
    </VisualFrame>
  );
}

function VRecap(accent: string) {
  const stats: [string, string][] = [
    ["Likes", "24"],
    ["Replies", "6"],
    ["Follows", "5"],
    ["Bookmarks", "3"],
    ["Reposts", "2"],
    ["Quotes", "1"],
  ];
  return (
    <VisualFrame accent={accent}>
      <div className="grid grid-cols-3 gap-2.5">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border bg-bg/60 p-3 text-center">
            <div className="text-xl font-bold text-fg">{value}</div>
            <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-fg">{label}</div>
          </div>
        ))}
      </div>
      <div
        className="mt-4 flex items-center gap-3 rounded-lg border p-4"
        style={{ borderColor: `${accent}40`, background: `${accent}0d` }}
      >
        <div
          className="flex h-10 w-10 flex-none items-center justify-center rounded-lg"
          style={{ background: `${accent}22`, color: accent }}
        >
          {mk(20, I.mail)}
        </div>
        <div>
          <p className="text-sm font-semibold text-fg">Your daily recap — 41 actions</p>
          <p className="text-xs text-muted-fg">Delivered to your inbox this morning</p>
        </div>
      </div>
    </VisualFrame>
  );
}

function VCreatePost(accent: string) {
  return (
    <VisualFrame accent={accent}>
      <div className="rounded-lg border border-border bg-bg/70 p-4">
        <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-fg">Describe your post</p>
        <div className="rounded-lg border border-border bg-white/5 px-3 py-2 text-sm text-fg/80">
          why I stopped using keyword filters
        </div>
        <div className="mt-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-black"
            style={{ background: accent }}
          >
            ✦ Draft with AI
          </span>
        </div>
      </div>
      <div
        className="mt-3 rounded-lg border p-4"
        style={{ borderColor: `${accent}40`, background: `${accent}0d` }}
      >
        <div className="mb-2">
          <Chip accent={accent}>✦ Generated</Chip>
        </div>
        <p className="whitespace-pre-line text-sm leading-relaxed text-fg/90">
          {"Keyword filters miss the point.\n\nWhat changed for me:\n• context beats keywords\n• fewer, better replies\n• it finally feels human"}
        </p>
        <div className="mt-3 flex items-center justify-between text-[11px]">
          <span className="font-semibold" style={{ color: accent }}>
            Formatted ✓
          </span>
          <span className="text-muted-fg">198 / 280</span>
        </div>
      </div>
    </VisualFrame>
  );
}

/* --------------------------------------------------------------- 8 rows -- */
type Feature = {
  badge: string;
  accent: string;
  title: string;
  desc: string;
  points: string[];
  icon: React.ReactNode;
  visual: (accent: string) => React.ReactNode;
};

const FEATURES: Feature[] = [
  {
    badge: "Content",
    accent: "#f44d60",
    title: "Create Post",
    desc: "Turn a one-line idea into a polished, on-brand post — AI writes it, cleanly formatted and ready to go.",
    points: [
      "Describe it in a line — AI writes the post",
      "Clean formatting with bullets & line breaks",
      "Add a link or image, then post or schedule",
    ],
    icon: I.penSquare,
    visual: VCreatePost,
  },
  {
    badge: "Content",
    accent: "#8b5cf6",
    title: "Schedule Posts",
    desc: "Pick a day and Ghostly publishes it through your own browser — queue up to five posts at once.",
    points: [
      "Schedule by day, hands-off",
      "Up to 5 posts queued at once",
      "Publishes even while the engine is paused",
    ],
    icon: I.calendar,
    visual: VSchedule,
  },
  {
    badge: "Engagement",
    accent: "#f43f5e",
    title: "Auto-Like",
    desc: "Likes the posts that genuinely fit your interests, on a natural cadence that keeps your account safe.",
    points: [
      "Only posts that match your keywords & intent",
      "Human-like pacing with random delays",
      "Age-aware daily caps built in",
    ],
    icon: I.heart,
    visual: VAutoLike,
  },
  {
    badge: "Engagement",
    accent: "#06b6d4",
    title: "AI Replies",
    desc: "Every reply is written in your voice and reacts to the actual post — thoughtful and human, never copy-paste.",
    points: [
      "Matches your tone — friendly, witty, or pro",
      "Reacts to the real post, never generic",
      "Safety-checked before anything posts",
    ],
    icon: I.reply,
    visual: VAiReplies,
  },
  {
    badge: "Growth",
    accent: "#22c55e",
    title: "Auto-Follow",
    desc: "Finds and follows the right creators and their audiences, so the people who matter discover you.",
    points: [
      "Targets creators and their followers",
      "Follows people who match your niche",
      "Whitelist anyone you never want followed",
    ],
    icon: I.userPlus,
    visual: VAutoFollow,
  },
  {
    badge: "Growth",
    accent: "#f59e0b",
    title: "Follow-Back",
    desc: "Automatically follows back everyone who follows you — whitelist-aware and paced to stay natural.",
    points: [
      "Follows back new followers automatically",
      "Whitelist-aware and capped per day",
      "Runs on a gentle, natural cadence",
    ],
    icon: I.userCheck,
    visual: VFollowBack,
  },
  {
    badge: "Amplify",
    accent: "#3b82f6",
    title: "Repost & Quote",
    desc: "Amplify the posts worth sharing, or add your own AI-written take with a quote-tweet — all on autopilot.",
    points: [
      "Amplify posts worth sharing",
      "Add your own AI-written take",
      "Bounded by your daily limits",
    ],
    icon: I.repeat,
    visual: VRepost,
  },
  {
    badge: "Insight",
    accent: "#14b8a6",
    title: "Daily Recap",
    desc: "A beautiful end-of-day email of everything Ghostly did — read the AI replies that went out and stay in control.",
    points: [
      "Every action, summarized each evening",
      "Read the AI replies that went out",
      "One-click unsubscribe anytime",
    ],
    icon: I.mail,
    visual: VRecap,
  },
];

/* ---------------------------------------------------------------- render -- */
function FeatureRow({ f, flip }: { f: Feature; flip: boolean }) {
  const a = f.accent;
  const text = (
    <div className={flip ? "md:order-2" : ""}>
      <span
        className="inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.12em]"
        style={{ borderColor: `${a}44`, color: a, background: `${a}12` }}
      >
        {f.badge}
      </span>
      <div className="mt-6 flex items-center gap-4">
        <div
          className="flex h-14 w-14 flex-none items-center justify-center rounded-lg border"
          style={{ borderColor: `${a}30`, background: `${a}14`, color: a, boxShadow: `0 0 26px -8px ${a}77` }}
        >
          {mk(26, f.icon)}
        </div>
        <h3 className="text-2xl font-bold tracking-tight text-fg md:text-4xl">{f.title}</h3>
      </div>
      <p className="mt-5 max-w-md leading-relaxed text-muted-fg md:text-lg">{f.desc}</p>
      <ul className="mt-6 space-y-3">
        {f.points.map((p) => (
          <li key={p} className="flex items-center gap-3 text-sm text-fg/80 md:text-[15px]">
            <span
              className="flex h-5 w-5 flex-none items-center justify-center rounded-full"
              style={{ background: `${a}22`, color: a }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                {I.check}
              </svg>
            </span>
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
  const visual = <div className={flip ? "md:order-1" : ""}>{f.visual(a)}</div>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="grid items-center gap-10 md:grid-cols-2 md:gap-16"
    >
      {text}
      {visual}
    </motion.div>
  );
}

export function Features() {
  return (
    <section id="features" className="relative bg-bg px-6 py-20 md:px-10 md:py-28 lg:px-16">
      <div className="mx-auto mb-16 max-w-2xl text-center md:mb-24">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-accent">Features</span>
        <h2 className="mt-4 text-3xl font-bold tracking-tight text-fg md:text-5xl">
          Everything you need to grow on X
        </h2>
        <p className="mt-4 text-muted-fg md:text-lg">
          Eight ways Ghostly247 works for you — engaging, growing, posting, and keeping you safe,
          all on autopilot.
        </p>
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-20 md:gap-28">
        {FEATURES.map((f, i) => (
          <FeatureRow key={f.title} f={f} flip={i % 2 === 1} />
        ))}
      </div>
    </section>
  );
}

export default Features;
