"use client";

import { useRef, useState } from "react";
import { BellRing, Globe, MapPin, Pencil, Plus, Save, Video, X } from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  sendInstantActivityReminderAction,
  updateActivityAction,
} from "@/app/actions/activities";
import { ReminderSchedulePicker } from "@/components/ui/ReminderSchedulePicker";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ThumbnailUploadField } from "@/components/ui/ThumbnailUploadField";
import { parseActivityMetadata } from "@/lib/activity-reminders";
import { formatToDateTimeLocalInput } from "@/lib/date-utils";
import type { ActivityModality, ActivityStatus, ProgramActivity } from "@/types/database";

gsap.registerPlugin(useGSAP);

export function ActivityEditSection({
  activity,
  defaultOpen = false,
  returnPath,
}: {
  activity: ProgramActivity;
  defaultOpen?: boolean;
  returnPath: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [modality, setModality] = useState<ActivityModality>(activity.modality);
  const { cleanDescription, reminderMinutes } = parseActivityMetadata(
    activity.description
  );

  const sortedLinks = [...(activity.activity_links ?? [])].sort(
    (a, b) => a.sort_order - b.sort_order
  );
  const link1 = sortedLinks[0];
  const link2 = sortedLinks[1];

  const [showBackupLink, setShowBackupLink] = useState(Boolean(link2?.url));
  const panelRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!isOpen || !panelRef.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        panelRef.current,
        { y: -6, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.24, ease: "power2.out", clearProps: "transform" }
      );
    },
    { dependencies: [isOpen] }
  );

  const modalityOptions: {
    value: ActivityModality;
    label: string;
    icon: typeof MapPin;
  }[] = [
    { value: "physical", label: "In-Person", icon: MapPin },
    { value: "online", label: "Online Only", icon: Video },
    { value: "hybrid", label: "Hybrid", icon: Globe },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-medium ${
            isOpen
              ? "border-[#303B32] bg-[#303B32] text-white"
              : "border-[#D6C6A5] bg-[#F0ECE3] text-[#202820] hover:bg-[#303B32] hover:text-white"
          }`}
        >
          {isOpen ? (
            <>
              <X className="h-3.5 w-3.5 text-[#D6C6A5]" />
              <span>Close Editor</span>
            </>
          ) : (
            <>
              <Pencil className="h-3.5 w-3.5" />
              <span>Edit Activity Details, Reminders &amp; Links</span>
            </>
          )}
        </button>

        <form action={sendInstantActivityReminderAction}>
          <input type="hidden" name="activity_id" value={activity.id} />
          <input type="hidden" name="return_path" value={returnPath} />
          <SubmitButton
            pendingText="Sending Reminder..."
            className="inline-flex items-center gap-2 rounded-xl border border-[#D6C6A5] bg-white px-4 py-2 text-xs font-medium text-[#303B32] shadow-sm hover:bg-[#F0ECE3]"
          >
            <BellRing className="h-3.5 w-3.5 text-[#8C7853]" />
            <span>Send Reminder Now</span>
          </SubmitButton>
        </form>
      </div>

      {isOpen && (
        <div
          ref={panelRef}
          className="rounded-2xl border border-[#D6C6A5] bg-[#F5F1E9]/60 p-6 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-[#D6C6A5]/50 pb-3">
            <div>
              <h3 className="font-serif text-lg font-semibold text-[#202820]">
                Edit Published Activity &amp; Reminder Schedule
              </h3>
              <p className="text-xs text-[#636B62]">
                Update the title, schedule, venue, automatic countdown reminders, or livestream links below.
              </p>
            </div>
          </div>

          <form action={updateActivityAction} className="space-y-5">
            <input type="hidden" name="activity_id" value={activity.id} />
            <input type="hidden" name="return_path" value={returnPath} />
            <input type="hidden" name="modality" value={modality} />
            <input
              type="hidden"
              name="timezone_offset"
              value={typeof window !== "undefined" ? String(new Date().getTimezoneOffset()) : "-480"}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-1.5">
                  Activity Title *
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  defaultValue={activity.title}
                  className="w-full rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2 text-sm text-[#202820] focus:border-[#303B32] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-1.5">
                  Category *
                </label>
                <select
                  name="category"
                  defaultValue={activity.category}
                  className="w-full rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2 text-sm text-[#202820] focus:border-[#303B32] focus:outline-none"
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

            {/* Event Format */}
            <div className="space-y-3">
              <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62]">
                Event Format *
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
                      className={`flex items-center justify-center sm:justify-start gap-2 rounded-xl border p-3 text-xs sm:text-sm font-medium ${
                        active
                          ? "border-[#303B32] bg-[#F0ECE3] text-[#202820] ring-1 ring-[#303B32]"
                          : "border-[#D6C6A5]/70 bg-white text-[#475048] hover:bg-[#F0ECE3]/60"
                      }`}
                    >
                      <Icon className="h-4 w-4 text-[#303B32] shrink-0" />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              {modality !== "online" && (
                <div className="pt-1">
                  <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-1.5">
                    Physical Venue / Chapel Address *
                  </label>
                  <input
                    type="text"
                    name="venue"
                    required
                    defaultValue={activity.venue ?? ""}
                    placeholder="e.g., Davao Central Main Chapel"
                    className="w-full rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2 text-sm text-[#202820] focus:border-[#303B32] focus:outline-none"
                  />
                </div>
              )}
            </div>

            {/* Schedule & Description */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-1.5">
                  Start Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  name="starts_at"
                  required
                  defaultValue={formatToDateTimeLocalInput(activity.starts_at)}
                  className="w-full rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2 text-sm text-[#202820] focus:border-[#303B32] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-1.5">
                  End Date &amp; Time (Optional)
                </label>
                <input
                  type="datetime-local"
                  name="ends_at"
                  defaultValue={formatToDateTimeLocalInput(activity.ends_at)}
                  className="w-full rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2 text-sm text-[#202820] focus:border-[#303B32] focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-1.5">
                  Description &amp; Member Reminders
                </label>
                <textarea
                  name="description"
                  rows={3}
                  defaultValue={cleanDescription ?? ""}
                  className="w-full rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2 text-sm text-[#202820] focus:border-[#303B32] focus:outline-none"
                />
              </div>
            </div>

            {/* Automatic Countdown Reminder Schedule Picker */}
            <ReminderSchedulePicker defaultMinutes={reminderMinutes} />

            {/* Activity Thumbnail Upload (when just an activity) OR Livestream / External Links */}
            {modality === "physical" ? (
              <ThumbnailUploadField
                defaultValue={activity.thumbnail_url}
                label="Activity Thumbnail Image"
              />
            ) : (
              <div className="rounded-xl border border-[#D6C6A5]/70 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-medium uppercase tracking-widest text-[#475048]">
                    Livestream / Video Links (Leave URL blank to remove)
                  </p>
                  {!showBackupLink && (
                    <button
                      type="button"
                      onClick={() => setShowBackupLink(true)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#303B32] underline decoration-[#D6C6A5] underline-offset-4"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Backup Link</span>
                    </button>
                  )}
                </div>

                <div className="grid gap-2.5 sm:grid-cols-3">
                  <select
                    name="link_platform_1"
                    defaultValue={link1?.platform ?? "youtube"}
                    className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-3 py-2 text-sm text-[#202820]"
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
                    defaultValue={link1?.label ?? ""}
                    placeholder="Label (e.g., Main YouTube Stream)"
                    className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-3 py-2 text-sm text-[#202820]"
                  />
                  <input
                    type="url"
                    name="link_url_1"
                    defaultValue={link1?.url ?? ""}
                    placeholder="https://youtube.com/watch?v=..."
                    className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-3 py-2 text-sm text-[#202820]"
                  />
                </div>

                {showBackupLink && (
                  <div className="grid gap-2.5 sm:grid-cols-3 pt-1">
                    <select
                      name="link_platform_2"
                      defaultValue={link2?.platform ?? "facebook"}
                      className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-3 py-2 text-sm text-[#202820]"
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
                      defaultValue={link2?.label ?? ""}
                      placeholder="Label (e.g., Backup Facebook Stream)"
                      className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-3 py-2 text-sm text-[#202820]"
                    />
                    <input
                      type="url"
                      name="link_url_2"
                      defaultValue={link2?.url ?? ""}
                      placeholder="https://facebook.com/..."
                      className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-3 py-2 text-sm text-[#202820]"
                    />
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 border-t border-[#D6C6A5]/40 pt-4">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-xl border border-[#D6C6A5] bg-white px-4 py-2 text-xs font-medium text-[#475048] hover:bg-[#F0ECE3]"
              >
                Cancel
              </button>
              <SubmitButton
                pendingText="Saving Changes..."
                className="rounded-xl bg-[#303B32] px-5 py-2 text-xs font-medium text-white shadow-sm hover:bg-[#202820]"
              >
                <Save className="h-3.5 w-3.5 text-[#D6C6A5]" />
                <span>Save Changes</span>
              </SubmitButton>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
