import { GhostMascot } from "./GhostMascot";

type Tweet = {
  name: string;
  handle: string;
  body: string;
};

type FeedItem =
  | {
      kind: "like";
      tweet: Tweet;
      /** If set, the heart animates filling on this delay. Otherwise static-liked. */
      animDelay?: string;
      liked?: boolean;
    }
  | {
      kind: "comment";
      tweet: Tweet;
      reply: string;
    }
  | {
      kind: "follow";
      name: string;
      handle: string;
      bio: string;
    };

const FEED: FeedItem[] = [
  {
    kind: "like",
    tweet: {
      name: "Maya Chen",
      handle: "design_dot",
      body: "Just shipped a redesign for our pricing page — small details, 30% lift in conversion.",
    },
    animDelay: "0s",
  },
  {
    kind: "follow",
    name: "Jordan Reyes",
    handle: "jr_builds",
    bio: "Indie founder · building Stillhouse",
  },
  {
    kind: "like",
    tweet: {
      name: "Sara Lindgren",
      handle: "writes_now",
      body: "The longer I write, the more I trust short sentences.",
    },
    liked: true,
  },
  {
    kind: "comment",
    tweet: {
      name: "Priya Sharma",
      handle: "coach_priya",
      body: "Confidence isn't loud. It's the quiet kind that doesn't need to convince anyone.",
    },
    reply: "Love this — quiet confidence is what makes coaching actually land.",
  },
  {
    kind: "like",
    tweet: {
      name: "Alex Park",
      handle: "founder_alex",
      body: "Best growth hack? Make something people actually need.",
    },
    animDelay: "3s",
  },
  {
    kind: "follow",
    name: "Tom Whitford",
    handle: "tom_writes",
    bio: "Freelance writer · loves serial commas",
  },
];

function HeartIcon({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      style={style}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 14 C2 9 0 6 3 3 C5 1 7 3 8 5 C9 3 11 1 13 3 C16 6 14 9 8 14 Z" />
    </svg>
  );
}

function ReplyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 6.5 C2 4 4 2.5 6 2.5 H10 C12 2.5 14 4 14 6.5 C14 9 12 10.5 10 10.5 H6 L3 13 V10.5 C2.5 10 2 9 2 6.5 Z" />
    </svg>
  );
}

function RepostIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6 V4 H11 L9 2 M3 6 L5 8 M13 10 V12 H5 L7 14 M13 10 L11 8" />
    </svg>
  );
}

function SparkleIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8 0 L9 7 L16 8 L9 9 L8 16 L7 9 L0 8 L7 7 Z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 1.5 V 10.5 M 1.5 6 H 10.5" />
    </svg>
  );
}

/* ---------------- Per-item renderers ---------------- */

function TweetHeader({ name, handle }: { name: string; handle: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="h-9 w-9 flex-none rounded-full bg-gradient-to-br from-cream/35 to-cream/10" />
      <div className="flex-1 leading-tight">
        <div className="text-[12px] font-semibold text-cream">{name}</div>
        <div className="text-[11px] text-cream/45">@{handle} · 2m</div>
      </div>
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5 text-cream/40"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    </div>
  );
}

function LikeCard({
  tweet,
  animDelay,
  liked,
}: {
  tweet: Tweet;
  animDelay?: string;
  liked?: boolean;
}) {
  const isAnimating = animDelay !== undefined;
  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-ink-soft/95 p-3.5 backdrop-blur md:p-4 ${
        isAnimating
          ? "border-coral/40 shadow-[0_10px_30px_rgba(184,19,54,0.18)]"
          : "border-cream/10"
      }`}
    >
      {isAnimating && (
        <ActionBanner
          icon={<HeartIcon className="h-2.5 w-2.5" />}
          label="Casper liked this post"
        />
      )}
      <TweetHeader name={tweet.name} handle={tweet.handle} />
      <p className="mt-2.5 text-[12px] leading-snug text-cream/85 md:text-[13px]">
        {tweet.body}
      </p>
      <div className="mt-3 flex items-center justify-between text-cream/45">
        <div className="flex items-center gap-1.5">
          <ReplyIcon className="h-3.5 w-3.5" />
          <span className="text-[10px]">12</span>
        </div>
        <div className="flex items-center gap-1.5">
          <RepostIcon className="h-3.5 w-3.5" />
          <span className="text-[10px]">4</span>
        </div>
        <div className="relative flex items-center gap-1.5">
          {isAnimating ? (
            <>
              <HeartIcon
                className="hv-heart-like h-3.5 w-3.5"
                style={{ animationDelay: animDelay } as React.CSSProperties}
              />
              <span
                className="hv-plus-one absolute -right-5 -top-1 font-display text-[9px] tracking-wider text-coral"
                style={{ animationDelay: animDelay } as React.CSSProperties}
              >
                +1
              </span>
            </>
          ) : (
            <HeartIcon
              className={`h-3.5 w-3.5 ${liked ? "text-coral" : "text-cream/30"}`}
            />
          )}
          <span className="text-[10px]">{liked || isAnimating ? "1.2k" : "1.1k"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <svg
            viewBox="0 0 16 16"
            className="h-3.5 w-3.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M2 14 L2 4 L8 8 L14 4 L14 14 Z" />
          </svg>
          <span className="text-[10px]">8.4k</span>
        </div>
      </div>
    </article>
  );
}

function ActionBanner({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="-mx-3.5 -mt-3.5 mb-3 flex items-center gap-2 rounded-t-2xl border-b border-coral/30 bg-coral/15 px-3.5 py-2 md:-mx-4 md:-mt-4 md:px-4">
      <span className="hv-pulse inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-coral text-cream">
        {icon}
      </span>
      <span className="text-[10px] font-bold uppercase tracking-wider text-coral">
        {label}
      </span>
      <span className="ml-auto text-[9px] text-coral/70">just now</span>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2.5 6 L5 8.5 L9.5 4" />
    </svg>
  );
}

function CommentCard({
  tweet,
  reply,
}: {
  tweet: Tweet;
  reply: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-coral/40 bg-ink-soft/95 p-3.5 shadow-[0_10px_30px_rgba(184,19,54,0.18)] backdrop-blur md:p-4">
      <ActionBanner
        icon={<ReplyIcon className="h-2.5 w-2.5" />}
        label="Casper replied for you"
      />

      <TweetHeader name={tweet.name} handle={tweet.handle} />
      <p className="mt-2.5 text-[12px] leading-snug text-cream/85 md:text-[13px]">
        {tweet.body}
      </p>

      {/* AI-drafted reply */}
      <div className="mt-3 rounded-xl rounded-tl-sm border border-coral/35 bg-coral/[0.10] p-3">
        <div className="mb-1.5 flex items-center justify-between gap-1.5 text-[9px] font-semibold uppercase tracking-wider text-coral">
          <span className="flex items-center gap-1.5">
            <SparkleIcon className="h-2.5 w-2.5" />
            Drafted in your tone
          </span>
          {/* Typing dots */}
          <span className="flex items-center gap-0.5">
            <span className="hv-typing inline-block h-1 w-1 rounded-full bg-coral" />
            <span className="hv-typing-2 inline-block h-1 w-1 rounded-full bg-coral" />
            <span className="hv-typing-3 inline-block h-1 w-1 rounded-full bg-coral" />
          </span>
        </div>
        <p className="text-[11px] leading-snug text-cream/90 md:text-[12px]">
          &ldquo;{reply}&rdquo;
        </p>
        <div className="mt-2 flex items-center gap-1.5">
          <button
            type="button"
            className="rounded-full bg-coral px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cream"
          >
            Post
          </button>
          <button
            type="button"
            className="rounded-full border border-cream/25 px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-cream/60"
          >
            Edit
          </button>
        </div>
      </div>
    </article>
  );
}

function FollowCard({
  name,
  handle,
  bio,
}: {
  name: string;
  handle: string;
  bio: string;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-coral/40 bg-ink-soft/95 p-3.5 shadow-[0_10px_30px_rgba(184,19,54,0.18)] backdrop-blur md:p-4">
      <ActionBanner
        icon={<PlusIcon className="h-2.5 w-2.5" />}
        label="Casper followed someone new"
      />

      <div className="flex items-center gap-2.5">
        <div className="h-10 w-10 flex-none rounded-full bg-gradient-to-br from-cream/35 to-cream/10" />
        <div className="flex-1 min-w-0 leading-tight">
          <div className="truncate text-[12px] font-semibold text-cream">
            {name}
          </div>
          <div className="text-[11px] text-cream/45">@{handle}</div>
          <div className="mt-0.5 truncate text-[10px] text-cream/60">{bio}</div>
        </div>

        {/* Animated +Follow → ✓ Following toggle */}
        <div className="relative h-7 w-[88px] flex-none">
          <button
            type="button"
            className="hv-follow-pre absolute inset-0 flex items-center justify-center gap-1 rounded-full border border-coral/60 bg-transparent text-[10px] font-bold text-coral"
          >
            <PlusIcon className="h-2.5 w-2.5" />
            Follow
          </button>
          <button
            type="button"
            className="hv-follow-post absolute inset-0 flex items-center justify-center gap-1 rounded-full bg-coral text-[10px] font-bold text-cream shadow-[0_4px_14px_rgba(184,19,54,0.45)]"
          >
            <CheckIcon className="h-2.5 w-2.5" />
            Following
          </button>
        </div>
      </div>
    </article>
  );
}

function FeedRow({ item }: { item: FeedItem }) {
  if (item.kind === "like") {
    return (
      <LikeCard
        tweet={item.tweet}
        animDelay={item.animDelay}
        liked={item.liked}
      />
    );
  }
  if (item.kind === "comment") {
    return <CommentCard tweet={item.tweet} reply={item.reply} />;
  }
  return <FollowCard name={item.name} handle={item.handle} bio={item.bio} />;
}

/* ---------------- Main component ---------------- */

/**
 * Right-side hero visual: a small browser-framed Twitter feed that
 * auto-scrolls vertically. Casper "likes" posts (animated hearts), drafts
 * AI replies in the user's tone, and auto-follows relevant creators —
 * all three core actions visible in one demo.
 */
export function HeroVisual() {
  // Duplicate items for a seamless infinite scroll loop.
  const loop = [...FEED, ...FEED];

  return (
    <div className="relative mx-auto w-full max-w-[460px] sm:max-w-[500px] lg:max-w-[540px]">
      {/* Soft red glow behind the frame */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 rounded-[36px] opacity-50 blur-3xl"
        style={{
          background:
            "radial-gradient(circle at 50% 40%, #B81336 0%, transparent 65%)",
        }}
      />

      {/* Browser frame */}
      <div className="overflow-hidden rounded-[28px] border border-cream/15 bg-ink shadow-[0_30px_80px_rgba(0,0,0,0.6)]">
        {/* Chrome bar */}
        <div className="flex items-center gap-1.5 border-b border-cream/10 bg-ink-soft px-3.5 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-cream/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-cream/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-cream/15" />
          <div className="ml-3 flex flex-1 items-center gap-2 rounded-md bg-ink/60 px-3 py-1 text-[10px] font-mono text-cream/55">
            <svg
              viewBox="0 0 16 16"
              className="h-3 w-3 text-cream/40"
              fill="currentColor"
              aria-hidden="true"
            >
              <path d="M8 1 a3 3 0 0 0 -3 3 v3 H4 v8 h8 V7 h-1 V4 a3 3 0 0 0 -3 -3 z M6 4 a2 2 0 0 1 4 0 v3 H6 z" />
            </svg>
            x.com/home
          </div>
          <div className="ml-2 flex items-center gap-1.5 rounded-md bg-coral/15 px-1.5 py-1 ring-1 ring-coral/40">
            <GhostMascot className="h-4 w-4" />
            <span className="hv-pulse h-1.5 w-1.5 rounded-full bg-coral" />
          </div>
        </div>

        {/* Feed viewport — masked at top/bottom for fade */}
        <div
          className="relative h-[360px] overflow-hidden md:h-[400px] lg:h-[440px]"
          style={{
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 8%, black 92%, transparent 100%)",
          }}
        >
          <div className="hv-feed-scroll flex flex-col gap-3 px-3.5 py-3 md:gap-3.5 md:px-4">
            {loop.map((item, i) => (
              <FeedRow key={i} item={item} />
            ))}
          </div>
        </div>
      </div>

      {/* Floating Casper extension popup — bottom-right overlay */}
      <div
        className="absolute -bottom-6 -right-3 w-[210px] rounded-2xl border border-coral/40 bg-ink-soft p-3.5 shadow-[0_18px_50px_rgba(184,19,54,0.3)]"
        style={{ transform: "rotate(2.5deg)" }}
      >
        <div className="flex items-center gap-2.5">
          <GhostMascot className="h-7 w-7" />
          <div className="flex-1 leading-tight">
            <div className="text-[11px] font-semibold text-cream">Casper</div>
            <div className="flex items-center gap-1 text-[10px] text-coral">
              <span className="hv-pulse inline-block h-1 w-1 rounded-full bg-coral" />
              Watching
            </div>
          </div>
          <div className="relative h-3.5 w-7 rounded-full bg-coral">
            <div className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full bg-cream" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-1.5 text-center">
          <div className="rounded-md bg-ink/60 py-1.5">
            <div className="font-display text-[11px] text-cream">12</div>
            <div className="text-[8px] uppercase tracking-wider text-cream/45">
              Likes
            </div>
          </div>
          <div className="rounded-md bg-ink/60 py-1.5">
            <div className="font-display text-[11px] text-cream">4</div>
            <div className="text-[8px] uppercase tracking-wider text-cream/45">
              Replies
            </div>
          </div>
          <div className="rounded-md bg-ink/60 py-1.5">
            <div className="font-display text-[11px] text-cream">3</div>
            <div className="text-[8px] uppercase tracking-wider text-cream/45">
              Follows
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
