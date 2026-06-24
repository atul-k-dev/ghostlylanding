import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Ghostly247",
  description: "How Ghostly247 collects, uses, and protects your data.",
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

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 sm:py-20 text-fg">
      <Link href="/" className="text-sm text-muted-fg transition-colors hover:text-fg">
        ← Back to Ghostly247
      </Link>

      <h1 className="mt-6 text-4xl font-bold tracking-tight">
        Privacy <span className="text-accent">Policy</span>
      </h1>
      <p className="mt-2 text-sm text-muted-fg">Last updated: June 24, 2026</p>

      <P>
        This Privacy Policy explains how Ghostly247 (&ldquo;Ghostly247&rdquo;,
        &ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses, and protects information when you use
        our browser extension and website. By using Ghostly247 you agree to this policy.
      </P>

      <H2>Information we collect</H2>
      <UL>
        <li>
          <strong className="text-fg">Account details</strong> — your name, email address, and a
          securely hashed password. If you sign in with Google, we receive your basic Google
          profile (name and email) only.
        </li>
        <li>
          <strong className="text-fg">Activity data</strong> — a log of actions the extension
          performs on your behalf (e.g. likes, replies, follows), including timestamps and target
          URLs/handles, plus your settings and relevance keywords.
        </li>
        <li>
          <strong className="text-fg">Billing data</strong> — if you subscribe, our payment
          processor (Stripe) handles your card details. We store only your Stripe customer and
          subscription identifiers and status; we never see or store full card numbers.
        </li>
      </UL>

      <H2>What we do NOT collect</H2>
      <P>
        We never collect, see, or store your Twitter/X password or login credentials. The
        extension acts within your own browser session, where you are already signed in to
        Twitter/X. We do not log into your account from our servers.
      </P>

      <H2>How we use your information</H2>
      <UL>
        <li>To provide, operate, and maintain the service.</li>
        <li>To generate AI-assisted replies and run content moderation (via OpenAI).</li>
        <li>To process subscriptions and payments (via Stripe).</li>
        <li>To send transactional emails such as password-reset codes (via Resend).</li>
        <li>To secure accounts and prevent abuse.</li>
      </UL>

      <H2>Third-party services</H2>
      <P>
        We share the minimum data necessary with infrastructure and service providers that help us
        run Ghostly247: OpenAI (AI replies &amp; moderation), Stripe (payments), Resend (email),
        Google (optional sign-in), and our hosting/database providers (Railway, MongoDB Atlas).
        Each processes data under its own terms. We do not sell your personal data.
      </P>

      <H2>Data storage &amp; security</H2>
      <P>
        Data is stored on managed cloud infrastructure and protected with industry-standard
        measures, including hashed passwords and encrypted connections. No method of transmission or
        storage is 100% secure, and we cannot guarantee absolute security.
      </P>

      <H2>Data retention &amp; deletion</H2>
      <P>
        We keep your data for as long as your account is active. You can delete your account at any
        time from the extension — this permanently removes your profile, action logs, drafts, and
        local settings. You may also email us to request deletion.
      </P>

      <H2>Local storage</H2>
      <P>
        The extension stores your settings, session token, and action queue locally in your browser
        using Chrome storage. Clearing the extension&rsquo;s data or uninstalling it removes this
        local data.
      </P>

      <H2>Children</H2>
      <P>
        Ghostly247 is not intended for anyone under 18, and we do not knowingly collect data from
        children.
      </P>

      <H2>Changes to this policy</H2>
      <P>
        We may update this policy from time to time. Material changes will be reflected by the
        &ldquo;Last updated&rdquo; date above. Continued use after changes constitutes acceptance.
      </P>

      <H2>Contact</H2>
      <P>
        Questions about this policy? Email{" "}
        <a href="mailto:support@ghostly247.com" className="text-accent hover:underline">
          support@ghostly247.com
        </a>
        .
      </P>

      <div className="mt-12 border-t border-border pt-6 text-sm text-muted-fg">
        See also our{" "}
        <Link href="/terms" className="text-accent hover:underline">
          Terms of Service &amp; Disclaimer
        </Link>
        .
      </div>
    </main>
  );
}
