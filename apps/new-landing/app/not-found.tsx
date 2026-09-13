import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

const ELSEWHERE = [
  { label: "Pricing", href: "/#pricing" },
  { label: "Help & docs", href: "/docs" },
  { label: "FAQ", href: "/#faq" },
  { label: "Changelog", href: "/changelog" },
];

export default function NotFound() {
  return (
    <>
      <SiteNav />
      <main className="flex w-full flex-col items-center">
        <div className="mx-auto flex w-full max-w-[760px] flex-col items-center gap-6 px-5 py-24 text-center max-[809px]:py-16">
          <Image
            src="/logo.png"
            alt=""
            width={96}
            height={96}
            className="h-20 w-20 rounded-3xl object-cover"
          />
          <h1 className="t-h2" style={{ color: "var(--ink)", textWrap: "balance" }}>
            This one really is a ghost
          </h1>
          <p className="t-h6 max-w-[480px]" style={{ color: "var(--muted)", textWrap: "balance" }}>
            The page you asked for isn&rsquo;t here. It may have moved, or the
            link may have been wrong to begin with.
          </p>

          <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
            {ELSEWHERE.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                className="t-sm-med rounded-full px-4 py-2 transition-colors"
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--line)",
                  color: "var(--zinc)",
                }}
              >
                {l.label}
              </Link>
            ))}
          </div>

          <Link
            href="/"
            className="t-nav mt-4 inline-flex items-center justify-center rounded-3xl px-6 py-3"
            style={{ background: "var(--brand)", color: "var(--brand-ink)" }}
          >
            Back to the homepage
          </Link>
        </div>
      </main>
      <div className="flex w-full justify-center pb-[60px]">
        <Footer />
      </div>
    </>
  );
}
