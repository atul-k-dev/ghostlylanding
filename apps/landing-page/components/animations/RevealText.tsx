"use client";
import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, useGSAP);
}

export const RevealText = ({ text, className = "", as = "div" }: { text: string, className?: string, as?: React.ElementType }) => {
  const container = useRef<HTMLElement>(null);
  const Component = as;
  
  // Custom split text by words
  const words = text.split(" ");

  useGSAP(() => {
    if (!container.current) return;
    const elements = container.current.querySelectorAll('.reveal-word');
    
    gsap.fromTo(elements, 
      { y: "100%", opacity: 0 },
      {
        scrollTrigger: {
          trigger: container.current,
          start: "top 90%",
          toggleActions: "play none none reverse",
        },
        y: "0%",
        opacity: 1,
        duration: 0.8,
        stagger: 0.02,
        ease: "power3.out",
      }
    );
  }, { scope: container });

  return (
    <Component ref={container} className={`flex flex-wrap overflow-hidden ${className}`}>
      {words.map((word, i) => (
        <span key={i} className="reveal-word inline-block leading-[1.4] mr-[0.25em] -mt-5">
          {word}
        </span>
      ))}
    </Component>
  );
};
