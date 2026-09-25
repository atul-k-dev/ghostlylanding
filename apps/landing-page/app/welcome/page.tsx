import type { Metadata } from "next";
import { InviteShell } from "@/components/InviteShell";
import { WelcomeClient } from "@/components/WelcomeClient";

export const metadata: Metadata = {
  title: "Welcome",
  description: "Ghostly247 is installed. Here's how to get started.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: null },
};

export default function WelcomePage() {
  return (
    <InviteShell eyebrow="Installed">
      <h1 className="font-aeonik text-4xl leading-[1.1] font-light tracking-[-0.02em] text-fg sm:text-6xl">
        Welcome to <span className="text-iron-slate">Ghostly247.</span>
      </h1>
      <p className="mx-auto mt-6 max-w-md font-inter text-lg text-halo-pale">
        You&rsquo;re three steps away from growing your X while you sleep.
      </p>
      <WelcomeClient />
    </InviteShell>
  );
}
