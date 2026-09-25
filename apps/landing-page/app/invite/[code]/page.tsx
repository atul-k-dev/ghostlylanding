import type { Metadata } from "next";
import Link from "next/link";
import { InviteClient } from "@/components/InviteClient";
import { InviteShell, primaryButton } from "@/components/InviteShell";
import { lookupInvite, normalizeCode } from "@/lib/referral";

type Props = { params: Promise<{ code: string }> };

const DEFAULT_BONUS = 10;

/** Personal pages — never indexed. Link previews (OG/Twitter) still work:
 *  noindex doesn't stop a crawler reading the tags, only listing the page. */
const NOINDEX = { index: false, follow: false, googleBot: { index: false, follow: false } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const code = normalizeCode((await params).code);
  const invite = code ? await lookupInvite(code) : null;
  const name = invite?.valid ? invite.inviterName : null;
  const bonus = invite?.valid ? invite.bonusCredits : DEFAULT_BONUS;
  const title = name ? `${name} invited you to Ghostly247` : "You're invited to Ghostly247";
  const description = `Grow your Twitter / X while you sleep. Sign up with this invite and get +${bonus} bonus credits.`;
  const image = { url: "/opengraph.png?v=1", width: 1200, height: 630, alt: title };
  return {
    title: { absolute: title },
    description,
    robots: NOINDEX,
    alternates: { canonical: null },
    openGraph: { type: "website", siteName: "Ghostly247", url: code ? `/invite/${code}` : undefined, title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image], site: "@ghostly247" },
  };
}

export default async function InvitePage({ params }: Props) {
  const code = normalizeCode((await params).code);
  const invite = code ? await lookupInvite(code) : null;

  // Known bad: say so, but still let them install. (Unknown — the API didn't
  // answer — is treated as good: the server ignores a bad code at sign-up
  // anyway, so the worst case is a friendly page for a code that earns nothing.)
  if (!code || invite?.valid === false) {
    return (
      <InviteShell eyebrow="Invite">
        <h1 className="font-aeonik text-4xl leading-[1.1] font-light tracking-[-0.02em] text-fg sm:text-5xl">
          This invite link <span className="text-iron-slate">isn&rsquo;t valid.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-md font-inter text-lg text-halo-pale">
          It may have been mistyped. You can still try Ghostly247 for free.
        </p>
        <div className="mt-10">
          <Link href="/" className={primaryButton}>
            See Ghostly247
          </Link>
        </div>
      </InviteShell>
    );
  }

  const name = invite?.inviterName ?? null;
  const bonus = invite?.bonusCredits ?? DEFAULT_BONUS;
  return (
    <InviteShell eyebrow="You're invited">
      <h1 className="font-aeonik text-4xl leading-[1.1] font-light tracking-[-0.02em] text-fg sm:text-6xl">
        {name ? (
          <>
            {name} <span className="text-iron-slate">invited you</span>
          </>
        ) : (
          <>
            You&rsquo;ve been <span className="text-iron-slate">invited</span>
          </>
        )}
      </h1>
      <p className="mx-auto mt-6 max-w-md font-inter text-lg text-halo-pale">
        Ghostly247 grows your Twitter / X while you sleep. Sign up with this invite and get{" "}
        <span className="font-semibold text-ghost-white">+{bonus} bonus credits</span> — extra actions on top of the free
        plan.
      </p>
      <InviteClient code={code} bonusCredits={bonus} />
    </InviteShell>
  );
}
