import type { Metadata, Viewport } from "next";
import { Bowlby_One_SC, Inter } from "next/font/google";
import { SmoothScroll } from "@/components/SmoothScroll";
import "./globals.css";

const display = Bowlby_One_SC({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display-loaded",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans-loaded",
  display: "swap",
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://ghostly247.com";
const TITLE = "Ghostly247 — Grow your Twitter / X while you sleep";
const DESCRIPTION =
  "The friendly little ghost that likes, replies, follows, bookmarks, reposts, and quotes in your tone. A Twitter / X browser extension built for solo creators, not sales teams.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Ghostly247",
  },
  description: DESCRIPTION,
  applicationName: "Ghostly247",
  authors: [{ name: "Ghostly247" }],
  creator: "Ghostly247",
  publisher: "Ghostly247",
  category: "technology",
  keywords: [
    "Ghostly247",
    "Twitter automation",
    "X automation",
    "AI replies",
    "social media growth",
    "browser extension",
    "auto-like",
    "auto-follow",
    "auto follow-back",
    "creator tools",
    "indie creators",
    "personal branding",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: { url: "/logo.png", sizes: "180x180" },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Ghostly247",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/opengraph.png?v=1`,
        width: 1200,
        height: 630,
        alt: "Ghostly247 — the friendly ghost that grows your Twitter / X presence while you sleep",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/opengraph.png?v=1`,
        width: 1200,
        height: 630,
        alt: "Ghostly247 — the friendly ghost that grows your Twitter / X presence while you sleep",
      },
    ],
    creator: "@ghostly247",
    site: "@ghostly247",
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
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0e0e0e" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0e" },
  ],
  colorScheme: "dark",
};

const STRUCTURED_DATA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}#org`,
      name: "Ghostly247",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      sameAs: ["https://x.com/ghostly247"],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}#site`,
      url: SITE_URL,
      name: "Ghostly247",
      description: DESCRIPTION,
      publisher: { "@id": `${SITE_URL}#org` },
    },
    {
      "@type": "SoftwareApplication",
      name: "Ghostly247",
      operatingSystem: "Chrome, Brave, Arc",
      applicationCategory: "BrowserApplication",
      url: SITE_URL,
      description: DESCRIPTION,
      offers: [
        {
          "@type": "Offer",
          price: "0",
          priceCurrency: "USD",
          name: "Free",
        },
        {
          "@type": "Offer",
          price: "14.99",
          priceCurrency: "USD",
          name: "Pro Monthly",
        },
      ],
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: "4.9",
        ratingCount: "1000",
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} dark`}>
      <body className="relative">
        <SmoothScroll />
        {children}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(STRUCTURED_DATA) }}
        />
      </body>
    </html>
  );
}
