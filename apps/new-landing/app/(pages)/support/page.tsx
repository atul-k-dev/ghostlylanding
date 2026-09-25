import type { Metadata } from "next";
import { A, DocShell, H2, P, UL } from "@/components/page-kit";
import { SupportForm } from "@/components/support-form";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support",
  description: `Get help with ${SITE.shortName}: contact support, find answers, or report a problem with the Chrome extension.`,
  alternates: { canonical: "/support" },
  robots: { index: true, follow: true },
};

/**
 * The support page the Chrome Web Store listing links to — a real, reachable
 * way to contact us, not only a mailto.
 */
export default function SupportPage() {
  return (
    <DocShell
      eyebrow="Support"
      title="Contact support"
      intro={
        <>
          Questions, a bug, or help with billing? Send us a message and we&rsquo;ll reply to your email —
          usually within one working day.
        </>
      }
    >
      <SupportForm />

      <H2>Other ways to reach us</H2>
      <UL>
        <li>
          Email: <A href={`mailto:${SITE.email}`}>{SITE.email}</A>
        </li>
        <li>
          On X: <A href="https://x.com/ghostly247">{SITE.xHandle}</A>
        </li>
      </UL>

      <H2>Before you write</H2>
      <UL>
        <li>
          <A href="/docs">Help &amp; docs</A> covers setup, limits, safety and the common questions.
        </li>
        <li>
          <A href="/status">Status</A> shows whether our servers are having a problem right now.
        </li>
        <li>
          Inside the extension, <strong>Settings → Report a Problem</strong> emails us with your version
          number filled in, and <strong>Settings → Diagnostics</strong> lists recent errors — including those
          in your message helps us fix things faster.
        </li>
      </UL>

      <H2>Billing and your data</H2>
      <P>
        Refunds are covered in our <A href="/refunds">refund policy</A>. To delete your account and every piece of
        data tied to it, see <A href="/data-deletion">Delete your data</A>. How we handle data is in the{" "}
        <A href="/privacy">privacy policy</A>.
      </P>
    </DocShell>
  );
}
