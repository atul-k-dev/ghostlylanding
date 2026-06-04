"use client";
import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export const FadeInStagger = ({ children, className = "", stagger = 0.1, y = 50 }: { children: React.ReactNode, className?: string, stagger?: number, y?: number }) => {
  const container = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    if (!container.current) return;
    
    const childrenNodes = container.current.children;
    if (childrenNodes.length === 0) return;

    gsap.fromTo(childrenNodes, 
      { y: y, opacity: 0 },
      {
        scrollTrigger: {
          trigger: container.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
        y: 0,
        opacity: 1,
        duration: 0.8,
        stagger: stagger,
        ease: "power3.out",
      }
    );
  }, { scope: container });

  return (
    <div ref={container} className={className}>
      {children}
    </div>
  );
};

export const FadeIn = ({ children, className = "", y = 30, delay = 0, duration = 0.8, as = "div" }: { children: React.ReactNode, className?: string, y?: number, delay?: number, duration?: number, as?: React.ElementType }) => {
  const container = useRef<HTMLElement>(null);
  const Component = as;

  useGSAP(() => {
    if (!container.current) return;
    
    gsap.fromTo(container.current, 
      { y: y, opacity: 0 },
      {
        scrollTrigger: {
          trigger: container.current,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
        y: 0,
        opacity: 1,
        duration: duration,
        delay: delay,
        ease: "power3.out",
      }
    );
  }, { scope: container });

  return (
    <Component ref={container} className={className}>
      {children}
    </Component>
  );
};
