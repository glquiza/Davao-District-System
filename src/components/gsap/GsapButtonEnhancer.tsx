"use client";

import { useEffect } from "react";
import gsap from "gsap";

const INTERACTIVE_SELECTOR =
  'button:not(:disabled), a[class*="rounded-lg"], a[class*="rounded-xl"], a[class*="rounded-full"]';

function isTabPillItem(el: HTMLElement): boolean {
  return el.hasAttribute("data-tab-btn") || el.hasAttribute("data-active");
}

export function GsapButtonEnhancer() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;

    let hoveredEl: HTMLElement | null = null;

    function findInteractive(target: EventTarget | null): HTMLElement | null {
      if (!(target instanceof Element)) return null;
      const el = target.closest(INTERACTIVE_SELECTOR);
      if (!(el instanceof HTMLElement)) return null;
      if (el instanceof HTMLButtonElement && el.disabled) return null;
      return el;
    }

    function onPointerOver(e: PointerEvent) {
      if (e.pointerType === "touch") return;
      const el = findInteractive(e.target);
      if (el === hoveredEl) return;

      if (hoveredEl && (!el || !hoveredEl.contains(el))) {
        gsap.to(hoveredEl, {
          y: 0,
          scale: 1,
          duration: 0.2,
          ease: "power2.out",
          overwrite: "auto",
          clearProps: "transform",
        });
      }

      hoveredEl = el;
      if (!el || isTabPillItem(el)) return;

      gsap.to(el, {
        y: -1,
        scale: 1.005,
        duration: 0.18,
        ease: "power2.out",
        overwrite: "auto",
      });
    }

    function onPointerOut(e: PointerEvent) {
      if (!hoveredEl) return;
      const next = findInteractive(e.relatedTarget);
      if (next === hoveredEl) return;

      const leaving = hoveredEl;
      hoveredEl = null;

      gsap.to(leaving, {
        y: 0,
        scale: 1,
        duration: 0.2,
        ease: "power2.out",
        overwrite: "auto",
        clearProps: "transform",
      });
    }

    function onPointerDown(e: PointerEvent) {
      const el = findInteractive(e.target);
      if (!el) return;

      gsap.to(el, {
        y: 0,
        scale: 0.985,
        duration: 0.15,
        ease: "power2.out",
        overwrite: "auto",
      });
    }

    function onPointerUp(e: PointerEvent) {
      const el = findInteractive(e.target) ?? hoveredEl;
      if (!el) return;

      if (isTabPillItem(el)) {
        gsap.to(el, {
          scale: 1,
          duration: 0.2,
          ease: "power2.out",
          overwrite: "auto",
          clearProps: "transform",
        });
        return;
      }

      const stillHovered = e.pointerType !== "touch" && el === hoveredEl;
      gsap.to(el, {
        y: stillHovered ? -1 : 0,
        scale: stillHovered ? 1.005 : 1,
        duration: 0.22,
        ease: "power2.out",
        overwrite: "auto",
        ...(stillHovered ? {} : { clearProps: "transform" }),
      });
    }

    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointerup", onPointerUp, { passive: true });
    document.addEventListener("pointercancel", onPointerUp, { passive: true });

    return () => {
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("pointerout", onPointerOut);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  return null;
}
