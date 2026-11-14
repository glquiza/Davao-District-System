"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function FlashBanner({
  message,
  error,
}: {
  message?: string;
  error?: string;
}) {
  const [visibleMessage, setVisibleMessage] = useState<string | undefined>(message);
  const [visibleError, setVisibleError] = useState<string | undefined>(error);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleMessage(message);
  }, [message]);

  useEffect(() => {
    setVisibleError(error);
  }, [error]);

  useGSAP(
    () => {
      if (!wrapperRef.current || (!visibleMessage && !visibleError)) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      gsap.fromTo(
        wrapperRef.current,
        { y: -8, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.25, ease: "power2.out", clearProps: "transform" }
      );

      if (visibleMessage && progressRef.current) {
        gsap.fromTo(
          progressRef.current,
          { scaleX: 1 },
          {
            scaleX: 0,
            transformOrigin: "left center",
            duration: 6,
            ease: "none",
            onComplete: () => setVisibleMessage(undefined),
          }
        );
      }
    },
    { scope: wrapperRef, dependencies: [visibleMessage, visibleError] }
  );

  function dismiss(kind: "message" | "error") {
    if (!wrapperRef.current) {
      if (kind === "message") setVisibleMessage(undefined);
      else setVisibleError(undefined);
      return;
    }
    gsap.to(wrapperRef.current, {
      opacity: 0,
      y: -6,
      duration: 0.2,
      ease: "power2.in",
      onComplete: () => {
        if (kind === "message") setVisibleMessage(undefined);
        else setVisibleError(undefined);
      },
    });
  }

  if (!visibleMessage && !visibleError) return null;

  return (
    <div ref={wrapperRef} className="space-y-2.5 mb-6">
      {visibleMessage && (
        <div className="relative overflow-hidden rounded-xl border border-[#D6C6A5] bg-white px-4 py-3.5 text-sm text-[#202820] shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 mt-0.5 shrink-0 text-[#303B32]" />
              <span className="font-medium">{visibleMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => dismiss("message")}
              className="rounded-md p-1 text-[#636B62] hover:bg-[#F0ECE3] hover:text-[#202820]"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div
            ref={progressRef}
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#303B32]/50"
          />
        </div>
      )}

      {visibleError && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-[#C9A69B] bg-[#FAF4F2] px-4 py-3.5 text-sm text-[#5C2B22] shadow-sm">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="h-5 w-5 mt-0.5 shrink-0 text-[#7A382C]" />
            <span className="font-medium">{visibleError}</span>
          </div>
          <button
            type="button"
            onClick={() => dismiss("error")}
            className="rounded-md p-1 text-[#7A382C] hover:bg-[#F2E6E2]"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
