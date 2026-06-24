import type { Metadata } from "next";
import Link from "next/link";
import { SupportForm } from "@/components/SupportForm";

export const metadata: Metadata = {
  title: "Support — Ghostly247",
  description: "Get help with Ghostly247. Send us a message and we'll get back to you.",
  robots: { index: true, follow: true },
};

export default function SupportPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16 sm:py-20 text-fg">
      <Link href="/" className="text-sm text-muted-fg transition-colors hover:text-fg">
        ← Back to Ghostly247
      </Link>

      <h1 className="mt-6 text-4xl font-bold tracking-tight">
        Contact <span className="text-accent">Support</span>
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-fg">
        Questions, bugs, or billing help? Fill out the form and we&rsquo;ll reply to your email.
      </p>

      <SupportForm />

      <div className="mt-12 border-t border-border pt-6 text-sm text-muted-fg">
        See our{" "}
        <Link href="/privacy" className="text-accent hover:underline">
          Privacy Policy
        </Link>{" "}
        and{" "}
        <Link href="/terms" className="text-accent hover:underline">
          Terms &amp; Disclaimer
        </Link>
        .
      </div>
    </main>
  );
}
