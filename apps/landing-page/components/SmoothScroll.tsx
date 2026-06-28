"use client";

import Lenis from "lenis";
import { useEffect } from "react";

export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let rafId = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    };
    rafId = requestAnimationFrame(raf);

    // Lenis takes over scrolling, so native `#hash` anchors stop working — both
    // when arriving with a hash in the URL (e.g. the extension's "How to Use"
    // button → /#how-to-use) and when clicking in-page anchor links. Wire both up.
    const scrollToHash = (hash: string) => {
      if (!hash || hash === "#") return;
      let target: Element | null = null;
      try {
        target = document.querySelector(hash);
      } catch {
        return; // not a valid selector
      }
      if (target) lenis.scrollTo(target as HTMLElement, { offset: 0 });
    };

    // 1) Arrived with a hash in the URL — scroll once layout/images have settled
    //    so the target is at its final position.
    const initialHash = window.location.hash;
    if (initialHash) {
      const run = () => scrollToHash(initialHash);
      if (document.readyState === "complete") {
        setTimeout(run, 200);
      } else {
        window.addEventListener("load", () => setTimeout(run, 200), { once: true });
      }
    }

    // 2) In-page anchor clicks (navbar, footer, CTAs) — scroll smoothly via Lenis.
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.('a[href*="#"]') as
        | HTMLAnchorElement
        | null;
      if (!anchor) return;
      const url = new URL(anchor.href, window.location.href);
      // Only intercept same-page hash links.
      if (url.pathname !== window.location.pathname || !url.hash) return;
      e.preventDefault();
      history.pushState(null, "", url.hash);
      scrollToHash(url.hash);
    };
    document.addEventListener("click", onClick);

    // 3) Back/forward navigation or programmatic hash changes.
    const onHashChange = () => scrollToHash(window.location.hash);
    window.addEventListener("hashchange", onHashChange);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("click", onClick);
      window.removeEventListener("hashchange", onHashChange);
      lenis.destroy();
    };
  }, []);

  return null;
}
