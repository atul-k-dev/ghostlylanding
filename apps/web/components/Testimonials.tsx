import { Bat } from "./Bat";
import { BloodDrip } from "./BloodDrip";
import { BloodSplatter } from "./BloodSplatter";
import { GhostHeartEyes } from "./GhostHeartEyes";
import { GhostStarEyes } from "./GhostStarEyes";
import { GhostThumbsUp } from "./GhostThumbsUp";
import { Eyeball } from "./stickers/Eyeball";
import { TextSticker } from "./stickers/TextSticker";

type Testimonial = {
  quote: string;
  name: string;
  role: string;
  avatar: string;
  /** Bento grid span classes for md+. */
  span: string;
  featured?: boolean;
};

const TESTIMONIALS: Testimonial[] = [
  // Featured large card — top-left
  {
    quote:
      "Cancelled my LinkedIn auto-comment SaaS the day after I tried Casper. The voice training actually reads my back catalog instead of pretending — every reply lands like I wrote it myself.",
    name: "Maya Chen",
    role: "Brand designer",
    avatar: "https://i.pravatar.cc/120?img=20",
    span: "md:col-span-3 md:row-span-2",
    featured: true,
  },
  {
    quote:
      "I'm not hustle-posting at 11pm anymore. Casper handles it and I sleep. Followers up 38% in two months without lifting a finger.",
    name: "Jordan Reyes",
    role: "Indie founder · @jrbuilds",
    avatar: "https://i.pravatar.cc/120?img=12",
    span: "md:col-span-3",
  },
  {
    quote:
      "Other tools made me feel like I was running a sales floor. Casper feels like a friend handling my DMs while I focus on coaching clients.",
    name: "Priya Sharma",
    role: "Career coach",
    avatar: "https://i.pravatar.cc/120?img=32",
    span: "md:col-span-3",
  },
  {
    quote:
      "Runs in MY browser, not their cloud. Three months in, zero issues. Account intact.",
    name: "Tom Whitford",
    role: "Freelance writer",
    avatar: "https://i.pravatar.cc/120?img=68",
    span: "md:col-span-2",
  },
  {
    quote:
      "Saved me 90 minutes a day. Comments still sound exactly like me — my audience can't tell.",
    name: "Sara Lindgren",
    role: "Frontend dev",
    avatar: "https://i.pravatar.cc/120?img=49",
    span: "md:col-span-2",
  },
  {
    quote:
      "Casper actually gets that I'm one person building a brand, not a sales pipeline.",
    name: "Alex Park",
    role: "Founder, Stillhouse",
    avatar: "https://i.pravatar.cc/120?img=47",
    span: "md:col-span-2",
  },
  {
    quote:
      "Three weeks in and I've picked up 1,400 engaged followers — real people who reply, not bots. The AI comments don't feel scripted at all.",
    name: "Diego Martinez",
    role: "Newsletter writer",
    avatar: "https://i.pravatar.cc/120?img=11",
    span: "md:col-span-4",
  },
  {
    quote:
      "Set it up on Sunday, forgot about it, opened LinkedIn on Friday and had 200+ new profile views. Felt illegal.",
    name: "Lena Volkov",
    role: "SaaS founder",
    avatar: "https://i.pravatar.cc/120?img=44",
    span: "md:col-span-2",
  },
];

function Star() {
  return (
    <svg
      className="h-3 w-3"
      viewBox="0 0 24 24"
      fill="#B81336"
      aria-hidden="true"
    >
      <path d="M12 2l2.95 6.36L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l7.05-.91L12 2z" />
    </svg>
  );
}

function QuoteMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 80 60"
      fill="#B81336"
      aria-hidden="true"
    >
      <path d="M 8 16 Q 8 8 16 8 L 30 8 L 30 28 L 22 28 Q 18 28 18 32 L 18 44 L 8 44 Z M 42 16 Q 42 8 50 8 L 64 8 L 64 28 L 56 28 Q 52 28 52 32 L 52 44 L 42 44 Z" />
    </svg>
  );
}

function FeaturedCard({ t }: { t: Testimonial }) {
  return (
    <article
      className={`group relative flex h-full flex-col overflow-hidden rounded-3xl border border-coral/40 bg-gradient-to-br from-coral/[0.10] via-ink-soft to-ink p-7 transition hover:border-coral/60 md:p-9 ${t.span}`}
    >
      {/* Background mascot watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-6 -right-6 opacity-[0.06]"
      >
        <GhostStarEyes className="h-48 w-auto md:h-56" />
      </div>

      {/* Big quote mark in corner */}
      <QuoteMark className="absolute right-7 top-7 h-12 w-auto opacity-25" />

      <div className="relative flex flex-1 flex-col">
        {/* Stars */}
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Star key={i} />
          ))}
        </div>

        {/* Quote — bigger */}
        <p className="mt-5 flex-1 font-display text-xl leading-snug tracking-tight text-cream md:text-2xl">
          &ldquo;{t.quote}&rdquo;
        </p>

        {/* Author */}
        <div className="mt-7 flex items-center gap-3.5 border-t border-cream/10 pt-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={t.avatar}
            alt=""
            className="h-12 w-12 rounded-full border border-coral/40 object-cover"
          />
          <div className="leading-tight">
            <div className="font-display text-base tracking-tight text-cream">
              {t.name}
            </div>
            <div className="mt-0.5 text-xs text-cream/60">{t.role}</div>
          </div>
        </div>
      </div>
    </article>
  );
}

function StandardCard({ t }: { t: Testimonial }) {
  return (
    <article
      className={`group relative flex h-full flex-col rounded-3xl border border-cream/10 bg-ink/60 p-6 transition hover:border-coral/40 md:p-7 ${t.span}`}
    >
      {/* Translucent quote mark */}
      <QuoteMark className="absolute right-5 top-5 h-7 w-auto opacity-15" />

      <div className="flex gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} />
        ))}
      </div>

      <p className="mt-4 flex-1 text-sm leading-relaxed text-cream/85 md:text-[15px]">
        &ldquo;{t.quote}&rdquo;
      </p>

      <div className="mt-6 flex items-center gap-3 border-t border-cream/10 pt-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={t.avatar}
          alt=""
          className="h-10 w-10 rounded-full border border-cream/20 object-cover"
        />
        <div className="leading-tight">
          <div className="font-display text-sm tracking-tight text-cream">
            {t.name}
          </div>
          <div className="mt-0.5 text-[11px] text-cream/55">{t.role}</div>
        </div>
      </div>
    </article>
  );
}

export function Testimonials() {
  return (
    <section
      id="testimonials"
      className="relative overflow-hidden bg-grad-b py-24 md:py-32"
    >
      {/* Background splatter */}
      <BloodSplatter
        className="pointer-events-none absolute -right-24 top-12 h-96 w-96 opacity-[0.05]"
        rotate={20}
      />
      <BloodSplatter
        className="pointer-events-none absolute -left-32 bottom-12 h-80 w-80 opacity-[0.04]"
        rotate={-30}
      />

      {/* Drips */}
      <BloodDrip
        className="pointer-events-none absolute left-[6%] top-16 h-9 w-auto opacity-60"
        rotate={-10}
      />
      <BloodDrip
        className="pointer-events-none absolute right-[8%] top-20 h-7 w-auto opacity-50"
        rotate={15}
      />
      <BloodDrip
        className="pointer-events-none absolute right-[10%] bottom-24 h-6 w-auto opacity-45"
        rotate={170}
      />

      {/* Bats */}
      <div
        className="pointer-events-none absolute left-[16%] top-[10%] text-cream/40 animate-fly"
        style={{ animationDelay: "0.3s" }}
      >
        <Bat className="h-12 w-auto" flap />
      </div>
      <div
        className="pointer-events-none absolute right-[20%] bottom-[12%] text-cream/30 animate-fly"
        style={{ animationDelay: "1.9s" }}
      >
        <Bat className="h-10 w-auto" flap />
      </div>

      {/* Stickers */}
      <TextSticker
        text="RAVING!"
        size="md"
        tilt={-9}
        className="absolute left-[3%] top-[28%] hidden lg:block"
      />
      <TextSticker
        text="5 STARS!"
        size="sm"
        tilt={8}
        className="absolute right-[3%] top-[34%] hidden lg:block"
      />
      <TextSticker
        text="REAL CREATORS"
        size="md"
        tilt={6}
        className="absolute left-[4%] bottom-[14%] hidden lg:block"
      />
      <Eyeball
        className="pointer-events-none absolute right-[5%] bottom-[28%] hidden h-10 w-auto opacity-80 md:block"
        rotate={-12}
      />

      {/* Decorative floating ghosts */}
      <div
        className="pointer-events-none absolute right-[12%] top-[16%] hidden opacity-30 animate-float md:block"
        style={{ animationDelay: "0.6s" }}
      >
        <GhostHeartEyes className="h-12 w-auto" />
      </div>
      <div
        className="pointer-events-none absolute left-[10%] bottom-[20%] hidden opacity-25 animate-float md:block"
        style={{ animationDelay: "2.1s" }}
      >
        <GhostThumbsUp className="h-11 w-auto" />
      </div>

      {/* Giant background quote mark for atmosphere */}
      <QuoteMark className="pointer-events-none absolute right-[40%] top-[24%] hidden h-40 w-auto opacity-[0.04] md:block" />

      <div className="relative z-10 mx-auto max-w-7xl px-6 md:px-10">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-cream/70 md:text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            Testimonials
          </span>
          <h2 className="font-display text-4xl leading-[0.95] tracking-tight text-cream sm:text-5xl md:text-6xl">
            Loved by creators
            <br />
            who actually <span className="text-coral">show up.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-lg text-sm text-cream/70 md:text-base">
            Founders, designers, coaches, and writers — real people, real
            accounts, real growth.
          </p>
        </div>

        {/* Bento grid */}
        <div className="mt-16 grid grid-cols-1 gap-5 md:mt-20 md:grid-cols-6 md:gap-6">
          {TESTIMONIALS.map((t) =>
            t.featured ? (
              <FeaturedCard key={t.name} t={t} />
            ) : (
              <StandardCard key={t.name} t={t} />
            )
          )}
        </div>

        {/* Footer stat row */}
        <div className="mt-14 flex flex-col items-center justify-center gap-3 text-sm text-cream/60 md:mt-16 md:flex-row md:gap-6">
          <span className="flex items-center gap-2">
            <span className="font-display text-2xl text-cream">1,000+</span>{" "}
            creators
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-cream/30 md:block" />
          <span className="flex items-center gap-2">
            <span className="font-display text-2xl text-cream">4.9</span>{" "}
            average rating
          </span>
          <span className="hidden h-1 w-1 rounded-full bg-cream/30 md:block" />
          <span className="flex items-center gap-2">
            <span className="font-display text-2xl text-coral">0</span>{" "}
            account bans
          </span>
        </div>
      </div>
    </section>
  );
}
