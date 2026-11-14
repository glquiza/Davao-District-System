"use client";

import { useState } from "react";
import { BellRing, Clock, Sparkles } from "lucide-react";
import {
  DEFAULT_REMINDER_MINUTES,
  REMINDER_INTERVAL_OPTIONS,
} from "@/lib/activity-reminders";

export function ReminderSchedulePicker({
  defaultMinutes = DEFAULT_REMINDER_MINUTES,
}: {
  defaultMinutes?: number[];
}) {
  const [selected, setSelected] = useState<number[]>(defaultMinutes);

  function toggleInterval(minutes: number) {
    setSelected((prev) =>
      prev.includes(minutes)
        ? prev.filter((m) => m !== minutes)
        : [...prev, minutes].sort((a, b) => b - a)
    );
  }

  function applyPreset(minutesList: number[]) {
    setSelected([...minutesList].sort((a, b) => b - a));
  }

  return (
    <div className="rounded-xl border border-[#D6C6A5]/80 bg-white p-4 space-y-3.5">
      <input
        type="hidden"
        name="reminder_minutes"
        value={selected.join(",")}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <BellRing className="h-4 w-4 text-[#303B32]" />
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#202820]">
              Automatic Member Reminders Before Event
            </p>
            <p className="text-[11px] text-[#636B62]">
              Eligible users receive automatic countdown notifications (e.g., 1 hour before start) so they never miss the program.
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => applyPreset([60, 15])}
            className="inline-flex items-center gap-1 rounded-lg border border-[#D6C6A5] bg-[#F5F1E9] px-2.5 py-1 text-[11px] font-medium text-[#202820] hover:bg-[#F0ECE3]"
          >
            <Clock className="h-3 w-3 text-[#8C7853]" />
            <span>1h &amp; 15m Before</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset([180, 120, 60, 30, 15])}
            className="inline-flex items-center gap-1 rounded-lg border border-[#D6C6A5] bg-[#F0ECE3] px-2.5 py-1 text-[11px] font-medium text-[#303B32] hover:bg-[#303B32] hover:text-white"
          >
            <Sparkles className="h-3 w-3" />
            <span>Frequent Hourly Countdown (3h, 2h, 1h, 30m, 15m)</span>
          </button>
          <button
            type="button"
            onClick={() => applyPreset([1440, 360, 180, 60, 30, 15])}
            className="inline-flex items-center gap-1 rounded-lg border border-[#D6C6A5] bg-[#F5F1E9] px-2.5 py-1 text-[11px] font-medium text-[#202820] hover:bg-[#F0ECE3]"
          >
            <span>Full Day + Countdown</span>
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {REMINDER_INTERVAL_OPTIONS.map((opt) => {
          const isSelected = selected.includes(opt.minutes);
          return (
            <button
              key={opt.minutes}
              type="button"
              onClick={() => toggleInterval(opt.minutes)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors ${
                isSelected
                  ? "border-[#303B32] bg-[#303B32] text-[#F5F1E9] shadow-sm"
                  : "border-[#D6C6A5]/70 bg-[#F5F1E9]/60 text-[#475048] hover:bg-[#F0ECE3]"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>{opt.label}</span>
            </button>
          );
        })}
      </div>

      <p className="text-[11px] text-[#636B62]">
        {selected.length > 0 ? (
          <>
            Active schedule:{" "}
            <strong className="text-[#202820]">
              {selected
                .map(
                  (m) =>
                    REMINDER_INTERVAL_OPTIONS.find((o) => o.minutes === m)?.label ??
                    `${m} mins before`
                )
                .join(" • ")}
            </strong>
          </>
        ) : (
          "No automatic countdown reminders selected. Click any interval above to enable."
        )}
      </p>
    </div>
  );
}
