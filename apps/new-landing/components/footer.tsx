import Link from "next/link";
import Image from "next/image";
import {
  ExternalIcon,
  GitHubIcon,
  LinkedInIcon,
  MailIcon,
  XIcon,
  YouTubeIcon,
} from "./brand-icons";
import { FOOTER_COLUMNS, SITE, SOCIALS, type FooterLink } from "@/lib/site";

/**
 * Site footer.
 *
 * Two layers: a soft grey shell holding a raised white card (brand + link
 * columns), with the legal line sitting in the shell below the card. Under it,
 * the glass "GHOSTLY" wordmark image as a decorative sign-off.
 *
 * Spacing is done with flex gaps and inline styles, not margin utilities:
 * globals.css resets `p { margin: 0 }` outside any cascade layer, which beats
 * Tailwind's layered `mt-*` / `mb-*` classes.
 */

const SOCIAL_ICONS: Record<string, (p: { className?: string }) => React.ReactElement> = {
  x: XIcon,
  youtube: YouTubeIcon,
  linkedin: LinkedInIcon,
  github: GitHubIcon,
};

const BODY_TEXT: React.CSSProperties = {
  fontFamily: "var(--font-jost), sans-serif",
  fontSize: 15,
  lineHeight: "22px",
  fontWeight: 400,
  letterSpacing: "-0.005em",
};

/** Internal routes go through <Link>; mail and off-site links stay anchors. */
function FooterAnchor({ link }: { link: FooterLink }) {
  const offSite = link.external || link.href.startsWith("mailto:");

  const inner = (
    <>
      {link.label}
      {link.external ? <ExternalIcon className="h-3 w-3 opacity-0 transition-opacity group-hover/link:opacity-100" /> : null}
    </>
  );

  const className =
    "group/link inline-flex w-fit items-center gap-1.5 text-[color:var(--ink)] transition-colors hover:text-[color:var(--muted)]";

  return offSite ? (
    <a
      href={link.href}
      className={className}
      style={BODY_TEXT}
      {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {inner}
    </a>
  ) : (
    <Link href={link.href} className={className} style={BODY_TEXT}>
      {inner}
    </Link>
  );
}

const SQUARE_BUTTON =
  "flex h-11 w-11 items-center justify-center rounded-[12px] transition-all hover:-translate-y-0.5";

const SQUARE_BUTTON_STYLE: React.CSSProperties = {
  background: "#ffffff",
  color: "var(--ink)",
  border: "1px solid #e4e7ea",
  boxShadow: "0 1px 2px rgba(9,11,12,0.05)",
};

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <div className="flex w-full max-w-[1600px] flex-col px-4 sm:px-6 lg:px-8">
      {/* ---- grey shell ---- */}
      <footer
        className="relative z-[1] w-full overflow-hidden"
        style={{
          padding: 4,
          background: "#eceef0",
          borderRadius: 32,
          border: "1px solid #e2e5e8",
        }}
      >
        {/* ---- white card: brand + link columns ---- */}
        <div
          className="grid grid-cols-2 gap-x-6 gap-y-10 px-5 py-8 sm:gap-y-12 sm:px-10 sm:py-10 sm:grid-cols-3 sm:px-10 lg:grid-cols-[1fr_repeat(3,minmax(140px,170px))] lg:gap-x-6 lg:px-14 lg:py-14"
          style={{
            background: "#ffffff",
            borderRadius: 28,
            border: "1px solid #e6e8eb",
            boxShadow: "0 1px 2px rgba(9,11,12,0.04), 0 6px 18px rgba(9,11,12,0.04)",
          }}
        >
          {/* brand */}
          <div className="col-span-2 flex flex-col items-start sm:col-span-3 lg:col-span-1" style={{ gap: 36 }}>
            <div className="flex flex-col items-start" style={{ gap: 20 }}>
              <Link
                href="/"
                className="flex items-center gap-2.5"
                style={{
                  color: "var(--ink)",
                  fontFamily: "var(--font-urbanist), sans-serif",
                  fontWeight: 800,
                  fontSize: 26,
                  lineHeight: "32px",
                  letterSpacing: "-0.02em",
                }}
              >
                <Image
                  src="/logo.png"
                  alt=""
                  width={34}
                  height={34}
                  className="h-[34px] w-[34px] rounded-[9px] object-cover"
                />
                <span>
                  Ghostly <span style={{ color: "var(--muted-2)" }}>247</span>
                </span>
              </Link>

              <p className="max-w-[300px]" style={{ ...BODY_TEXT, lineHeight: "24px", color: "var(--muted)" }}>
                Likes, replies, follows and posts for you on X — in your own
                voice, from your own browser.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {SOCIALS.map((s) => {
                const Icon = SOCIAL_ICONS[s.id];
                if (!Icon) return null;
                return (
                  <a
                    key={s.id}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={s.label}
                    title={s.label}
                    className={SQUARE_BUTTON}
                    style={SQUARE_BUTTON_STYLE}
                  >
                    <Icon />
                  </a>
                );
              })}

              <a
                href={`mailto:${SITE.email}`}
                aria-label={`Email ${SITE.email}`}
                title={SITE.email}
                className={SQUARE_BUTTON}
                style={SQUARE_BUTTON_STYLE}
              >
                <MailIcon />
              </a>
            </div>
          </div>

          {/* link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <nav
              key={col.header}
              aria-label={col.header}
              className="flex flex-col items-start"
              style={{ gap: 22, paddingTop: 4 }}
            >
              <p style={{ ...BODY_TEXT, fontSize: 14, color: "var(--muted)" }}>{col.header}</p>
              <div className="flex flex-col items-start" style={{ gap: 12 }}>
                {col.links.map((l) => (
                  <FooterAnchor key={l.label} link={l} />
                ))}
              </div>
            </nav>
          ))}
        </div>

        {/* ---- bottom bar, in the shell ---- */}
        <div
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-5 sm:px-10 lg:px-14"
          style={{ paddingBlock: 24 }}
        >
          <p style={{ ...BODY_TEXT, color: "var(--muted)" }}>
            © {year} {SITE.shortName}. All rights reserved.
          </p>

          <div className="flex flex-wrap items-center gap-y-2" style={{ ...BODY_TEXT, color: "var(--muted)" }}>
            <Link href="/privacy" className="transition-colors hover:text-[color:var(--ink)]">
              Privacy Policy
            </Link>
            <span aria-hidden="true" className="h-4 w-px" style={{ marginInline: 14, background: "#d5d9dd" }} />
            <Link href="/terms" className="transition-colors hover:text-[color:var(--ink)]">
              Terms &amp; Conditions
            </Link>
            <span aria-hidden="true" className="h-4 w-px" style={{ marginInline: 14, background: "#d5d9dd" }} />
            <span className="!hidden">
              Built by{" "}
              <a
                href="https://www.buildstory.studio/"
                target="_blank"
                rel="noreferrer"
                className="font-medium underline-offset-4 transition-colors hover:underline"
                style={{ color: "var(--ink)" }}
              >
                BuildStory
              </a>
            </span>
          </div>
        </div>
      </footer>

      {/* Giant glass wordmark, purely decorative. */}
      <div
        aria-hidden="true"
        className="pointer-events-none flex w-full select-none justify-center px-2 pb-0 pt-5"
        
      >
        <Image
          src="/footername.png"
          alt=""
          width={2083}
          height={385}
          sizes="(min-width: 1280px) 1500px, 92vw"
          className="h-auto w-full max-w-[1500px]"
          style={{
            filter:
              "drop-shadow(0 2px 1px rgba(9,11,12,0.06)) drop-shadow(0 24px 30px rgba(9,11,12,0.08))",
          }}
        />
      </div>
    </div>
  );
}
