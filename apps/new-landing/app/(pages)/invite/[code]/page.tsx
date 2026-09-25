import type { Metadata } from "next";
import { InviteCard } from "@/components/invite-card";
import { InviteClient } from "@/components/invite-client";
import { PrimaryButton } from "@/components/site-nav";
import { SITE } from "@/lib/site";
import { lookupInvite, normalizeCode } from "@/lib/referral";

type Props = { params: Promise<{ code: string }> };

const DEFAULT_BONUS = 10;

/** Personal pages — never indexed. Link previews still work: noindex stops a
 *  page being listed, not a crawler reading its OG/Twitter tags. */
const NOINDEX = { index: false, follow: false, googleBot: { index: false, follow: false } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = normalizeCode((await params).code);
  const invite = code ? await lookupInvite(code) : null;
  const name = invite?.valid ? invite.inviterName : null;
  const bonus = invite?.valid ? invite.bonusCredits : DEFAULT_BONUS;
  const title = name ? `${name} invited you to ${SITE.name}` : `You're invited to ${SITE.name}`;
  const description = `${SITE.tagline}. Sign up with this invite and get +${bonus} bonus credits.`;
  return {
    title: { absolute: title },
    description,
    robots: NOINDEX,
    alternates: { canonical: null },
    openGraph: {
      type: "website",
      siteName: SITE.name,
      url: code ? `/invite/${code}` : undefined,
      title,
      description,
      images: [{ url: "/og.jpg", width: 1200, height: 630, alt: title }],
    },
    twitter: { card: "summary_large_image", title, description, site: SITE.xHandle, images: ["/og.jpg"] },
  };
}

export default async function InvitePage({ params }: Props) {
  const code = normalizeCode((await params).code);
  const invite = code ? await lookupInvite(code) : null;

  // Known bad: say so, but still let them try the product. Unknown (the API
  // didn't answer) is treated as good — the server ignores a bad code at
  // sign-up anyway, so the worst case is a friendly page for a dud code.
  if (!code || invite?.valid === false) {
    return (
      <InviteCard
        eyebrow="Invite"
        title="This invite link isn’t valid"
        body="It may have been mistyped. You can still try Ghostly247 for free."
      >
        <div className="mt-4">
          <PrimaryButton href={SITE.chromeStoreUrl}>Add to Chrome — free</PrimaryButton>
        </div>
      </InviteCard>
    );
  }

  const name = invite?.inviterName ?? null;
  const bonus = invite?.bonusCredits ?? DEFAULT_BONUS;
  return (
    <InviteCard
      eyebrow="You're invited"
      title={name ? `${name} invited you` : "You’ve been invited"}
      body={
        <>
          Ghostly247 grows your X account while you sleep. Sign up with this invite and get{" "}
          <strong style={{ color: "var(--ink)" }}>+{bonus} bonus credits</strong> — extra actions on top of the
          free plan.
        </>
      }
    >
      <InviteClient code={code} bonusCredits={bonus} />
    </InviteCard>
  );
}
