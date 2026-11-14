"use client";

import { useRef, useState } from "react";
import { Trash2, X } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { deleteActivityAction } from "@/app/actions/activities";
import { SubmitButton } from "@/components/ui/SubmitButton";

gsap.registerPlugin(useGSAP);

interface DeleteActivityButtonProps {
  activityId: string;
  returnPath: string;
  compact?: boolean;
}

export function DeleteActivityButton({
  activityId,
  returnPath,
  compact = false,
}: DeleteActivityButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const confirmBoxRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!confirming || !confirmBoxRef.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        confirmBoxRef.current,
        { opacity: 0, y: 2 },
        { opacity: 1, y: 0, duration: 0.2, ease: "power2.out", clearProps: "transform" }
      );
    },
    { dependencies: [confirming] }
  );

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={`inline-flex items-center gap-1.5 rounded-lg border border-[#D6C6A5] bg-[#F5F1E9] font-medium text-[#5C3A32] hover:bg-[#EFE7DC] hover:border-[#C2A88B] ${
          compact ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-xs"
        }`}
      >
        <Trash2 className="h-3.5 w-3.5 shrink-0 text-[#7A4438]" />
        <span>{compact ? "Remove" : "Remove Activity"}</span>
      </button>
    );
  }

  return (
    <div
      ref={confirmBoxRef}
      className="inline-flex flex-wrap items-center gap-1.5 rounded-xl border border-[#C9A69B] bg-[#FAF4F2] px-2.5 py-1 shadow-sm"
    >
      <span className="text-xs font-medium text-[#5C2B22] px-1">
        {compact ? "Remove?" : "Permanently remove this activity?"}
      </span>
      <form action={deleteActivityAction} className="inline-flex">
        <input type="hidden" name="activity_id" value={activityId} />
        <input type="hidden" name="return_path" value={returnPath} />
        <SubmitButton
          pendingText="Removing..."
          className="rounded-lg bg-[#6E3429] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#57271E]"
        >
          Confirm
        </SubmitButton>
      </form>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        aria-label="Cancel removal"
        className="inline-flex items-center gap-1 rounded-lg border border-[#D6C6A5] bg-white px-2 py-1 text-xs font-medium text-[#475048] hover:bg-[#F0ECE3]"
      >
        <X className="h-3 w-3" />
        <span>Cancel</span>
      </button>
    </div>
  );
}
