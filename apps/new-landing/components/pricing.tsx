"use client";

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
  `${FREE_MONTHLY_ACTIONS} free actions every month`,
  "Every feature included",
  "Replies that sound like you",
  "Write & schedule posts",
  "Growth stats and daily email",
  "All safety features",
];

const PRO = [
  "Unlimited actions",
  "Every feature, no monthly limit",
  "Same safety limits — they protect your account",
  "Cancel anytime in one click",
];

function Check({ color = "var(--ink)" }: { color?: string }) {
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
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * The two Pro cards' looks — both drawn from the brand blue so they sit in the
 * theme, but distinct: weekly is the soft tint, monthly the bold fill that
 * carries the "best value" emphasis.
 */
const PRO_THEMES = {
  soft: {
    background: "var(--brand-100)",
    title: "var(--brand-800)",
    price: "var(--ink)",
    muted: "var(--zinc)",
    item: "var(--ink-soft)",
    check: "var(--brand-800)",
    buttonBg: "var(--brand)",
    buttonInk: "var(--brand-ink)",
    badgeBg: "var(--card)",
    badgeInk: "var(--brand-800)",
  },
  bold: {
    background: "linear-gradient(145deg, var(--brand) 0%, var(--brand-800) 100%)",
    title: "var(--brand-050)",
    price: "var(--brand-ink)",
    muted: "var(--brand-100)",
    item: "var(--brand-ink)",
    check: "var(--brand-ink)",
    buttonBg: "var(--card)",
    buttonInk: "var(--brand-800)",
    badgeBg: "var(--card)",
    badgeInk: "var(--brand-800)",
  },
} as const;

/** The two Pro cards — identical product, billed weekly or monthly. */
function ProCard({
  title,
  price,
  per,
  body,
  cta,
  badge,
  theme,
  delay = 0,
}: {
  title: string;
  price: string;
  per: string;
  body: string;
  cta: string;
  badge?: string;
  theme: keyof typeof PRO_THEMES;
  delay?: number;
}) {
  const t = PRO_THEMES[theme];
  return (
    <Reveal delay={delay}>
      <div
        className="relative flex h-full flex-col gap-6 p-6 xl:p-8"
        style={{ background: t.background, borderRadius: 32 }}
      >
        <div className="flex flex-col gap-2">
          {/* Badge sits in the title row and wraps under it on a narrow card,
              instead of being pinned absolutely over the title. */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="t-h5" style={{ color: t.title }}>
              {title}
            </h3>
            {badge ? (
              <span
                className="t-sm-med rounded-full px-3 py-1"
                style={{ background: t.badgeBg, color: t.badgeInk }}
              >
                {badge}
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap items-end gap-x-2">
            <span className="t-h2" style={{ color: t.price }}>
              {price}
            </span>
            <span className="t-body pb-2" style={{ color: t.muted }}>
              {per}
            </span>
          </div>
          <p className="t-body" style={{ color: t.muted }}>
            {body}
          </p>
        </div>

        <ul className="flex flex-col gap-2.5">
          {PRO.map((f) => (
            <li key={f} className="flex items-start gap-3">
              <Check color={t.check} />
              <span className="t-body" style={{ color: t.item }}>
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
            style={{ background: t.buttonBg, color: t.buttonInk }}
          >
            {cta}
          </a>
        </div>
      </div>
    </Reveal>
  );
}

export function Pricing() {
  return (
    <Section id="pricing">
      <Shell className="flex flex-col items-center gap-10">
        <SectionHead
          eyebrow="Pricing"
          title="Simple pricing that grows with you"
          body={`Start free with ${FREE_MONTHLY_ACTIONS} actions a month — no card needed. Go unlimited whenever you're ready.`}
        />

        <div className="grid w-full max-w-[1240px] grid-cols-3 gap-4 xl:gap-5 max-[1023px]:max-w-[560px] max-[1023px]:grid-cols-1">
          {/* Free */}
          <Reveal>
            <div
              className="flex h-full flex-col gap-6 p-6 xl:p-8"
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
                  Try everything. No card needed.
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

          {/* Weekly */}
          <ProCard
            title="Pro Weekly"
            price={PRICING.weekly.amount}
            per={PRICING.weekly.per}
            body="Unlimited actions, week to week. Cancel anytime."
            cta="Start Pro Weekly"
            theme="soft"
            delay={0.08}
          />

          {/* Monthly — the better deal over four weeks, so it carries the badge */}
          <ProCard
            title="Pro Monthly"
            price={PRICING.monthly.amount}
            per={PRICING.monthly.per}
            body="Unlimited actions for less. Save over 30% vs weekly."
            cta="Start Pro Monthly"
            badge="Best value"
            theme="bold"
            delay={0.16}
          />
        </div>
      </Shell>
    </Section>
  );
}
