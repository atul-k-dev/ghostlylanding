"use client";

import { useState } from "react";
import { INSTALL_URL } from "@/lib/install";
import { FadeInStagger, FadeIn } from "./animations/FadeInStagger";

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
    price: "$14.99",
    per: "/month",
    perMonth: "$14.99 / month",
  },
  quarterly: {
    label: "Quarterly",
    price: "$37.99",
    per: "/quarter",
    savings: "~16%",
    perMonth: "≈ $12.66 / month",
  },
  yearly: {
    label: "Yearly",
    price: "$149.99",
    per: "/year",
    savings: "~17%",
    perMonth: "≈ $12.50 / month",
  },
};

const FREE_FEATURES = [
  "30 lifetime actions to try Casper",
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
      className="relative w-full overflow-hidden bg-bg text-fg py-16 md:py-24 px-3 md:px-10 lg:px-16"
    >
      <div className="relative z-10 mx-auto max-w-5xl px-0 sm:px-6 md:px-10">
        
        {/* Header */}
        <FadeInStagger y={30} stagger={0.15} className="mx-auto max-w-2xl text-center flex flex-col items-center">
          <div className="inline-flex items-center rounded-sm bg-card border border-border px-2 py-0.5 font-geist text-[10px] font-bold uppercase tracking-widest text-fg/60 mb-6 shadow-sm">
            PRICING
          </div>
          <h2 className="font-aeonik text-[28px] sm:text-4xl md:text-[44px] font-semibold text-fg">
            Free forever.
            <br />
            Or pro for a <span className="text-fg">coffee a week.</span>
          </h2>
        </FadeInStagger>

        {/* Billing toggle */}
        <div className="relative z-30 mt-12 flex justify-center">
          <div
            role="tablist"
            aria-label="Billing cycle"
            className="inline-flex items-center gap-1 rounded-full border border-border/50 bg-[#161616] p-1"
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
                  className={`relative cursor-pointer rounded-full px-3 py-1.5 sm:px-5 sm:py-2 font-geist text-[10px] sm:text-[11px]  tracking-widest transition-all ${isActive
                      ? "bg-white/10 text-fg font-bold"
                      : "text-fg/60 hover:text-fg"
                    }`}
                >
                  {PRICING[c].label}
                  {PRICING[c].savings && (
                    <span
                      className={`ml-2 rounded-sm px-1.5 py-0.5 text-[9px] ${isActive
                          ? "bg-white text-black"
                          : "bg-white/10 text-fg/60"
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
        <FadeInStagger y={40} stagger={0.15} className="relative z-20 mt-12 grid grid-cols-1 gap-6 lg:grid-cols-2">
          
          {/* FREE CARD */}
          <article className="relative flex flex-col rounded border-b-4 border-r-4 border border-white/30 bg-card p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="font-geist text-[11px] font-bold uppercase tracking-widest text-fg/60">
                FREE FOREVER
              </span>
              <span className="rounded-sm border border-border bg-card px-2 py-0.5 font-geist text-[9px] font-bold uppercase tracking-wider text-fg/80">
                Free
              </span>
            </div>
            
            <div className="mt-8 flex items-baseline gap-2">
              <span className="font-aeonik text-5xl font-bold tracking-tight text-fg">
                $0
              </span>
              <span className="font-geist text-xs uppercase tracking-wider text-fg/50">forever</span>
            </div>
            <p className="mt-3 font-inter text-[14px] text-fg/60">
              The friendliest way to start. No card, no expiry.
            </p>

            <div className="my-7 h-px w-full bg-white/5" />

            <ul className="space-y-4">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-3 font-inter text-[14px] text-fg/80">
                  <span className="mt-1 flex-none text-fg/40">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {f}
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-10">
              <a
                href={INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-full border border-border0 bg-transparent px-6 py-4 text-center font-geist text-[11px] font-bold uppercase tracking-widest text-fg transition hover:bg-white/5"
              >
                Install Casper · free
              </a>
              <p className="mt-4 text-center font-geist text-[10px] uppercase tracking-wider text-fg/40">
                Sign in inside the extension after install.
              </p>
            </div>
          </article>

          {/* PRO CARD */}
          <article className="relative flex flex-col rounded border-b-4 border-r-4 border border-white/30 bg-card p-5 sm:p-7">
            <div className="flex items-center justify-between">
              <span className="font-geist text-[11px] font-bold uppercase tracking-widest text-fg">
                CASPER PRO
              </span>
              <span className="rounded-sm bg-white px-2 py-0.5 font-geist text-[9px] font-bold uppercase tracking-wider text-black">
                Most Popular
              </span>
            </div>

            <div className="mt-8 flex items-baseline gap-2">
              <span className="font-aeonik text-5xl font-bold tracking-tight text-fg">
                {current.price}
              </span>
              <span className="font-geist text-xs uppercase tracking-wider text-fg/50">{current.per}</span>
            </div>
            
            <p className="mt-3 font-geist text-xs uppercase tracking-wider text-fg/50 flex items-center gap-2">
              {current.perMonth}
              {current.savings && (
                <span className="text-fg/80 font-bold">
                  · {current.savings}
                </span>
              )}
            </p>
            
            <p className="mt-3 font-inter text-[14px] text-fg/60">
              Full Casper. Both platforms. Cancel any time, in one click.
            </p>

            <div className="my-7 h-px w-full bg-white/10" />

            <ul className="space-y-4">
              {PRO_FEATURES.map((f) => (
                <li key={f.label} className="flex items-start gap-3 font-inter text-[14px] text-fg/90">
                  <span className="mt-1 flex-none text-fg/80">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-4 h-4" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className={f.highlight ? "font-medium" : ""}>
                    {f.label}
                    {f.highlight && (
                      <span className="ml-2 inline-block rounded-sm bg-white/10 px-1.5 py-0.5 font-geist text-[9px] font-bold uppercase tracking-wider text-fg/80">
                        pro
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-10">
              <a
                href={INSTALL_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="block rounded-full bg-white px-6 py-4 text-center font-geist text-[11px] font-bold uppercase tracking-widest text-black transition hover:bg-white/90"
              >
                Install Casper · upgrade inside
              </a>
              <p className="mt-4 text-center font-geist text-[10px] uppercase tracking-wider text-fg/40">
                Pick Monthly · Quarterly · Yearly from the extension popup.
              </p>
            </div>
          </article>
        </FadeInStagger>

        <p className="mt-12 text-center font-geist text-[10px] uppercase tracking-wider text-fg/40 max-w-md mx-auto">
          One product, three billing cycles. All Pro features unlocked across
          every cycle — only the discount changes.
        </p>
      </div>
    </section>
  );
}
