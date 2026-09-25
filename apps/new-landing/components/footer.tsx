import Link from "next/link";
import Image from "next/image";
import {
  ExternalIcon,
  GitHubIcon,
  LinkedInIcon,
  MailIcon,
  StatusDot,
  XIcon,
  YouTubeIcon,
} from "./brand-icons";
import { FOOTER_COLUMNS, SITE, SOCIALS, STATUS, type FooterLink } from "@/lib/site";

/**
 * Site footer.
 *
 * The version this replaces had three problems worth naming: its socials were
 * literal text characters ("f", "▶", "✕", "in") labelled "Social link 1" for
 * screen readers, its link columns were squeezed into whatever space the brand
 * block left over, and the whole thing sat inside the CTA component so the two
 * couldn't be styled apart. This is a four-column grid that holds its shape
 * down to phone width, with real icons, real labels, and a bottom bar that
 * separates the legal line from the studio credit.
 */

const SOCIAL_ICONS: Record<string, (p: { className?: string }) => React.ReactElement> = {
  x: XIcon,
  youtube: YouTubeIcon,
  linkedin: LinkedInIcon,
  github: GitHubIcon,
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
    "group/link inline-flex w-fit items-center gap-1.5 py-1 text-[color:var(--muted)] transition-colors hover:text-[color:var(--ink)]";

  return offSite ? (
    <a
      href={link.href}
      className={className}
      {...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
    >
      {inner}
    </a>
  ) : (
    <Link href={link.href} className={className}>
      {inner}
    </Link>
  );
}

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <div className="flex w-full max-w-[1600px] flex-col px-5">
      <footer
        className="relative z-[1] w-full overflow-hidden"
        style={{
          background: "var(--card-80)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderRadius: 28,
          border: "1px solid var(--line)",
        }}
      >
        {/* ---- main grid: brand + three link columns ----
            Mobile-first: two columns on a phone, three from 640, and only at
            1024 does the brand take a column of its own beside the links. An
            arbitrary `grid-cols-[...]` template here with max-* overrides did
            not reliably lose to its own overrides, and the min track widths
            pushed the card past the viewport on a phone. */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-9 p-6 sm:grid-cols-3 sm:gap-x-6 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:gap-x-10 lg:gap-y-12 lg:p-10">
          {/* brand */}
          <div className="col-span-2 flex flex-col items-start gap-5 sm:col-span-3 lg:col-span-1">
            <Link href="/" className="t-logo flex items-center gap-2.5" style={{ color: "var(--ink)" }}>
              <Image
                src="/logo.png"
                alt=""
                width={40}
                height={40}
                className="h-9 w-9 rounded-xl object-cover"
              />
              Ghostly<span style={{ color: "var(--muted-2)" }}>247</span>
            </Link>

            <p className="t-sm max-w-[300px]" style={{ color: "var(--muted)" }}>
              Likes, replies, follows and posts for you on X — in your own
              voice, from your own browser.
            </p>

            {/* status pill — reads the same constant the status page does */}
            <Link
              href="/status"
              className="t-sm inline-flex items-center gap-2 rounded-full px-3 py-1.5 transition-colors"
              style={{ background: "var(--line-2)", color: "var(--zinc)", border: "1px solid var(--line)" }}
            >
              <StatusDot level={STATUS.level} />
              {STATUS.label}
            </Link>

            {/* socials + contact */}
            <div className="flex flex-wrap items-center gap-2">
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
                    className="flex h-9 w-9 items-center justify-center rounded-full transition-all hover:-translate-y-0.5"
                    style={{
                      background: "var(--line-2)",
                      color: "var(--zinc)",
                      border: "1px solid var(--line)",
                    }}
                  >
                    <Icon />
                  </a>
                );
              })}

              <a
                href={`mailto:${SITE.email}`}
                aria-label={`Email ${SITE.email}`}
                title={SITE.email}
                className="flex h-9 items-center gap-2 rounded-full px-3.5 transition-all hover:-translate-y-0.5"
                style={{
                  background: "var(--line-2)",
                  color: "var(--zinc)",
                  border: "1px solid var(--line)",
                }}
              >
                <MailIcon />
                <span className="t-sm">Email us</span>
              </a>
            </div>
          </div>

          {/* link columns */}
          {FOOTER_COLUMNS.map((col) => (
            <nav key={col.header} aria-label={col.header} className="flex flex-col items-start gap-1">
              <p
                className="t-sm-med mb-2 uppercase"
                style={{ color: "var(--ink)", letterSpacing: "0.06em" }}
              >
                {col.header}
              </p>
              {col.links.map((l) => (
                <FooterAnchor key={l.label} link={l} />
              ))}
            </nav>
          ))}
        </div>

        {/* ---- bottom bar ---- */}
        <div
          className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-6 lg:px-10"
          style={{ borderTop: "1px solid var(--line)", background: "var(--line-2)" }}
        >
          <p className="t-sm" style={{ color: "var(--muted)" }}>
            © {year} {SITE.shortName}. Not affiliated with, endorsed by, or
            connected to X Corp.
          </p>

          <p className="t-sm flex items-center gap-1.5" style={{ color: "var(--muted)" }}>
            Made by
            <a
              href={SITE.makerUrl}
              target="_blank"
              rel="noreferrer"
              className="t-sm-med underline-offset-4 transition-colors hover:underline"
              style={{ color: "var(--ink)" }}
            >
              {SITE.maker}
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
