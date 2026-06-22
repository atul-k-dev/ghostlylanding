"use client";
import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export const NumberTicker = ({
  value,
  prefix = "",
  suffix = "",
  duration = 2,
  decimals = 0,
  className = "",
}: {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  decimals?: number;
  className?: string;
}) => {
  const nodeRef = useRef<HTMLSpanElement>(null);
  const played = useRef(false);

  useEffect(() => {
    const el = nodeRef.current;
    if (!el) return;

    const render = (v: number) => {
      el.innerText = `${prefix}${v.toFixed(decimals)}${suffix}`;
    };
    render(0);

    // Count up the first time the element scrolls into view. IntersectionObserver
    // (unlike GSAP ScrollTrigger) fires reliably even when the element is already
    // visible on mount and is immune to layout shifts from the hero video/fonts.
    const animate = () => {
      if (played.current) return;
      played.current = true;
      const obj = { val: 0 };
      gsap.to(obj, {
        val: value,
        duration,
        ease: "power2.out",
        onUpdate: () => render(obj.val),
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            animate();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.2 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [value, prefix, suffix, duration, decimals]);

  return (
    <span ref={nodeRef} className={className}>
      {prefix}0{suffix}
    </span>
  );
};
