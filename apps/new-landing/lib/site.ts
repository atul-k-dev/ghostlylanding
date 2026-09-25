/**
 * One description of the site: the canonical URL, the copy search engines and
 * social cards read, and the link map the footer and sitemap both walk.
 *
 * Keeping the route list here (rather than inline in the footer) is what stops
 * the sitemap from drifting out of step with the navigation — a page that
 * exists but is never linked or listed is a page nobody finds.
 */

/**
 * Canonical origin, including the `www.` host — the canonical tags, OG image
 * URLs, sitemap and robots all build from this, and pointing half of them at
 * the apex would split ranking signals between two hosts. Set
 * NEXT_PUBLIC_SITE_URL to override on a preview deploy.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.ghostly247.com";

export const SITE = {
  name: "Ghostly 247",
  /** Used where a single token reads better than the spaced wordmark. */
  shortName: "Ghostly247",
  tagline: "Grow your X account while you sleep",
  description:
    "Ghostly247 likes, replies, follows and posts on X for you — in your own voice, from your own browser. You approve everything, every action is logged, and it stops in two seconds. Free for 50 actions a month.",
  /** Trimmed for cards, which clip around 160-200 characters. */
  cardDescription:
    "A Chrome extension that likes, replies, follows and posts on X in your own voice — from your own browser, at a human pace. Free for 50 actions a month.",
  email: "support@ghostly247.com",
  xHandle: "@ghostly247",
  /**
   * Where every "Add to Chrome" goes. These all used to point at `#install`,
   * an anchor no section on the site ever defined — so the primary conversion
   * button on seven separate places did nothing at all when clicked.
   */
  chromeStoreUrl:
    "https://chromewebstore.google.com/detail/ghostly247-%E2%80%94-twitterx-gro/olfnjmpoacjchlklmdlaimpckblmokga",
  /** The studio credit in the footer's bottom bar. */
  maker: "BuildStory",
  makerUrl: "https://www.buildstory.studio/",
} as const;

/**
 * Socials we can actually point at. An icon linking to `#` is worse than no
 * icon, so add a row here only once the account exists — the footer renders
 * exactly what this array holds.
 */
export const SOCIALS = [
  { id: "x", label: "Ghostly247 on X", href: "https://x.com/ghostly247" },
  // { id: "youtube",  label: "Ghostly247 on YouTube",  href: "" },
  // { id: "linkedin", label: "Ghostly247 on LinkedIn", href: "" },
  // { id: "github",   label: "Ghostly247 on GitHub",   href: "" },
] as const;

export type FooterLink = {
  label: string;
  href: string;
  /** Leaves the site — gets an arrow and rel="noreferrer". */
  external?: boolean;
};

export const FOOTER_COLUMNS: { header: string; links: FooterLink[] }[] = [
  {
    header: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "Safety", href: "/#safety" },
      { label: "Pricing", href: "/#pricing" },
      { label: "How it works", href: "/#how" },
      { label: "Changelog", href: "/changelog" },
    ],
  },
  {
    header: "Support",
    links: [
      { label: "Help & docs", href: "/docs" },
      { label: "FAQ", href: "/#faq" },
      { label: "Contact support", href: `mailto:${SITE.email}` },
      { label: "Status", href: "/status" },
    ],
  },
  {
    header: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy" },
      { label: "Terms of service", href: "/terms" },
      { label: "Refund policy", href: "/refunds" },
      { label: "Delete your data", href: "/data-deletion" },
      { label: "Subprocessors", href: "/subprocessors" },
    ],
  },
];

/** Every real route on the site, for the sitemap. Anchors are not pages. */
export const ROUTES = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/docs", priority: 0.7, changeFrequency: "monthly" },
  { path: "/changelog", priority: 0.5, changeFrequency: "weekly" },
  { path: "/status", priority: 0.3, changeFrequency: "daily" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/refunds", priority: 0.3, changeFrequency: "yearly" },
  { path: "/data-deletion", priority: 0.4, changeFrequency: "yearly" },
  { path: "/subprocessors", priority: 0.2, changeFrequency: "yearly" },
] as const;

/**
 * Service status, stated in one place.
 *
 * There is no automated uptime monitor wired up yet, so this is a value a human
 * edits — which is exactly why it lives here rather than being hard-coded as
 * cheerful text in the footer. Flip `level` and write `note`, and both the
 * footer pill and the status page follow. Saying "all systems normal" in markup
 * nobody maintains is how a status indicator ends up lying.
 */
export const STATUS = {
  level: "ok" as "ok" | "degraded" | "down",
  label: "All systems normal",
  note: "No incidents reported.",
  /** ISO date this was last confirmed by a person. */
  checked: "2026-09-13",
} as const;

export const STATUS_COMPONENTS = [
  { name: "API", detail: "Accounts, settings sync, action logging." },
  { name: "AI replies", detail: "Reply, quote and post generation." },
  { name: "Billing", detail: "Checkout and the Stripe billing portal." },
  { name: "Email", detail: "Password resets and account mail." },
] as const;
