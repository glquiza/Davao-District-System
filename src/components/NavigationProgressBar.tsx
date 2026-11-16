"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

export function NavigationProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [progress, setProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // When pathname or searchParams change, the navigation has completed
  useEffect(() => {
    if (isVisible) {
      setProgress(100);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setProgress(0);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [pathname, searchParams]);

  // Intercept click on internal links to start progress bar instantly
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;

      const href = target.getAttribute("href");
      const targetAttr = target.getAttribute("target");

      // Only trigger for internal route navigation
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("#") &&
        targetAttr !== "_blank" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.shiftKey &&
        !e.altKey
      ) {
        // If clicking current page with identical search, skip
        const currentUrl = window.location.pathname + window.location.search;
        if (href === currentUrl) return;

        setIsVisible(true);
        setProgress(25);

        // Simulated quick progress increment
        const t1 = setTimeout(() => setProgress(55), 150);
        const t2 = setTimeout(() => setProgress(80), 500);

        return () => {
          clearTimeout(t1);
          clearTimeout(t2);
        };
      }
    }

    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, []);

  if (!isVisible && progress === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-0 left-0 right-0 z-[9999] h-1 pointer-events-none bg-transparent"
    >
      <div
        className="h-full bg-gradient-to-r from-[#303B32] via-[#8C7853] to-[#D4AF37] shadow-[0_0_10px_#D4AF37] transition-all ease-out"
        style={{
          width: `${progress}%`,
          transitionDuration: progress === 100 ? "200ms" : "300ms",
          opacity: isVisible || progress === 100 ? 1 : 0,
        }}
      />
    </div>
  );
}
