"use client";

import { useState } from "react";
import { Reveal } from "./motion-primitives";
import { GhostButton } from "./site-nav";
import { Section, SectionHead, Shell } from "./kit";
import { SITE } from "@/lib/site";
import { FREE_MONTHLY_ACTIONS, PRICING } from "../lib/limits";

/**
 * Pricing, told the way the extension's own Limits page tells it: the only
 * thing Pro changes is the monthly action cap. Every feature and every daily
 * safety limit is identical on Free, so nothing here is dressed up as a Pro
 * perk when a free user already has it.
 */

const FREE = [
  `${FREE_MONTHLY_ACTIONS} actions a month, reset on the 1st`,
  "All six actions — like, reply, follow, bookmark, repost, quote",
  "AI replies in your trained voice",
  "Create & schedule posts",
  "Growth scoreboard and daily recap",
  "Every safety control",
];

const PRO = [
  "Unlimited actions — no monthly cap",
  "Every feature from Free, none of them metered",
  "Daily safety limits unchanged — they protect your account, not your plan",
  "Cancel any time from the billing portal",
];

function Check({ light = false }: { light?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className="mt-[5px] flex-none"
    >
      <path
        d="M3 8.5 6.2 11.7 13 5"
        stroke={light ? "var(--lime)" : "var(--ink)"}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Pricing() {
  const [weekly, setWeekly] = useState(false);
  const price = weekly ? PRICING.weekly : PRICING.monthly;

  return (
    <Section id="pricing">
      <Shell className="flex flex-col items-center gap-10">
        <SectionHead
          eyebrow="Pricing"
          title="Free until it's worth paying for"
          body={`Start with ${FREE_MONTHLY_ACTIONS} actions a month, forever, no card. Upgrade the week it starts working.`}
        />

        {/* billing toggle */}
        <Reveal>
          <div
            className="flex items-center gap-1 p-1"
            style={{
              background: "var(--line-2)",
              borderRadius: 999,
            }}
          >
            {[
              { id: "monthly", label: "Monthly" },
              { id: "weekly", label: "Weekly" },
            ].map((opt) => {
              const on = (opt.id === "weekly") === weekly;
              return (
                <button
                  key={opt.id}
                  onClick={() => setWeekly(opt.id === "weekly")}
                  aria-pressed={on}
                  className="t-sm-med cursor-pointer rounded-full px-5 py-2 transition-colors"
                  style={{
                    background: on ? "var(--card)" : "transparent",
                    color: on ? "var(--ink)" : "var(--muted)",
                    boxShadow: on ? "var(--shadow-soft)" : "none",
                  }}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </Reveal>

        <div className="grid w-full max-w-[1100px] grid-cols-2 gap-5 max-[809px]:grid-cols-1">
          {/* Free */}
          <Reveal>
            <div
              className="flex h-full flex-col gap-6 p-8"
              style={{
                background: "var(--card)",
                borderRadius: 32,
              }}
            >
              <div className="flex flex-col gap-2">
                <h3 className="t-h5" style={{ color: "var(--ink)" }}>
                  Free
                </h3>
                <div className="flex items-end gap-2">
                  <span className="t-h2" style={{ color: "var(--ink)" }}>
                    $0
                  </span>
                  <span
                    className="t-body pb-2"
                    style={{ color: "var(--muted)" }}
                  >
                    forever
                  </span>
                </div>
                <p className="t-body" style={{ color: "var(--zinc)" }}>
                  The whole product, metered. Good enough to actually use.
                </p>
              </div>

              <ul className="flex flex-col gap-2.5">
                {FREE.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check />
                    <span className="t-body" style={{ color: "var(--zinc)" }}>
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-2">
                <GhostButton href={SITE.chromeStoreUrl}>Add to Chrome</GhostButton>
              </div>
            </div>
          </Reveal>

          {/* Pro */}
          <Reveal delay={0.08}>
            <div
              className="relative flex h-full flex-col gap-6 p-8"
              style={{ background: "var(--forest)", borderRadius: 32 }}
            >
              <span
                className="t-sm-med absolute right-8 top-8 rounded-full px-3 py-1"
                style={{ background: "var(--lime)", color: "var(--ink)" }}
              >
                Unlimited
              </span>

              <div className="flex flex-col gap-2">
                <h3 className="t-h5" style={{ color: "var(--forest-ink)" }}>
                  Pro
                </h3>
                <div className="flex items-end gap-2">
                  <span className="t-h2" style={{ color: "var(--forest-ink)" }}>
                    {price.amount}
                  </span>
                  <span
                    className="t-body pb-2"
                    style={{ color: "var(--forest-muted)" }}
                  >
                    {price.per}
                  </span>
                </div>
                <p className="t-body" style={{ color: "var(--forest-muted)" }}>
                  One thing changes: the monthly cap comes off. Cancel any time
                  from the billing portal — no contract, no minimum.
                </p>
              </div>

              <ul className="flex flex-col gap-2.5">
                {PRO.map((f) => (
                  <li key={f} className="flex items-start gap-3">
                    <Check light />
                    <span
                      className="t-body"
                      style={{ color: "var(--forest-soft)" }}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-2">
                <a
                  href={SITE.chromeStoreUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="t-nav inline-flex items-center justify-center rounded-3xl px-6 py-3 transition-transform hover:-translate-y-0.5"
                  style={{ background: "var(--lime)", color: "var(--ink)" }}
                >
                  Go Pro
                </a>
              </div>
            </div>
          </Reveal>
        </div>
      </Shell>
    </Section>
  );
}
