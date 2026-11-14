"use client";

import { useRef, useState } from "react";
import { Globe, MapPin, Plus, Send, Video } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { createActivityAction } from "@/app/actions/activities";
import { ReminderSchedulePicker } from "@/components/ui/ReminderSchedulePicker";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ThumbnailUploadField } from "@/components/ui/ThumbnailUploadField";
import type { ActivityLevel, ActivityModality } from "@/types/database";

gsap.registerPlugin(useGSAP);

interface ActivityPublisherFormProps {
  mode: "district-admin" | "locale-admin";
  districtId: string;
  localeId?: string;
  localeName?: string;
  returnPath: string;
}

export function ActivityPublisherForm({
  mode,
  districtId,
  localeId,
  localeName,
  returnPath,
}: ActivityPublisherFormProps) {
  const [modality, setModality] = useState<ActivityModality>("physical");
  const [showBackupLink, setShowBackupLink] = useState(false);
  const venueRef = useRef<HTMLDivElement>(null);

  const allowedLevels: { value: ActivityLevel; label: string; desc: string }[] =
    mode === "district-admin"
      ? [
          {
            value: "national",
            label: "National Program",
            desc: "Visible to every registered user, even before Locale approval.",
          },
          {
            value: "district",
            label: "Davao District Activity",
            desc: "Visible only to approved active members across Davao District Locales.",
          },
        ]
      : [
          {
            value: "locale",
            label: `${localeName ?? "Locale"} Activity`,
            desc: `Visible exclusively to approved active members of ${localeName ?? "this Locale"}.`,
          },
        ];

  const [selectedLevel, setSelectedLevel] = useState<ActivityLevel>(allowedLevels[0].value);

  useGSAP(
    () => {
      if (!venueRef.current || modality === "online") return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        venueRef.current,
        { y: -6, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.22, ease: "power2.out" }
      );
    },
    { dependencies: [modality] }
  );

  const modalityOptions: {
    value: ActivityModality;
    label: string;
    sub: string;
    icon: typeof MapPin;
  }[] = [
    { value: "physical", label: "In-Person", sub: "Physical venue", icon: MapPin },
    { value: "online", label: "Online Only", sub: "Livestream / link", icon: Video },
    { value: "hybrid", label: "Hybrid", sub: "Venue + stream", icon: Globe },
  ];

  return (
    <form
      action={createActivityAction}
      className="rounded-2xl border border-[#D6C6A5]/60 bg-white p-6 sm:p-7 shadow-sm space-y-6"
    >
      <input type="hidden" name="return_path" value={returnPath} />
      <input type="hidden" name="district_id" value={districtId} />
      <input type="hidden" name="level" value={selectedLevel} />
      <input type="hidden" name="modality" value={modality} />
      {localeId && <input type="hidden" name="locale_id" value={localeId} />}

      {/* Step 1: Audience Level Selector Cards */}
      <div className="space-y-2.5">
        <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62]">
          1. Audience Scope
        </label>
        <div
          className={`grid gap-3 ${
            allowedLevels.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {allowedLevels.map((lvl) => {
            const active = selectedLevel === lvl.value;
            return (
              <button
                key={lvl.value}
                type="button"
                onClick={() => setSelectedLevel(lvl.value)}
                className={`text-left rounded-xl border p-4 ${
                  active
                    ? "border-[#303B32] bg-[#F0ECE3] ring-1 ring-[#303B32]"
                    : "border-[#D6C6A5]/60 bg-[#F5F1E9]/50 hover:bg-[#F0ECE3]/70"
                }`}
              >
                <p className="font-serif text-base font-semibold text-[#202820]">{lvl.label}</p>
                <p className="text-xs text-[#475048] mt-1 leading-relaxed">{lvl.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: Core Details */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-2">
            2. Activity Title *
          </label>
          <input
            type="text"
            name="title"
            required
            placeholder="e.g., Special Worship Gathering"
            className="w-full rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-3.5 py-2.5 text-sm text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-2">
            Category *
          </label>
          <select
            name="category"
            defaultValue="Worship Service"
            className="w-full rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2.5 text-sm text-[#202820] focus:border-[#303B32] focus:outline-none"
          >
            <option value="Worship Service">Worship Service</option>
            <option value="Gathering">Gathering</option>
            <option value="Conference">Conference</option>
            <option value="Meeting">Meeting</option>
            <option value="Special Celebration">Special Celebration</option>
            <option value="Announcement">Announcement</option>
          </select>
        </div>
      </div>

      {/* Step 3: Format / Modality Picker */}
      <div className="space-y-3">
        <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62]">
          3. Event Format *
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          {modalityOptions.map((opt) => {
            const Icon = opt.icon;
            const active = modality === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setModality(opt.value)}
                className={`flex flex-col sm:flex-row items-center gap-2.5 rounded-xl border p-3.5 text-center sm:text-left ${
                  active
                    ? "border-[#303B32] bg-[#F0ECE3] text-[#202820] ring-1 ring-[#303B32]"
                    : "border-[#D6C6A5]/60 bg-white text-[#475048] hover:bg-[#F5F1E9]"
                }`}
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    active ? "text-[#303B32]" : "text-[#8C9288]"
                  }`}
                />
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-[#202820]">{opt.label}</p>
                  <p className="hidden sm:block text-[11px] text-[#636B62]">{opt.sub}</p>
                </div>
              </button>
            );
          })}
        </div>

        {modality !== "online" && (
          <div ref={venueRef} className="pt-1">
            <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-2">
              Physical Venue / Chapel Address *
            </label>
            <input
              type="text"
              name="venue"
              required
              placeholder="e.g., Davao Central Main Chapel, Poblacion District"
              className="w-full rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-3.5 py-2.5 text-sm text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none"
            />
          </div>
        )}
      </div>

      {/* Step 4: Schedule & Description */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-2">
            Start Date &amp; Time *
          </label>
          <input
            type="datetime-local"
            name="starts_at"
            required
            className="w-full rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-3.5 py-2.5 text-sm text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-2">
            End Date &amp; Time <span className="text-[#8C9288] font-normal">(Optional)</span>
          </label>
          <input
            type="datetime-local"
            name="ends_at"
            className="w-full rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-3.5 py-2.5 text-sm text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-2">
            Description &amp; Member Reminders
          </label>
          <textarea
            name="description"
            rows={3}
            placeholder="Attire reminders, call time, or special instructions for brethren..."
            className="w-full rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-3.5 py-2.5 text-sm text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Automatic Countdown Reminder Schedule Picker */}
      <ReminderSchedulePicker />

      {/* Step 5: Activity Thumbnail Upload (when just an activity) OR Livestream Links */}
      {modality === "physical" ? (
        <ThumbnailUploadField label="5. Activity Thumbnail Image (Optional)" />
      ) : (
        <div className="rounded-xl border border-[#D6C6A5]/60 bg-[#F5F1E9]/70 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-widest text-[#475048]">
              5. Livestream / Online Meeting Links
            </p>
            {!showBackupLink && (
              <button
                type="button"
                onClick={() => setShowBackupLink(true)}
                className="inline-flex items-center gap-1 text-xs font-medium text-[#303B32] hover:text-[#202820] underline decoration-[#D6C6A5] underline-offset-4"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Backup Link</span>
              </button>
            )}
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3">
            <select
              name="link_platform_1"
              defaultValue="youtube"
              className="rounded-xl border border-[#D6C6A5] bg-white px-3 py-2 text-sm text-[#202820]"
            >
              <option value="youtube">YouTube Live</option>
              <option value="facebook">Facebook Live</option>
              <option value="zoom">Zoom</option>
              <option value="google_meet">Google Meet</option>
              <option value="other">Other Platform</option>
            </select>
            <input
              type="text"
              name="link_label_1"
              placeholder="Label (e.g., Main YouTube Stream)"
              className="rounded-xl border border-[#D6C6A5] bg-white px-3 py-2 text-sm text-[#202820]"
            />
            <input
              type="url"
              name="link_url_1"
              placeholder="https://youtube.com/live/..."
              className="rounded-xl border border-[#D6C6A5] bg-white px-3 py-2 text-sm text-[#202820]"
            />
          </div>

          {showBackupLink && (
            <div className="grid gap-2.5 sm:grid-cols-3 pt-1">
              <select
                name="link_platform_2"
                defaultValue="facebook"
                className="rounded-xl border border-[#D6C6A5] bg-white px-3 py-2 text-sm text-[#202820]"
              >
                <option value="facebook">Facebook Live</option>
                <option value="youtube">YouTube Live</option>
                <option value="zoom">Zoom</option>
                <option value="google_meet">Google Meet</option>
                <option value="other">Other Platform</option>
              </select>
              <input
                type="text"
                name="link_label_2"
                placeholder="Label (e.g., Backup Facebook Live)"
                className="rounded-xl border border-[#D6C6A5] bg-white px-3 py-2 text-sm text-[#202820]"
              />
              <input
                type="url"
                name="link_url_2"
                placeholder="https://facebook.com/..."
                className="rounded-xl border border-[#D6C6A5] bg-white px-3 py-2 text-sm text-[#202820]"
              />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-end border-t border-[#F0ECE3] pt-4">
        <SubmitButton
          pendingText="Publishing & Notifying..."
          className="rounded-xl bg-[#303B32] px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#202820]"
        >
          <Send className="h-4 w-4 text-[#D6C6A5]" />
          <span>Publish Activity</span>
        </SubmitButton>
      </div>
    </form>
  );
}
