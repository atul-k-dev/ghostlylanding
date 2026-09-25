import type { Metadata } from "next";
import { A, DataTable, DocShell, H2, P } from "@/components/page-kit";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Subprocessors",
  description:
    "Every third party that processes data on Ghostly247's behalf, what each one receives, and why.",
  alternates: { canonical: "/subprocessors" },
};

const UPDATED = "2026-09-13";

/**
 * Grounded in what the server actually depends on — `openai`, `stripe`,
 * `resend`, `google-auth-library` and `mongoose` in apps/server/package.json,
 * deployed on Railway. A vendor belongs on this list only when it is in the
 * dependency tree, not when it merely seems likely.
 */
const ROWS: [string, string, string][] = [
  [
    "OpenAI",
    "Post text you ask for a reply to, your tone or voice settings, and drafts submitted for moderation.",
    "Generating AI replies, quotes and drafted posts, and screening them before they reach you.",
  ],
  [
    "Stripe",
    "Your email address, payment method and subscription state. Card numbers go to Stripe directly and never touch our servers.",
    "Taking subscription payments and running the billing portal.",
  ],
  [
    "Resend",
    "Your email address and the contents of transactional messages.",
    "Sending password-reset codes and account email.",
  ],
  [
    "Google",
    "Your basic Google profile — name and email — only if you choose Sign in with Google.",
    "Optional single sign-on.",
  ],
  [
    "MongoDB Atlas",
    "Your account record, settings, action logs, drafts and voice profile.",
    "The managed database everything is stored in.",
  ],
  [
    "Railway",
    "All server traffic in transit, and the application logs it produces.",
    "Hosting the API.",
  ],
];

export default function SubprocessorsPage() {
  return (
    <DocShell
      eyebrow="Legal"
      title="Subprocessors"
      updated={UPDATED}
      intro={
        <>
          The third parties that process data on our behalf so Ghostly247 can
          run. Each handles data under its own terms, and we share the minimum
          each one needs.
        </>
      }
    >
      <DataTable
        columns={["Provider", "What it receives", "Why"]}
        rows={ROWS.map((r) => [r[0], r[1], r[2]])}
      />

      <H2>What none of them get</H2>
      <P>
        No subprocessor receives your X password or session cookie, because we
        never hold either. The extension acts inside your own browser, and no
        server in this list can sign in to X as you.
      </P>

      <H2>Changes to this list</H2>
      <P>
        We update this page when a provider is added or removed, and the
        &ldquo;last updated&rdquo; date reflects the most recent change. If you
        would like advance notice of additions, email{" "}
        <A href={`mailto:${SITE.email}`}>{SITE.email}</A> and we will add you to
        the notification list.
      </P>

      <H2>Related</H2>
      <P>
        <A href="/privacy">Privacy policy</A> ·{" "}
        <A href="/data-deletion">Delete your data</A> ·{" "}
        <A href="/terms">Terms of service</A>
      </P>
    </DocShell>
  );
}
