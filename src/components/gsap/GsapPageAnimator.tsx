"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function GsapPageAnimator({
  children,
  triggerKey,
  className = "",
}: {
  children: React.ReactNode;
  triggerKey?: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

      const heroes = gsap.utils.toArray<HTMLElement>('[data-gsap="hero"]');
      const items = gsap.utils.toArray<HTMLElement>('[data-gsap="item"]');

      if (heroes.length > 0) {
        tl.from(heroes, {
          y: 10,
          opacity: 0,
          duration: 0.26,
          stagger: 0.04,
          clearProps: "transform,opacity",
        });
      }

      if (items.length > 0) {
        tl.from(
          items,
          {
            y: 12,
            opacity: 0,
            duration: 0.28,
            stagger: 0.04,
            clearProps: "transform,opacity",
          },
          heroes.length > 0 ? "-=0.16" : 0
        );
      }
    },
    { scope: containerRef, dependencies: [triggerKey] }
  );

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}
