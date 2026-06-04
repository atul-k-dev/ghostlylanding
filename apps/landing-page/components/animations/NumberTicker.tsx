"use client";
import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export const NumberTicker = ({ value, prefix = "", suffix = "", duration = 2, decimals = 0, className = "" }: { value: number, prefix?: string, suffix?: string, duration?: number, decimals?: number, className?: string }) => {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    if (!nodeRef.current) return;
    
    const obj = { val: 0 };
    
    gsap.to(obj, {
      scrollTrigger: {
        trigger: nodeRef.current,
        start: "top 90%",
      },
      val: value,
      duration: duration,
      ease: "power2.out",
      onUpdate: () => {
        if (nodeRef.current) {
          nodeRef.current.innerText = `${prefix}${obj.val.toFixed(decimals)}${suffix}`;
        }
      }
    });
  }, { scope: nodeRef });

  return (
    <span ref={nodeRef} className={className}>
      {prefix}0{suffix}
    </span>
  );
};
