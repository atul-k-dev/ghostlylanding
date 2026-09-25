"use client";

import { useEffect, type ReactNode } from "react";
import { MotionConfig, motion, useReducedMotion } from "motion/react";
import Lenis from "lenis";

/** Applies the viewer's reduced-motion preference to every animation below it. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/**
 * Lenis momentum scrolling — the export ships with `class="lenis"` on <html>
 * and a "Smooth Scroll" code component, so the original page scrolls this way.
 */
export function SmoothScroll() {
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });

    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, [reduced]);

  return null;
}

/**
 * Section reveal. Framer's runtime left every section marked up as
 * `opacity: 0; transform: translateY(32px)` waiting to be animated in, so
 * that is exactly the transition reproduced here.
 */
export function Reveal({
  children,
  delay = 0,
  y = 32,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "section" | "li";
}) {
  const MotionTag = motion[as];

  /*
    No reduced-motion branch here on purpose: reading the media query during
    render disagrees with SSR and trips a hydration mismatch. The root
    <MotionConfig reducedMotion="user"> handles the preference instead.
  */
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15, margin: "0px 0px -80px 0px" }}
      transition={{ duration: 0.7, delay, ease: [0.44, 0, 0.22, 1] }}
    >
      {children}
    </MotionTag>
  );
}

/** Slow idle bob used by the mascots and blobs scattered around the page. */
export function Float({
  children,
  distance = 12,
  duration = 6,
  delay = 0,
  className,
}: {
  children: ReactNode;
  distance?: number;
  duration?: number;
  delay?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      animate={{ y: [0, -distance, 0] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{ width: "100%", height: "100%" }}
    >
      {children}
    </motion.div>
  );
}
