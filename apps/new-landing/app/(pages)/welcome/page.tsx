import type { Metadata } from "next";
import { InviteCard } from "@/components/invite-card";
import { WelcomeClient } from "@/components/welcome-client";

export const metadata: Metadata = {
  title: "Welcome",
  description: "Ghostly247 is installed. Here's how to get started.",
  robots: { index: false, follow: false, googleBot: { index: false, follow: false } },
  alternates: { canonical: null },
};

/** Opened by the extension on first install — see WelcomeClient. */
export default function WelcomePage() {
  return (
    <InviteCard
      eyebrow="Installed"
      title="Welcome to Ghostly247"
      body="You’re three steps away from growing your X account while you sleep."
    >
      <WelcomeClient />
    </InviteCard>
  );
}
