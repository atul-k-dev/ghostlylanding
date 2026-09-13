import type { Metadata } from "next";
import { A, Callout, DocShell, H2, P } from "@/components/page-kit";
import { SITE, STATUS, STATUS_COMPONENTS } from "@/lib/site";

export const metadata: Metadata = {
  title: "Status",
  description:
    "Current operational status of the Ghostly247 API, AI replies, billing and email.",
  alternates: { canonical: "/status" },
  // A status page that is served stale is worse than no status page.
  robots: { index: true, follow: true },
};

const TONE = {
  ok: { dot: "#22c55e", text: "Operational" },
  degraded: { dot: "#f59e0b", text: "Degraded" },
  down: { dot: "#ef4444", text: "Outage" },
} as const;

export default function StatusPage() {
  const tone = TONE[STATUS.level];

  return (
    <DocShell
      eyebrow="Support"
      title="Status"
      intro={<>Whether the parts of Ghostly247 that live on our servers are working.</>}
    >
      {/* headline state */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 p-6"
        style={{
          background: "var(--card)",
          border: "1px solid var(--line)",
          borderRadius: 20,
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 flex-none rounded-full"
            style={{ background: tone.dot }}
            aria-hidden="true"
          />
          <div className="flex flex-col">
            <p className="t-h5" style={{ color: "var(--ink)" }}>
              {STATUS.label}
            </p>
            <p className="t-sm" style={{ color: "var(--muted)" }}>
              {STATUS.note}
            </p>
          </div>
        </div>
        <p className="t-sm" style={{ color: "var(--muted-2)" }}>
          Checked{" "}
          <time dateTime={STATUS.checked}>
            {new Date(`${STATUS.checked}T00:00:00Z`).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </time>
        </p>
      </div>

      {/* components */}
      <div className="mt-4 flex flex-col gap-2">
        {STATUS_COMPONENTS.map((c) => (
          <div
            key={c.name}
            className="flex flex-wrap items-center justify-between gap-3 px-6 py-4"
            style={{
              background: "var(--card)",
              border: "1px solid var(--line)",
              borderRadius: 16,
            }}
          >
            <div className="flex flex-col">
              <p className="t-nav" style={{ color: "var(--ink)" }}>
                {c.name}
              </p>
              <p className="t-sm" style={{ color: "var(--muted)" }}>
                {c.detail}
              </p>
            </div>
            <span className="t-sm-med flex items-center gap-2" style={{ color: "var(--zinc)" }}>
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: tone.dot }}
                aria-hidden="true"
              />
              {tone.text}
            </span>
          </div>
        ))}
      </div>

      <Callout title="How this page is updated">
        Honestly: by a person, not a monitor. We have not wired up automated
        uptime checks yet, so treat this as our last confirmed state rather than
        a live probe. If something is broken for you and this page still says
        everything is fine, the page is wrong — tell us at{" "}
        <A href={`mailto:${SITE.email}`}>{SITE.email}</A>.
      </Callout>

      <H2>What this page does not cover</H2>
      <P>
        Ghostly247 does most of its work inside your own browser, so plenty of
        things can go wrong while every service above is green — Chrome being
        closed, your X session having signed out, an auto-pause after X returned
        something unexpected, or this month&rsquo;s free actions being used up.
        Check Diagnostics in the side panel first, then the{" "}
        <A href="/docs">troubleshooting section</A> of the docs.
      </P>

      <H2>X itself</H2>
      <P>
        If X is down or rate-limiting broadly, Ghostly247 pauses rather than
        pushing through it. That is not an incident on our side and will not
        show here.
      </P>
    </DocShell>
  );
}
