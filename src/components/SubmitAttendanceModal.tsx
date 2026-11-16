"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, ClipboardCheck, Lock, PauseCircle, QrCode } from "lucide-react";
import { submitAttendanceAction } from "@/app/actions/activities";
import { formatPhilippineDateTime } from "@/lib/date-utils";
import type { AttendanceStatus } from "@/types/database";

interface SubmitAttendanceModalProps {
  activityId: string;
  activityTitle: string;
  attendanceStatus?: AttendanceStatus;
  hasAttended: boolean;
  attendedAt?: string | null;
  userLocaleName?: string | null;
}

export function SubmitAttendanceModal({
  activityId,
  activityTitle,
  attendanceStatus = "not_started",
  hasAttended,
  attendedAt,
  userLocaleName,
}: SubmitAttendanceModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const searchParams = useSearchParams();

  // Auto-open modal if user arrived via QR Code link with ?code= or ?attend=
  useEffect(() => {
    const urlCode = searchParams.get("code") || searchParams.get("attend");
    if (urlCode && !hasAttended && attendanceStatus === "active") {
      setCode(urlCode.toUpperCase().trim());
      setIsOpen(true);
    }
  }, [searchParams, hasAttended, attendanceStatus]);

  if (hasAttended) {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-600/30 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 shadow-sm">
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
        <span>
          Attendance Recorded
          {attendedAt ? ` • ${formatPhilippineDateTime(attendedAt, { dateStyle: "short", timeStyle: "short" })}` : ""}
        </span>
      </div>
    );
  }

  if (attendanceStatus === "paused") {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-50 px-4 py-2.5 text-xs sm:text-sm font-medium text-amber-800">
        <PauseCircle className="h-4 w-4 text-amber-600 shrink-0" />
        <span>Attendance is temporarily paused by the District Admin</span>
      </div>
    );
  }

  if (attendanceStatus === "closed") {
    return (
      <div className="inline-flex items-center gap-2 rounded-xl border border-stone-300 bg-stone-100 px-4 py-2.5 text-xs sm:text-sm font-medium text-stone-600">
        <Lock className="h-4 w-4 text-stone-500 shrink-0" />
        <span>Attendance for this activity has concluded</span>
      </div>
    );
  }

  if (attendanceStatus !== "active") {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#303B32] to-[#202820] px-5 py-3 text-sm font-semibold text-white shadow-md hover:from-[#202820] hover:to-[#161c16] hover:shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-[#8C7853] focus:ring-offset-2"
      >
        <ClipboardCheck className="h-4 w-4 text-[#D6C6A5]" />
        <span>Submit Attendance</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-md rounded-2xl border border-[#D6C6A5] bg-[#FCFBF8] p-6 sm:p-7 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="space-y-1.5 border-b border-[#E0DACD] pb-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8C7853]">
                <QrCode className="h-4 w-4" />
                <span>PMCC (4th Watch) Davao District</span>
              </div>
              <h3 className="font-serif text-xl sm:text-2xl font-bold text-[#202820]">
                Submit Attendance
              </h3>
              <p className="text-xs text-[#636B62] line-clamp-1">
                Activity: {activityTitle}
              </p>
            </div>

            <form
              action={async (formData) => {
                setIsSubmitting(true);
                try {
                  await submitAttendanceAction(formData);
                } finally {
                  setIsSubmitting(false);
                }
              }}
              className="space-y-4"
            >
              <input type="hidden" name="activity_id" value={activityId} />
              <input type="hidden" name="return_path" value={`/activities/${activityId}`} />

              <div className="space-y-2">
                <label
                  htmlFor="attendance_code"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#475048]"
                >
                  Enter Attendance Code
                </label>
                <input
                  id="attendance_code"
                  name="attendance_code"
                  type="text"
                  required
                  autoFocus
                  placeholder="e.g. 582914 or DAVAO-2026"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="w-full rounded-xl border-2 border-[#D6C6A5] bg-white px-4 py-3 font-mono text-center text-lg sm:text-xl font-bold tracking-widest text-[#202820] placeholder:font-sans placeholder:text-sm placeholder:tracking-normal placeholder:text-stone-400 focus:border-[#303B32] focus:outline-none focus:ring-2 focus:ring-[#303B32]/20"
                />
                <p className="text-xs text-[#636B62] text-center">
                  Enter the code announced or projected by the District Admin.
                </p>
              </div>

              {userLocaleName && (
                <div className="rounded-xl border border-[#D6C6A5]/60 bg-[#F5F1E9] p-3 text-xs text-[#475048] flex items-center justify-between">
                  <span>Your Home Locale:</span>
                  <strong className="text-[#202820]">{userLocaleName}</strong>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setIsOpen(false)}
                  className="rounded-xl border border-[#D6C6A5] bg-white px-4 py-2.5 text-xs font-semibold text-[#475048] hover:bg-[#F5F1E9] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !code.trim()}
                  className="rounded-xl bg-[#303B32] px-5 py-2.5 text-xs font-semibold text-white shadow hover:bg-[#202820] disabled:opacity-50 transition-colors"
                >
                  {isSubmitting ? "Verifying..." : "Confirm Attendance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
