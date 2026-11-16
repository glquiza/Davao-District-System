"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BellRing, Calendar, ExternalLink, Globe, MapPin, Pencil, Video } from "lucide-react";
import gsap from "gsap";
import { LivestreamVideoTemplate } from "@/components/LivestreamVideoTemplate";
import { DeleteActivityButton } from "@/components/ui/DeleteActivityButton";
import {
  computeActivityScheduleStatus,
  formatReminderBadgeList,
  parseActivityMetadata,
} from "@/lib/activity-reminders";
import { formatPhilippineDateTime } from "@/lib/date-utils";
import type { ProgramActivity } from "@/types/database";

const levelBadgeStyles: Record<ProgramActivity["level"], string> = {
  national:
    "bg-gradient-to-r from-[#3A483D] via-[#303B32] to-[#1F2720] text-[#F5F1E9] border-[#303B32] shadow-sm",
  district:
    "bg-gradient-to-r from-[#FBF9F4] via-[#EFE7D6] to-[#DFD0B2] text-[#202820] border-[#C8B48E]",
  locale:
    "bg-gradient-to-r from-[#F5F1E9] via-[#E8EFE9] to-[#DCE6DD] text-[#263428] border-[#B4C4B6]",
};

const statusBadgeStyles: Record<"upcoming" | "ongoing" | "completed", string> = {
  upcoming:
    "bg-gradient-to-r from-[#FBF9F4] to-[#EDE5D2] text-[#303B32] border-[#D6C6A5]",
  ongoing:
    "bg-gradient-to-r from-[#8C7853] to-[#5C4B28] text-[#FBF9F4] border-[#786440] shadow-sm",
  completed:
    "bg-gradient-to-r from-[#F5F1E9] to-[#E5E0D5] text-[#636B62] border-[#D6C6A5]/60",
};

export function ActivityCard({
  activity,
  canManage = false,
  returnPath = "/feed",
}: {
  activity: ProgramActivity;
  canManage?: boolean;
  returnPath?: string;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  const scheduleStatus = computeActivityScheduleStatus(
    activity.starts_at,
    activity.ends_at,
    nowMs
  );

  const levelLabel =
    activity.level === "national"
      ? "National"
      : activity.level === "district"
        ? "Davao District"
        : activity.locale?.name ?? "Locale";

  const formattedStart = formatPhilippineDateTime(activity.starts_at);

  const hasLinks = Boolean(activity.activity_links && activity.activity_links.length > 0);
  const { cleanDescription, reminderMinutes } = parseActivityMetadata(activity.description);

  function handleEnter() {
    if (!cardRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    gsap.to(cardRef.current, { y: -2, duration: 0.22, ease: "power2.out" });
  }

  function handleLeave() {
    if (!cardRef.current) return;
    gsap.to(cardRef.current, { y: 0, duration: 0.22, ease: "power2.out" });
  }

  return (
    <div
      ref={cardRef}
      data-gsap="item"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      className="group relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-br from-white via-[#FCFBF8] to-[#F2ECE0] p-6 shadow-sm hover:border-[#C2AE86] hover:shadow-md flex flex-col justify-between gap-5"
    >
      <div
        aria-hidden="true"
        className={`inset-x-0 top-0 h-1 absolute ${
          activity.level === "national"
            ? "bg-gradient-to-r from-[#202820] via-[#3A483D] to-[#D6C6A5]"
            : activity.level === "district"
              ? "bg-gradient-to-r from-[#8C7853] via-[#D6C6A5] to-[#303B32]"
              : "bg-gradient-to-r from-[#303B32] via-[#6B806E] to-[#D6C6A5]"
        }`}
      />
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium ${levelBadgeStyles[activity.level]}`}
            >
              {levelLabel}
            </span>
            <span className="inline-flex items-center rounded-full border border-[#D6C6A5]/50 bg-[#F0ECE3] px-2.5 py-0.5 text-xs font-normal text-[#475048]">
              {activity.category}
            </span>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${statusBadgeStyles[scheduleStatus]}`}
            >
              {scheduleStatus}
            </span>
            {activity.attendance_status && activity.attendance_status !== "not_started" && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                  activity.attendance_status === "active"
                    ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                    : activity.attendance_status === "paused"
                    ? "bg-amber-100 text-amber-800 border-amber-300"
                    : "bg-stone-200 text-stone-700 border-stone-300"
                }`}
              >
                Attendance {activity.attendance_status.replace("_", " ")}
              </span>
            )}
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6C6A5]/40 bg-[#F5F1E9] px-2.5 py-1 text-xs font-medium text-[#303B32] capitalize">
            {activity.modality === "online" ? (
              <Video className="h-3.5 w-3.5 text-[#303B32]" />
            ) : activity.modality === "hybrid" ? (
              <Globe className="h-3.5 w-3.5 text-[#303B32]" />
            ) : (
              <MapPin className="h-3.5 w-3.5 text-[#303B32]" />
            )}
            {activity.modality}
          </span>
        </div>

        <Link
          href={`/activities/${activity.id}`}
          className="flex items-start justify-between gap-2 font-serif text-xl font-semibold text-[#202820] group-hover:text-[#303B32]"
        >
          <span>{activity.title}</span>
          <ArrowUpRight className="h-4 w-4 mt-1 shrink-0 opacity-40 group-hover:opacity-100 transition-opacity text-[#303B32]" />
        </Link>

        {/* Livestream / Video Template Preview when activity has a livestream link */}
        {hasLinks && activity.activity_links && (
          <LivestreamVideoTemplate
            links={activity.activity_links}
            activityTitle={activity.title}
            activityStatus={scheduleStatus}
            compact
          />
        )}

        {/* Uploaded Activity Thumbnail when it is just an activity */}
        {!hasLinks && activity.thumbnail_url && (
          <Link
            href={`/activities/${activity.id}`}
            className="relative block aspect-video w-full overflow-hidden rounded-xl border border-[#D6C6A5] bg-[#202820] shadow-sm"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activity.thumbnail_url}
              alt={activity.title}
              className="h-full w-full object-cover transition-opacity duration-200 group-hover:opacity-95"
            />
          </Link>
        )}

        {cleanDescription && (
          <p className="text-sm text-[#475048] line-clamp-2 leading-relaxed">
            {cleanDescription}
          </p>
        )}

        <div className="flex flex-wrap gap-x-5 gap-y-1.5 rounded-xl border border-[#D6C6A5]/50 bg-gradient-to-r from-[#FBF9F4] via-[#F5F1E9] to-[#EDE5D4] px-3.5 py-2.5 text-xs font-medium text-[#303B32]">
          <span className="inline-flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-[#8C7853]" />
            {formattedStart}
          </span>
          {activity.venue && (
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-[#303B32]" />
              {activity.venue}
            </span>
          )}
          {reminderMinutes.length > 0 && scheduleStatus === "upcoming" && (
            <span className="inline-flex items-center gap-1.5 text-[#636B62]">
              <BellRing className="h-3.5 w-3.5 text-[#8C7853]" />
              Reminders: {formatReminderBadgeList(reminderMinutes)} before
            </span>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0ECE3] pt-4">
        <div className="flex flex-wrap items-center gap-2">
          {hasLinks && activity.activity_links ? (
            activity.activity_links.map((link) => (
              <a
                key={link.id}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6C6A5] bg-[#F0ECE3] px-3 py-1 text-xs font-medium text-[#202820] hover:bg-[#303B32] hover:text-white hover:border-[#303B32]"
              >
                <ExternalLink className="h-3 w-3" />
                {link.label}
              </a>
            ))
          ) : (
            <span className="text-xs text-[#8C9288]">Select event for full schedule details</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <>
              <Link
                href={`/activities/${activity.id}?edit=true`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[#D6C6A5] bg-[#F0ECE3] px-2.5 py-1 text-xs font-medium text-[#202820] hover:bg-[#303B32] hover:text-white"
              >
                <Pencil className="h-3 w-3" />
                <span>Edit</span>
              </Link>
              <DeleteActivityButton
                activityId={activity.id}
                returnPath={returnPath}
                compact
              />
            </>
          )}
          <Link
            href={`/activities/${activity.id}`}
            className="text-xs font-medium text-[#303B32] hover:text-[#202820] underline decoration-[#D6C6A5] underline-offset-4"
          >
            View Details &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
