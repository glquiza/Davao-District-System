"use client";

import { useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

export function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const labelRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!labelRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        return;
      gsap.fromTo(
        labelRef.current,
        { opacity: 0.4, y: 2 },
        { opacity: 1, y: 0, duration: 0.2, ease: "power2.out", clearProps: "transform,opacity" }
      );
    },
    { dependencies: [copied] }
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fallback ignored
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${
        copied
          ? "border-[#303B32] bg-[#303B32] text-[#F5F1E9]"
          : "border-[#D6C6A5] bg-white text-[#303B32] hover:bg-[#F0ECE3]"
      }`}
      title="Copy invitation code"
    >
      <span ref={labelRef} className="inline-flex items-center gap-1.5">
        {copied ? (
          <>
            <Check className="h-3.5 w-3.5 text-[#D6C6A5]" />
            <span>Copied</span>
          </>
        ) : (
          <>
            <Copy className="h-3.5 w-3.5" />
            <span>Copy</span>
          </>
        )}
      </span>
    </button>
  );
}
