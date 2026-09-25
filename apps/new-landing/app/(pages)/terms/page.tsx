import type { Metadata } from "next";
import { A, Callout, DocShell, H2, P, Strong, UL } from "@/components/page-kit";
import { FREE_MONTHLY_ACTIONS, PRICING } from "@/lib/limits";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of service",
  description:
    "The terms governing use of the Ghostly247 extension and website, including the assumption-of-risk disclaimer for automated activity on X.",
  alternates: { canonical: "/terms" },
};

const UPDATED = "2026-09-13";

export default function TermsPage() {
  return (
    <DocShell
      eyebrow="Legal"
      title="Terms of service & disclaimer"
      updated={UPDATED}
      intro={
        <>
          These terms govern your use of the Ghostly247 browser extension and
          this website. By installing or using either, you agree to them. If you
          do not agree, do not use the service.
        </>
      }
    >
      <Callout tone="warn" title="Important — use at your own risk">
        Ghostly247 automates activity on X. Automation may conflict with
        X&rsquo;s own terms of service. Using it may result in your X account
        being rate-limited, restricted, suspended or permanently banned.{" "}
        <Strong>You use Ghostly247 entirely at your own risk.</Strong> We do not
        guarantee your account will remain in good standing, and we are not
        responsible for any action X takes against it or any loss that follows.
      </Callout>

      <H2>1. What the service does</H2>
      <P>
        Ghostly247 is a browser extension that performs engagement actions —
        likes, replies, follows, bookmarks, reposts and quotes — inside your own
        logged-in X browser session, according to the settings you choose. It
        includes pacing controls and daily limits. Those are tools, not
        guarantees of any particular outcome.
      </P>

      <H2>2. Your responsibilities</H2>
      <UL>
        <li>You are solely responsible for how you configure and use the service.</li>
        <li>
          You must comply with all applicable law and with X&rsquo;s terms and
          rules. You acknowledge that automating activity may violate them.
        </li>
        <li>You must be at least 18 and the rightful owner of the account you use it on.</li>
        <li>You will not use it for spam, harassment, deception or any unlawful purpose.</li>
      </UL>

      <H2>3. Assumption of risk</H2>
      <P>
        You expressly acknowledge that all use of the service is at your sole
        risk. Any consequence to your X account — warnings, feature limits,
        reduced reach, suspension or permanent termination — is your
        responsibility. We make no warranty that the service is
        &ldquo;safe&rdquo;, undetectable, or compliant with any third-party
        platform.
      </P>

      <H2>4. No affiliation with X</H2>
      <P>
        Ghostly247 is an independent product. It is not affiliated with,
        endorsed by or sponsored by X Corp., Twitter, or any of their
        affiliates. &ldquo;X&rdquo; and &ldquo;Twitter&rdquo; are trademarks of
        their respective owners.
      </P>

      <H2>5. Disclaimer of warranties</H2>
      <P>
        The service is provided &ldquo;as is&rdquo; and &ldquo;as
        available&rdquo;, without warranties of any kind, express or implied,
        including merchantability, fitness for a particular purpose,
        non-infringement, account safety, availability or results. We do not
        warrant that it will be uninterrupted or error-free, or that it will
        achieve any specific growth or engagement.
      </P>

      <H2>6. Limitation of liability</H2>
      <P>
        To the maximum extent permitted by law, Ghostly247 and its operators
        will not be liable for any indirect, incidental, special, consequential
        or punitive damages, or for loss of accounts, data, profits, reputation
        or goodwill, arising from your use of or inability to use the service —
        including any suspension or termination of your X account. Our total
        aggregate liability for any claim will not exceed what you paid us in
        the three months before the claim.
      </P>

      <H2>7. Indemnification</H2>
      <P>
        You agree to indemnify and hold harmless Ghostly247 and its operators
        from any claims, damages, liabilities and expenses arising from your use
        of the service or your violation of these terms or any third-party
        rights or rules, including X&rsquo;s.
      </P>

      <H2>8. Plans and billing</H2>
      <UL>
        <li>
          Ghostly247 has a free tier of {FREE_MONTHLY_ACTIONS} actions per
          calendar month, and a paid Pro plan at {PRICING.weekly.amount} per
          week or {PRICING.monthly.amount} per month.
        </li>
        <li>Payments are processed by Stripe. Subscriptions renew automatically until cancelled.</li>
        <li>
          You can cancel at any time from the billing portal in the extension.
          Access continues until the period you have paid for ends.
        </li>
        <li>
          Refunds are governed by our <A href="/refunds">refund policy</A>.
        </li>
      </UL>

      <H2>9. Termination</H2>
      <P>
        We may suspend or terminate your access if you violate these terms or
        misuse the service. You may stop using it and delete your account at any
        time.
      </P>

      <H2>10. Changes to these terms</H2>
      <P>
        We may update these terms. Material changes are reflected in the
        &ldquo;last updated&rdquo; date above, and continued use after a change
        means you accept it.
      </P>

      <H2>11. Contact</H2>
      <P>
        Questions about these terms? Email{" "}
        <A href={`mailto:${SITE.email}`}>{SITE.email}</A>. See also our{" "}
        <A href="/privacy">privacy policy</A>.
      </P>
    </DocShell>
  );
}
