import type { Metadata } from "next";
import { A, Callout, DocShell, H2, OL, P, UL } from "@/components/page-kit";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Delete your data",
  description:
    "Delete your Ghostly247 account and everything attached to it — from the extension in about thirty seconds, or by email.",
  alternates: { canonical: "/data-deletion" },
};

const UPDATED = "2026-09-13";

export default function DataDeletionPage() {
  return (
    <DocShell
      eyebrow="Legal"
      title="Delete your data"
      updated={UPDATED}
      intro={
        <>
          You can erase your Ghostly247 account and everything attached to it
          yourself, without emailing anyone and without waiting for us.
        </>
      }
    >
      <Callout title="This cannot be undone">
        Deleting is immediate and permanent. There is no grace period and no
        archived copy to restore from — if you want your action history, export
        or screenshot it first.
      </Callout>

      <H2>From the extension</H2>
      <OL>
        <li>Open the Ghostly247 side panel in Chrome.</li>
        <li>Go to Settings → Account.</li>
        <li>Choose Delete account, and confirm.</li>
      </OL>
      <P>
        That single action removes your profile, your action logs, your drafts
        and scheduled posts, your voice profile, your keywords and settings, and
        the local copy the extension keeps in Chrome storage.
      </P>

      <H2>By email</H2>
      <P>
        If you have lost access to the extension, email{" "}
        <A href={`mailto:${SITE.email}`}>{SITE.email}</A> from the address on
        your account with the subject &ldquo;Delete my account&rdquo;. We
        confirm the request, delete it within 30 days, and reply when it is
        done.
      </P>

      <H2>What gets deleted</H2>
      <UL>
        <li>Your name, email address and password hash.</li>
        <li>Every logged action, with its timestamps and targets.</li>
        <li>Your voice profile and the style summary derived from your posts.</li>
        <li>Drafts, scheduled posts and the reply review queue.</li>
        <li>Settings, safety preset, keywords and topic feeds.</li>
        <li>The extension&rsquo;s local storage on your machine.</li>
      </UL>

      <H2>What does not, and why</H2>
      <UL>
        <li>
          <strong>Payment records held by Stripe.</strong> Invoices and
          transaction records are kept by Stripe under financial record-keeping
          law. We delete our copy of your Stripe identifiers; Stripe keeps the
          invoice itself. Their retention is governed by{" "}
          <A href="https://stripe.com/privacy">Stripe&rsquo;s privacy policy</A>.
        </li>
        <li>
          <strong>Your X account and everything on it.</strong> Ghostly247 only
          ever acted inside your own browser session. Likes, replies and follows
          it performed are your account&rsquo;s activity and live on X, not with
          us — deleting here does not undo them. Undo anything you want removed
          on X itself, before or after.
        </li>
        <li>
          <strong>Aggregate operational counters</strong> that carry no
          identifier and cannot be linked back to you.
        </li>
      </UL>

      <H2>Just want to stop it running?</H2>
      <P>
        You do not have to delete anything. Toggling Ghostly247 off in the side
        panel halts it in about two seconds, and uninstalling the extension
        stops it entirely while leaving your account intact for later.
      </P>

      <H2>Questions</H2>
      <P>
        Anything unclear, email <A href={`mailto:${SITE.email}`}>{SITE.email}</A>.
        See also our <A href="/privacy">privacy policy</A>.
      </P>
    </DocShell>
  );
}
