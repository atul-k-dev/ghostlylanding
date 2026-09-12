import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service & Disclaimer — Ghostly247",
  description:
    "Terms of Service for Ghostly247, including the assumption-of-risk disclaimer for automated Twitter/X activity.",
  robots: { index: true, follow: true },
};

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 className="mt-10 text-xl font-semibold text-fg">{children}</h2>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="mt-3 text-[15px] leading-relaxed text-muted-fg">{children}</p>
);
const UL = ({ children }: { children: React.ReactNode }) => (
  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-[15px] leading-relaxed text-muted-fg">
    {children}
  </ul>
);

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20 text-fg">
      <Link href="/" className="text-sm text-muted-fg transition-colors hover:text-fg">
        ← Back to Ghostly247
      </Link>

      <h1 className="mt-6 text-4xl font-bold tracking-tight">
        Terms of Service <span className="text-accent">&amp; Disclaimer</span>
      </h1>
      <p className="mt-2 text-sm text-muted-fg">Last updated: June 24, 2026</p>

      <P>
        These Terms of Service (&ldquo;Terms&rdquo;) govern your use of the Ghostly247 browser
        extension and website (the &ldquo;Service&rdquo;). By installing or using the Service, you
        agree to these Terms. If you do not agree, do not use the Service.
      </P>

      {/* Prominent risk disclaimer */}
      <div className="mt-8 rounded-2xl border border-accent/40 bg-accent/[0.06] p-5 sm:p-6">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">
          Important — Use at your own risk
        </p>
        <p className="mt-3 text-[15px] leading-relaxed text-fg">
          Ghostly247 automates activity on Twitter/X. Automation may conflict with Twitter/X&rsquo;s
          own terms of service. Using the Service may result in your Twitter/X account being
          rate-limited, restricted, suspended, or permanently banned. <strong>You use Ghostly247
          entirely at your own risk.</strong> We do not guarantee that your account will remain in
          good standing, and we are not responsible for any action Twitter/X takes against your
          account or for any loss that results from your use of the Service.
        </p>
      </div>

      <H2>1. What the Service does</H2>
      <P>
        Ghostly247 is a browser extension that performs engagement actions (such as likes, replies,
        follows, bookmarks, reposts, and quotes) within your own logged-in Twitter/X browser
        session, based on the settings you choose. The Service includes pacing controls and daily
        limits, but these are tools, not guarantees of any particular outcome.
      </P>

      <H2>2. Your responsibilities</H2>
      <UL>
        <li>You are solely responsible for how you configure and use the Service.</li>
        <li>
          You must comply with all applicable laws and with Twitter/X&rsquo;s Terms of Service and
          rules. You acknowledge that automating activity may violate those rules.
        </li>
        <li>You must be at least 18 years old and the rightful owner of the account you use.</li>
        <li>You will not use the Service for spam, harassment, deception, or any unlawful purpose.</li>
      </UL>

      <H2>3. Assumption of risk</H2>
      <P>
        You expressly acknowledge and agree that all use of the Service is at your sole risk. Any
        consequence to your Twitter/X account — including warnings, feature limits, shadow-banning,
        suspension, or permanent termination — is your responsibility. We make no warranty that the
        Service is &ldquo;safe,&rdquo; undetectable, or compliant with any third-party platform.
      </P>

      <H2>4. No affiliation with Twitter/X</H2>
      <P>
        Ghostly247 is an independent product. It is not affiliated with, endorsed by, or sponsored
        by Twitter, X Corp., or any of their affiliates. &ldquo;Twitter&rdquo; and &ldquo;X&rdquo;
        are trademarks of their respective owners.
      </P>

      <H2>5. Disclaimer of warranties</H2>
      <P>
        The Service is provided &ldquo;as is&rdquo; and &ldquo;as available,&rdquo; without
        warranties of any kind, whether express or implied, including but not limited to
        merchantability, fitness for a particular purpose, non-infringement, account safety,
        availability, or results. We do not warrant that the Service will be uninterrupted,
        error-free, or that it will achieve any specific growth or engagement.
      </P>

      <H2>6. Limitation of liability</H2>
      <P>
        To the maximum extent permitted by law, Ghostly247 and its operators will not be liable for
        any indirect, incidental, special, consequential, or punitive damages, or for any loss of
        accounts, data, profits, reputation, or goodwill, arising out of or related to your use of
        (or inability to use) the Service — including any suspension or termination of your
        Twitter/X account. Our total aggregate liability for any claim will not exceed the amount
        you paid us in the three (3) months preceding the claim.
      </P>

      <H2>7. Indemnification</H2>
      <P>
        You agree to indemnify and hold harmless Ghostly247 and its operators from any claims,
        damages, liabilities, and expenses arising from your use of the Service or your violation
        of these Terms or any third-party rights or rules (including Twitter/X&rsquo;s).
      </P>

      <H2>8. Subscriptions &amp; billing</H2>
      <UL>
        <li>Ghostly247 offers a free tier and a paid &ldquo;Pro&rdquo; plan, billed at $7.99/month or $2.99/week.</li>
        <li>Payments are processed by Stripe. Subscriptions renew automatically until canceled.</li>
        <li>You can cancel anytime from the billing portal; access continues until the period ends.</li>
        <li>Except where required by law, payments are non-refundable.</li>
      </UL>

      <H2>9. Termination</H2>
      <P>
        We may suspend or terminate your access at any time if you violate these Terms or misuse the
        Service. You may stop using and delete your account at any time.
      </P>

      <H2>10. Changes to these Terms</H2>
      <P>
        We may update these Terms from time to time. Material changes are reflected by the
        &ldquo;Last updated&rdquo; date above. Continued use after changes constitutes acceptance.
      </P>

      <H2>11. Contact</H2>
      <P>
        Questions about these Terms? Email{" "}
        <a href="mailto:support@ghostly247.com" className="text-accent hover:underline">
          support@ghostly247.com
        </a>
        .
      </P>

      <div className="mt-12 border-t border-border pt-6 text-sm text-muted-fg">
        See also our{" "}
        <Link href="/privacy" className="text-accent hover:underline">
          Privacy Policy
        </Link>
        .
      </div>
    </main>
  );
}
