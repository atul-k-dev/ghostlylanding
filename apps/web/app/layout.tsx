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
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://casperaii.vercel.app";
const TITLE = "Casper AI — Grow your Twitter & LinkedIn while you sleep";
const DESCRIPTION =
  "The friendly little ghost that likes, comments, and follows in your tone. A browser extension built for solo creators, not sales teams. Twitter + LinkedIn under one license.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: "%s · Casper AI",
  },
  description: DESCRIPTION,
  applicationName: "Casper AI",
  authors: [{ name: "Casper AI" }],
  creator: "Casper AI",
  publisher: "Casper AI",
  category: "technology",
  keywords: [
    "Casper AI",
    "Twitter automation",
    "LinkedIn automation",
    "AI comments",
    "social media growth",
    "browser extension",
    "auto-like",
    "auto-follow",
    "creator tools",
    "indie creators",
    "personal branding",
    "voice training AI",
    "X automation",
  ],
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: [
      { url: "/logo.png", sizes: "any" },
      { url: "/logo.png", type: "image/png" },
    ],
    shortcut: "/logo.png",
    apple: { url: "/logo.png", sizes: "180x180" },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Casper AI",
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Casper AI — the friendly ghost that grows your socials while you sleep",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/logo.png"],
    creator: "@casperaiapp",
    site: "@casperaiapp",
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
      name: "Casper AI",
      url: SITE_URL,
      logo: `${SITE_URL}/logo.png`,
      sameAs: [
        "https://twitter.com/casperaiapp",
        "https://linkedin.com/company/casperaiapp",
      ],
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}#site`,
      url: SITE_URL,
      name: "Casper AI",
      description: DESCRIPTION,
      publisher: { "@id": `${SITE_URL}#org` },
    },
    {
      "@type": "SoftwareApplication",
      name: "Casper AI",
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
          price: "19.99",
          priceCurrency: "USD",
          name: "Pro Monthly",
        },
        {
          "@type": "Offer",
          price: "199.99",
          priceCurrency: "USD",
          name: "Pro Yearly",
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
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
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
