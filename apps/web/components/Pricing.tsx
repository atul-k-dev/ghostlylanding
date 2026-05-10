"use client";

import { useState } from "react";
import { Bat } from "./Bat";
import { BloodDrip } from "./BloodDrip";
import { BloodSplatter } from "./BloodSplatter";
import { GhostMascot } from "./GhostMascot";
import { Eyeball } from "./stickers/Eyeball";
import { TextSticker } from "./stickers/TextSticker";

type Cycle = "monthly" | "quarterly" | "yearly";

const PRICING: Record<
  Cycle,
  {
    label: string;
    price: string;
    per: string;
    savings?: string;
    perMonth?: string;
  }
> = {
  monthly: {
    label: "Monthly",
    price: "$19.99",
    per: "/month",
    perMonth: "$19.99 / month",
  },
  quarterly: {
    label: "Quarterly",
    price: "$49.99",
    per: "/quarter",
    savings: "save ~17%",
    perMonth: "≈ $16.66 / month",
  },
  yearly: {
    label: "Yearly",
    price: "$199.99",
    per: "/year",
    savings: "save ~17%",
    perMonth: "≈ $16.66 / month",
  },
};

const FREE_FEATURES = [
  "25 actions per day",
  "1 platform (Twitter or LinkedIn)",
  "Auto-likes + auto-follows",
  "Basic scheduling",
  "Action log + kill switch",
];

const PRO_FEATURES = [
  { label: "Unlimited actions (within safe caps)", highlight: false },
  { label: "Both platforms — Twitter + LinkedIn", highlight: true },
  { label: "AI comments in your tone", highlight: true },
  { label: "Voice training on 10 past comments", highlight: true },
  { label: "Burst mode + smart scheduling", highlight: false },
  { label: "Daily summary email", highlight: false },
  { label: "Priority support", highlight: false },
];

export function Pricing() {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const current = PRICING[cycle];

  return (
    <section
      id="pricing"
      className="relative overflow-hidden bg-ink pattern-spotlight py-20 md:py-24"
    >
      {/* Decoration */}
      <BloodSplatter
        className="pointer-events-none absolute -right-32 top-0 h-[360px] w-[360px] opacity-[0.05]"
        rotate={45}
      />
      <BloodSplatter
        className="pointer-events-none absolute -left-40 bottom-10 h-[400px] w-[400px] opacity-[0.04]"
        rotate={-25}
      />
      <BloodDrip
        className="pointer-events-none absolute left-[8%] top-16 h-9 w-auto opacity-50"
        rotate={-10}
      />
      <BloodDrip
        className="pointer-events-none absolute right-[6%] bottom-24 h-7 w-auto opacity-50"
        rotate={170}
      />

      {/* Bats — chamgadar */}
      <div
        className="pointer-events-none absolute left-[14%] top-[8%] text-cream/40 animate-fly"
        style={{ animationDelay: "0.5s" }}
      >
        <Bat className="h-12 w-auto" flap />
      </div>
      <div
        className="pointer-events-none absolute right-[18%] bottom-[12%] text-cream/30 animate-fly"
        style={{ animationDelay: "2.1s" }}
      >
        <Bat className="h-10 w-auto" flap />
      </div>

      {/* Stickers */}
      <TextSticker
        text="WORTH IT!"
        size="md"
        tilt={-9}
        className="absolute left-[3%] top-[10%] hidden lg:block"
      />
      <TextSticker
        text="GO PRO!"
        size="md"
        tilt={11}
        className="absolute right-[3%] top-[6%] hidden lg:block"
      />
      <TextSticker
        text="BEST DEAL"
        size="sm"
        tilt={-9}
        className="absolute left-[2%] bottom-[10%] hidden lg:block"
      />
      <TextSticker
        text="NO TRICKS!"
        size="sm"
        tilt={6}
        className="absolute right-[4%] bottom-[18%] hidden lg:block"
      />
      <Eyeball
        className="pointer-events-none absolute right-[10%] bottom-[6%] hidden h-9 w-auto opacity-80 md:block"
        rotate={15}
      />

      <div className="relative z-10 mx-auto max-w-6xl px-6 md:px-10">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-cream/15 bg-cream/5 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.25em] text-cream/70 md:text-[11px]">
            <span className="h-1.5 w-1.5 rounded-full bg-coral" />
            Pricing
          </span>
          <h2 className="font-display text-3xl leading-[0.95] tracking-tight text-cream sm:text-4xl md:text-5xl">
            Free forever.
            <br />
            Or pro for a <span className="text-coral">coffee a week.</span>
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-cream/70">
            Start on the free tier. Upgrade when you want AI comments, voice
            training, and both platforms.
          </p>
        </div>

        {/* Billing toggle — lifted above all decorations with z-30 */}
        <div className="relative z-30 mt-8 flex justify-center">
          <div
            role="tablist"
            aria-label="Billing cycle"
            className="inline-flex items-center gap-1 rounded-full border border-cream/15 bg-ink/80 p-1 backdrop-blur"
          >
            {(Object.keys(PRICING) as Cycle[]).map((c) => {
              const isActive = cycle === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setCycle(c)}
                  className={`relative cursor-pointer rounded-full px-4 py-2 text-xs font-medium transition md:px-5 md:text-sm ${
                    isActive
                      ? "bg-coral text-cream shadow-[0_4px_18px_rgba(185,28,28,0.35)]"
                      : "text-cream/60 hover:text-cream"
                  }`}
                >
                  {PRICING[c].label}
                  {PRICING[c].savings && (
                    <span
                      className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                        isActive
                          ? "bg-cream/20 text-cream"
                          : "bg-coral/15 text-coral"
                      }`}
                    >
                      {PRICING[c].savings}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Cards */}
        <div className="relative z-20 mt-10 grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* FREE */}
          <article className="relative flex flex-col rounded-3xl border border-cream/10 bg-ink-soft/60 p-6">
            <div className="flex items-center justify-between">
              <span className="font-display text-[11px] tracking-[0.35em] text-cream-dim">
                FREE FOREVER
              </span>
              <span className="rounded-full border border-cream/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cream/60">
                Free
              </span>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="font-display text-4xl text-cream md:text-5xl">
                $0
              </span>
              <span className="text-sm text-cream-dim">forever</span>
            </div>
            <p className="mt-2 text-sm text-cream/65">
              The friendliest way to start. No card, no expiry.
            </p>

            <div className="my-5 h-px w-full bg-cream/10" />

            <ul className="space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2.5 text-sm text-cream/85"
                >
                  <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full border border-cream/30 text-cream/70">
                    <svg
                      viewBox="0 0 12 12"
                      className="h-2.5 w-2.5"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M2.5 6 L5 8.5 L9.5 4"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-6">
              <a
                href="#"
                className="block rounded-full border border-cream/25 px-6 py-3 text-center text-sm font-semibold text-cream transition hover:border-coral hover:text-coral"
              >
                Get started free
              </a>
              <p className="mt-2 text-center text-[11px] text-cream-dim">
                No upgrade prompts. Promise.
              </p>
            </div>
          </article>

          {/* PRO — outer wrapper has no overflow-hidden so the badge can stick above */}
          <div className="relative">
            {/* Most popular tape — lives ABOVE the card edge */}
            <span
              className="absolute -top-3 right-6 z-20 rounded-full bg-coral px-3.5 py-1 font-display text-[10px] tracking-[0.3em] text-cream shadow-[0_4px_20px_rgba(185,28,28,0.55)]"
              style={{ transform: "rotate(3deg)" }}
            >
              MOST POPULAR
            </span>

            <article className="relative flex h-full flex-col overflow-hidden rounded-3xl border border-coral/40 bg-gradient-to-br from-coral/[0.10] via-ink-soft to-ink p-6">
              {/* Bg ghost — clipped by the article's overflow-hidden */}
              <div className="pointer-events-none absolute -bottom-8 -right-6 opacity-[0.10]">
                <GhostMascot className="h-40 w-auto md:h-48" />
              </div>

              <div className="relative">
              <div className="flex items-center justify-between">
                <span className="font-display text-[11px] tracking-[0.35em] text-coral">
                  CASPER PRO
                </span>
                <span className="rounded-full bg-coral/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-coral">
                  Full access
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="font-display text-4xl text-cream md:text-5xl">
                  {current.price}
                </span>
                <span className="text-sm text-cream-dim">{current.per}</span>
              </div>
              <p className="mt-1 text-xs text-cream-dim">
                {current.perMonth}
                {current.savings && (
                  <span className="ml-2 font-semibold text-coral">
                    · {current.savings}
                  </span>
                )}
              </p>
              <p className="mt-2 text-sm text-cream/70">
                Full Casper. Both platforms. Cancel any time, in one click.
              </p>

              <div className="my-5 h-px w-full bg-cream/10" />

              <ul className="space-y-2.5">
                {PRO_FEATURES.map((f) => (
                  <li
                    key={f.label}
                    className="flex items-start gap-2.5 text-sm text-cream"
                  >
                    <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-coral text-cream shadow-[0_2px_10px_rgba(185,28,28,0.3)]">
                      <svg
                        viewBox="0 0 12 12"
                        className="h-2.5 w-2.5"
                        fill="none"
                        aria-hidden="true"
                      >
                        <path
                          d="M2.5 6 L5 8.5 L9.5 4"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                    <span className={f.highlight ? "font-medium" : ""}>
                      {f.label}
                      {f.highlight && (
                        <span className="ml-1.5 inline-block rounded-sm bg-coral/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-coral">
                          pro
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <a
                href="#"
                className="mt-7 block rounded-full bg-coral px-6 py-3 text-center text-sm font-semibold text-cream shadow-[0_8px_30px_rgba(185,28,28,0.4)] transition hover:bg-coral-dim"
              >
                Start 7-day free trial
              </a>
              <p className="mt-2 text-center text-[11px] text-cream-dim">
                No card needed for trial · Cancel before day 7 = $0
              </p>
              </div>
            </article>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-cream-dim">
          One product, three billing cycles. All Pro features unlocked across
          every cycle — only the discount changes.
        </p>
      </div>
    </section>
  );
}
