"use client";

import { useRef } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function AnimatedCounter({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const spanRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = spanRef.current;
      if (!el) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.textContent = String(value);
        return;
      }

      const counter = { val: 0 };
      gsap.to(counter, {
        val: value,
        duration: 0.3,
        ease: "power2.out",
        onUpdate: () => {
          if (el) {
            el.textContent = String(Math.round(counter.val));
          }
        },
      });
    },
    { dependencies: [value] }
  );

  return (
    <span ref={spanRef} className={className}>
      {value}
    </span>
  );
}
