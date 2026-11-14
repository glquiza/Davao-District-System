"use client";

import { useRef } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";

gsap.registerPlugin(useGSAP);

interface SubmitButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  pendingText?: string;
  children: React.ReactNode;
}

export function SubmitButton({
  pendingText = "Working...",
  children,
  className = "",
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();
  const contentRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      if (!contentRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        return;
      gsap.fromTo(
        contentRef.current,
        { y: 4, opacity: 0.4 },
        { y: 0, opacity: 1, duration: 0.2, ease: "power2.out", clearProps: "transform,opacity" }
      );
    },
    { dependencies: [pending] }
  );

  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={`inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed ${className}`}
      {...props}
    >
      <span ref={contentRef} className="inline-flex items-center justify-center gap-2">
        {pending ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin shrink-0" />
            <span>{pendingText}</span>
          </>
        ) : (
          children
        )}
      </span>
    </button>
  );
}
