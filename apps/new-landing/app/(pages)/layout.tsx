import type { ReactNode } from "react";
import { SiteNav } from "@/components/site-nav";
import { Footer } from "@/components/footer";

/**
 * Chrome shared by every standalone page — legal, docs, changelog, status.
 *
 * The route group keeps these off the marketing page's component stack while
 * still giving them the same nav and footer, so a reader who lands on /privacy
 * from a search result can get back into the product.
 */
export default function PagesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SiteNav />
      <main className="flex w-full flex-col items-center">{children}</main>
      <div className="flex w-full justify-center pb-[60px] pt-10">
        <Footer />
      </div>
    </>
  );
}
