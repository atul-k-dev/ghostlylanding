import type { Metadata, Viewport } from "next";
import { Urbanist, Jost } from "next/font/google";
import { SITE, SITE_URL } from "@/lib/site";
import "./globals.css";

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

const jost = Jost({
  variable: "--font-jost",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

/**
 * Social crawlers (X, LinkedIn, Facebook, Slack) cache card images by URL, so
 * bump `v` whenever public/og.jpg is replaced or the old image keeps showing.
 * Width/height must match the real file.
 */
const OG_IMAGE = "/og.jpg?v=2";

/**
 * `title.template` lets every sub-page set a bare name — "Privacy policy" —
 * and still render "Privacy policy — Ghostly 247" in the tab and in search
 * results. `metadataBase` is what makes the relative OG image path below
 * resolve to an absolute URL, which is the form crawlers require.
 */
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE.name} — ${SITE.tagline}`,
    template: `%s — ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [
    "X automation",
    "Twitter automation",
    "grow X account",
    "X engagement tool",
    "auto reply X",
    "schedule X posts",
    "Chrome extension",
    "AI replies",
    "creator growth",
  ],
  authors: [{ name: SITE.maker }],
  creator: SITE.maker,
  publisher: SITE.maker,
  alternates: { canonical: "/" },
  category: "technology",
  openGraph: {
    type: "website",
    siteName: SITE.name,
    url: SITE_URL,
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.cardDescription,
    locale: "en_US",
    images: [
      {
        url: OG_IMAGE,
        width: 1900,
        height: 1068,
        alt: "Ghostly 247 — grow your X account while you sleep",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE.name} — ${SITE.tagline}`,
    description: SITE.cardDescription,
    site: SITE.xHandle,
    creator: SITE.xHandle,
    images: [OG_IMAGE],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#e5f3f7",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
};

/**
 * Structured data. SoftwareApplication is what earns the price and rating
 * treatment in results; `offers` carries both billing periods, and the free
 * tier is stated as its own zero-price offer rather than implied.
 */
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      name: SITE.name,
      applicationCategory: "BrowserApplication",
      operatingSystem: "Chrome",
      url: SITE_URL,
      description: SITE.cardDescription,
      image: `${SITE_URL}${OG_IMAGE}`,
      installUrl: SITE.chromeStoreUrl,
      offers: [
        {
          "@type": "Offer",
          name: "Free",
          price: "0",
          priceCurrency: "USD",
          description: "50 actions a month, every feature included.",
        },
        {
          "@type": "Offer",
          name: "Pro · Weekly",
          price: "2.99",
          priceCurrency: "USD",
          description: "Unlimited actions, billed weekly.",
        },
        {
          "@type": "Offer",
          name: "Pro · Monthly",
          price: "7.99",
          priceCurrency: "USD",
          description: "Unlimited actions, billed monthly.",
        },
      ],
      publisher: { "@type": "Organization", name: SITE.maker, url: SITE.makerUrl },
    },
    {
      "@type": "WebSite",
      name: SITE.name,
      url: SITE_URL,
      publisher: { "@type": "Organization", name: SITE.maker, url: SITE.makerUrl },
    },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${urbanist.variable} ${jost.variable}`}>
      <body>
        <script
          type="application/ld+json"
          // Static, author-controlled object — no user input reaches this.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
