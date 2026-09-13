import type { Metadata } from "next";
import { A, Callout, DocShell, H2, P, Strong, UL } from "@/components/page-kit";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What Ghostly247 collects, what it never collects, who processes it, and how to delete all of it.",
  alternates: { canonical: "/privacy" },
};

const UPDATED = "2026-09-13";

export default function PrivacyPage() {
  return (
    <DocShell
      eyebrow="Legal"
      title="Privacy policy"
      updated={UPDATED}
      intro={
        <>
          How Ghostly247 collects, uses and protects information when you use
          the browser extension and this website. Using Ghostly247 means you
          agree to this policy.
        </>
      }
    >
      <Callout title="The short version">
        We never see your X password, because we never sign in to X. The
        extension acts inside the browser session you are already signed into,
        on your own machine. Everything else below is detail.
      </Callout>

      <H2>What we collect</H2>
      <UL>
        <li>
          <Strong>Account details</Strong> — your name, email address and a
          securely hashed password. If you sign in with Google we receive your
          basic Google profile (name and email) only.
        </li>
        <li>
          <Strong>Activity data</Strong> — a log of the actions the extension
          took for you (likes, replies, follows, bookmarks, reposts, quotes)
          with timestamps and the target post or handle, plus your settings and
          relevance keywords.
        </li>
        <li>
          <Strong>Voice profile</Strong> — if you train one, a short written
          summary of your writing style. The posts it was derived from are
          analysed in memory and discarded; only the summary is stored, and you
          can read and delete it in Settings.
        </li>
        <li>
          <Strong>Billing data</Strong> — if you subscribe, Stripe handles your
          card details. We store only your Stripe customer and subscription
          identifiers and the status of that subscription. We never see or
          store a full card number.
        </li>
      </UL>

      <H2>What we never collect</H2>
      <P>
        We do not collect, see or store your X password or login credentials,
        and we would refuse them if offered. There is no server anywhere that
        logs into X as you. We also do not read your direct messages, and post
        text sent to generate a reply is not retained beyond that request.
      </P>

      <H2>How we use it</H2>
      <UL>
        <li>To provide, operate and maintain the service.</li>
        <li>To generate AI-assisted replies and run content moderation.</li>
        <li>To process subscriptions and payments.</li>
        <li>To send transactional email such as password-reset codes.</li>
        <li>To secure accounts and prevent abuse.</li>
      </UL>
      <P>
        We do not sell your personal data, and we do not use it to train any
        model of our own.
      </P>

      <H2>Who else processes it</H2>
      <P>
        We share the minimum necessary with the infrastructure providers that
        run Ghostly247. Each is named, with what it receives and why, on the{" "}
        <A href="/subprocessors">subprocessors page</A>.
      </P>

      <H2>Storage and security</H2>
      <P>
        Data is held on managed cloud infrastructure with industry-standard
        protections, including hashed passwords and encrypted connections in
        transit. No method of transmission or storage is completely secure, and
        we cannot guarantee absolute security.
      </P>

      <H2>Local storage in your browser</H2>
      <P>
        The extension keeps your settings, session token and pending action
        queue in Chrome&rsquo;s local extension storage on your own machine.
        Uninstalling the extension, or clearing its data, removes that copy.
      </P>

      <H2>Retention and deletion</H2>
      <P>
        We keep your data while your account is active. You can delete your
        account at any time from the extension, which permanently removes your
        profile, action logs, drafts and settings. Step-by-step instructions,
        and what survives deletion for legal reasons, are on the{" "}
        <A href="/data-deletion">delete your data page</A>.
      </P>

      <H2>Children</H2>
      <P>
        Ghostly247 is not intended for anyone under 18, and we do not knowingly
        collect data from children.
      </P>

      <H2>Changes to this policy</H2>
      <P>
        We may update this policy. Material changes are reflected in the
        &ldquo;last updated&rdquo; date at the top, and continued use after a
        change means you accept it.
      </P>

      <H2>Contact</H2>
      <P>
        Questions about this policy? Email{" "}
        <A href={`mailto:${SITE.email}`}>{SITE.email}</A>. See also our{" "}
        <A href="/terms">terms of service</A>.
      </P>
    </DocShell>
  );
}
