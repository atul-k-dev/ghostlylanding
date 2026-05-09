import type { Metadata } from "next";
import { Bowlby_One_SC, Inter } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Casper AI — Grow your Twitter & LinkedIn while you sleep",
  description:
    "The friendly little ghost that likes, comments, and follows in your tone. A browser extension built for solo creators, not sales teams.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable}`}>
      <body className="relative">{children}</body>
    </html>
  );
}
