"use client";

import { Reveal } from "./motion-primitives";
import { PrimaryButton } from "./site-nav";
import { Section, SectionHead, Shell } from "./kit";
import { LinkedInIcon, MailIcon, XIcon } from "./brand-icons";
import { SITE } from "@/lib/site";
import { REFERRAL } from "@/lib/limits";

/**
 * Invite friends — the referral programme. Both people get the same credits,
 * so the section leads with that symmetry. The right-hand panel is a drawn
 * copy of the extension's Invite Friends screen (apps/extension/src/sidepanel/
 * settings/InviteDetail.tsx), not a screenshot, so it stays sharp and on-theme.
 */

const { creditsPerReferral: PER, maxRewardedReferrals: CAP } = REFERRAL;

const STEPS = [
  {
    title: "Share your link",
    body: "Every account gets its own invite link and a 7-letter code. Send it anywhere.",
  },
  {
    title: "Your friend signs up",
    body: "With the link, or by typing the code at sign-up — email or Google both work.",
  },
  {
    title: "You both get credits",
    body: `+${PER} for them, +${PER} for you, the moment their account is created.`,
  },
];

const DEMO_CODE = "K7PM3QX";

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <li className="flex items-start gap-4">
      <span
        className="t-sm-med flex size-8 flex-none items-center justify-center rounded-full"
        style={{ background: "var(--violet)", color: "var(--brand-800)" }}
      >
        {n}
      </span>
      <div className="flex flex-col gap-1">
        <h3 className="t-h5" style={{ color: "var(--ink)" }}>
          {title}
        </h3>
        <p className="t-body" style={{ color: "var(--zinc)" }}>
          {body}
        </p>
      </div>
    </li>
  );
}

/** One of the two "+10" tiles — you and your friend, drawn identically. */
function RewardTile({ who, bold = false }: { who: string; bold?: boolean }) {
  return (
    <div
      className="flex flex-1 flex-col gap-1 rounded-3xl p-5"
      style={{
        background: bold
          ? "linear-gradient(145deg, var(--brand) 0%, var(--brand-800) 100%)"
          : "var(--brand-100)",
      }}
    >
      <span
        className="t-sm-med"
        style={{ color: bold ? "var(--brand-100)" : "var(--brand-800)" }}
      >
        {who}
      </span>
      <span
        className="t-h2"
        style={{ color: bold ? "var(--brand-ink)" : "var(--ink)" }}
      >
        +{PER}
      </span>
      <span
        className="t-sm"
        style={{ color: bold ? "var(--brand-050)" : "var(--zinc)" }}
      >
        free credits
      </span>
    </div>
  );
}

/** The extension's Invite Friends screen, redrawn in the site's tokens. */
function InviteScreen() {
  const stats = [
    { label: "Friends joined", value: "3" },
    { label: "Credits earned", value: `${3 * PER}` },
    { label: "Rewarded invites left", value: `${CAP - 3}` },
  ];

  return (
    <div
      className="mx-auto flex w-full max-w-[460px] flex-col gap-4 rounded-[24px] p-4 sm:p-5"
      style={{ background: "var(--page)" }}
      aria-hidden="true"
    >
      <div className="flex items-center justify-between px-1">
        <span className="t-h5" style={{ color: "var(--ink)" }}>
          Invite friends
        </span>
        <span
          className="t-sm-med rounded-full px-3 py-1"
          style={{ background: "var(--brand-100)", color: "var(--brand-800)" }}
        >
          {3 * PER + 42} credits
        </span>
      </div>

      {/* Invite link */}
      <div className="flex flex-col gap-2">
        <span className="t-sm-med px-1" style={{ color: "var(--muted)" }}>
          Your invite link
        </span>
        <div className="flex flex-col overflow-hidden rounded-2xl" style={{ background: "var(--card)" }}>
          <div className="flex items-center gap-3 px-4 py-3">
            <span className="t-sm min-w-0 flex-1 truncate" style={{ color: "var(--ink)" }}>
              ghostly247.com/invite/{DEMO_CODE}
            </span>
            <span
              className="t-sm-med rounded-full px-3 py-1"
              style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
            >
              Copy
            </span>
          </div>
          <div
            className="flex items-center gap-3 px-4 py-3"
            style={{ borderTop: "1px solid var(--line)" }}
          >
            <span className="t-sm flex-1" style={{ color: "var(--zinc)" }}>
              Invite code
            </span>
            <span className="t-sm-med tracking-[0.18em]" style={{ color: "var(--ink)" }}>
              {DEMO_CODE}
            </span>
          </div>
        </div>
      </div>

      {/* Share */}
      <div className="flex flex-col gap-2">
        <span className="t-sm-med px-1" style={{ color: "var(--muted)" }}>
          Share
        </span>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "X", Icon: XIcon },
            { label: "LinkedIn", Icon: LinkedInIcon },
            { label: "Email", Icon: MailIcon },
          ].map(({ label, Icon }) => (
            <span
              key={label}
              className="t-sm-med flex items-center justify-center gap-1.5 rounded-2xl px-1 py-3 sm:gap-2"
              style={{ background: "var(--card)", color: "var(--ink)" }}
            >
              <Icon className="h-4 w-4" />
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex flex-col gap-2">
        <span className="t-sm-med px-1" style={{ color: "var(--muted)" }}>
          Your invites
        </span>
        <div className="grid grid-cols-3 gap-2">
          {stats.map((s) => (
            <div
              key={s.label}
              className="flex flex-col gap-1 rounded-2xl p-3"
              style={{ background: "var(--card)" }}
            >
              <span className="t-h5" style={{ color: "var(--ink)" }}>
                {s.value}
              </span>
              <span className="t-sm leading-tight" style={{ color: "var(--zinc)" }}>
                {s.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function InviteFriends() {
  return (
    <Section id="invite">
      <Shell className="flex flex-col items-center gap-10">
        <SectionHead
          eyebrow="Invite friends"
          tone="lime"
          title="Bring a friend, you both get free actions"
          body={`Share your invite link. When a friend signs up, you each get ${PER} free credits — and they never expire.`}
        />

        <Reveal className="w-full">
          <div
            className="mx-auto flex w-full max-w-[1350px] items-center gap-10 p-4 pr-8 max-[1023px]:flex-col max-[1023px]:items-stretch max-[1023px]:gap-6 max-[1023px]:p-6 max-[639px]:p-4"
            style={{ background: "var(--card)", borderRadius: 32 }}
          >
            <div
              className="flex min-w-0 flex-[1.1] items-center justify-center self-stretch rounded-[20px] p-6 sm:p-10 max-[639px]:p-3"
              style={{ background: "var(--surface-2)" }}
            >
              <InviteScreen />
            </div>

            <div className="flex min-w-0 flex-1 flex-col gap-7">
              <div className="flex gap-3">
                <RewardTile who="Your friend gets" />
                <RewardTile who="You get" bold />
              </div>

              <ol className="flex flex-col gap-5">
                {STEPS.map((s, i) => (
                  <Step key={s.title} n={i + 1} {...s} />
                ))}
              </ol>

              <p
                className="t-sm rounded-2xl p-4"
                style={{ background: "var(--line-2)", color: "var(--zinc)" }}
              >
                <strong>One credit is one extra action</strong>, on top of your
                free monthly allowance. You&apos;re rewarded for up to {CAP}{" "}
                friends — that&apos;s {PER * CAP} free actions.
              </p>

              <div>
                <PrimaryButton href={SITE.chromeStoreUrl}>Get your invite link</PrimaryButton>
              </div>
            </div>
          </div>
        </Reveal>
      </Shell>
    </Section>
  );
}
