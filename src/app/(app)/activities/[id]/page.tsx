import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BellRing, Calendar, Clock, ExternalLink, MapPin, Video } from "lucide-react";
import { ActivityEditSection } from "@/components/ActivityEditSection";
import { FlashBanner } from "@/components/FlashBanner";
import { GsapPageAnimator } from "@/components/gsap/GsapPageAnimator";
import { LivestreamVideoTemplate } from "@/components/LivestreamVideoTemplate";
import { DeleteActivityButton } from "@/components/ui/DeleteActivityButton";
import {
  computeActivityScheduleStatus,
  formatReminderBadgeList,
  parseActivityMetadata,
} from "@/lib/activity-reminders";
import { formatPhilippineDateTime } from "@/lib/date-utils";
import { requireUserContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import type { ProgramActivity } from "@/types/database";

export default async function ActivityDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; message?: string; error?: string }>;
}) {
  const ctx = await requireUserContext();
  const { id } = await params;
  const query = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase
    .from("programs_activities")
    .select("*, locale:locales(id, name, slug), district:districts(id, name, slug), activity_links(*)")
    .eq("id", id)
    .maybeSingle();

  if (!data) {
    notFound();
  }

  const activity = data as ProgramActivity;
  const { cleanDescription, reminderMinutes } = parseActivityMetadata(activity.description);
  const scheduleStatus = computeActivityScheduleStatus(
    activity.starts_at,
    activity.ends_at
  );

  // Enforce strict publisher rule in UI as well as RLS:
  // District Admins manage National/District; ONLY assigned Locale Admins manage Locale activities.
  const canManageActivity =
    (activity.level !== "locale" && ctx.profile.is_district_admin) ||
    (activity.level === "locale" &&
      Boolean(activity.locale_id) &&
      ctx.adminLocales.some((l) => l.id === activity.locale_id));

  const levelLabel =
    activity.level === "national"
      ? "National"
      : activity.level === "district"
        ? "Davao District"
        : activity.locale?.name ?? "Locale";

  const scheduleStages: {
    key: "upcoming" | "ongoing" | "completed";
    label: string;
    rule: string;
  }[] = [
    { key: "upcoming", label: "Upcoming", rule: "Before scheduled start" },
    { key: "ongoing", label: "Ongoing", rule: "During scheduled time" },
    { key: "completed", label: "Completed", rule: "After scheduled time" },
  ];

  return (
    <GsapPageAnimator triggerKey={activity.id} className="max-w-3xl mx-auto space-y-6">
      <div data-gsap="hero">
        <Link
          href="/feed"
          className="inline-flex items-center gap-2 rounded-lg px-2.5 py-1.5 -ml-2.5 text-sm font-medium text-[#475048] hover:bg-[#F0ECE3] hover:text-[#202820]"
        >
          <ArrowLeft className="h-4 w-4 text-[#303B32]" />
          <span>Back to Activities</span>
        </Link>
      </div>

      <FlashBanner message={query.message} error={query.error} />

      <article
        data-gsap="item"
        className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-br from-white via-[#FCFBF8] to-[#F2ECE0] p-7 sm:p-10 shadow-sm space-y-7"
      >
        <div
          aria-hidden="true"
          className="inset-x-0 top-0 h-1.5 absolute bg-gradient-to-r from-[#303B32] via-[#8C7853] to-[#D6C6A5]"
        />
        <div className="space-y-3.5">
          <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
            <span className="rounded-full border border-[#D6C6A5] bg-[#F0ECE3] px-3.5 py-1 text-[#202820]">
              {levelLabel}
            </span>
            <span className="rounded-full border border-[#D6C6A5]/50 bg-[#F5F1E9] px-3 py-1 text-[#475048]">
              {activity.category}
            </span>
            <span className="rounded-full border border-[#D6C6A5]/50 bg-[#F5F1E9] px-3 py-1 text-[#303B32] capitalize">
              Status: {scheduleStatus}
            </span>
            {reminderMinutes.length > 0 && scheduleStatus === "upcoming" && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6C6A5] bg-[#F0ECE3]/80 px-3 py-1 text-[#303B32]">
                <BellRing className="h-3.5 w-3.5 text-[#8C7853]" />
                <span>Auto-Reminders: {formatReminderBadgeList(reminderMinutes)} before</span>
              </span>
            )}
          </div>

          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight text-[#202820] leading-snug">
            {activity.title}
          </h1>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 rounded-xl border border-[#D6C6A5]/50 bg-[#F5F1E9]/70 p-5 text-sm text-[#303B32]">
          <div className="flex items-start gap-3">
            <Calendar className="h-4 w-4 mt-0.5 text-[#8C7853] shrink-0" />
            <div>
              <p className="font-semibold text-[#202820]">Schedule</p>
              <p className="mt-0.5">
                {formatPhilippineDateTime(activity.starts_at, {
                  dateStyle: "full",
                  timeStyle: "short",
                })}
              </p>
              {activity.ends_at && (
                <p className="text-xs text-[#636B62] mt-1">
                  Ends:{" "}
                  {formatPhilippineDateTime(activity.ends_at, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            {activity.modality === "online" ? (
              <Video className="h-4 w-4 mt-0.5 text-[#8C7853] shrink-0" />
            ) : (
              <MapPin className="h-4 w-4 mt-0.5 text-[#8C7853] shrink-0" />
            )}
            <div>
              <p className="font-semibold text-[#202820] capitalize">
                {activity.modality} Activity
              </p>
              <p className="mt-0.5">
                {activity.venue ?? "Online via external livestream / meeting platform"}
              </p>
            </div>
          </div>
        </div>

        {/* Livestream Video Player Template */}
        {activity.activity_links && activity.activity_links.length > 0 && (
          <div className="space-y-4 border-t border-[#F0ECE3] pt-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-medium uppercase tracking-widest text-[#636B62] font-sans">
                Livestream Broadcast &amp; Video Player
              </h2>
            </div>

            <LivestreamVideoTemplate
              links={activity.activity_links}
              activityTitle={activity.title}
              activityStatus={scheduleStatus}
            />

            <div className="grid gap-3 sm:grid-cols-2 pt-1">
              {activity.activity_links.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl border border-[#D6C6A5] bg-[#F0ECE3] px-4 py-3 text-sm font-medium text-[#202820] hover:bg-[#303B32] hover:text-white hover:border-[#303B32]"
                >
                  <div>
                    <p>{link.label}</p>
                    <p className="text-xs font-normal opacity-80 capitalize mt-0.5">
                      Platform: {link.platform.replace("_", " ")}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Uploaded Activity Thumbnail Banner when it is just an activity */}
        {(!activity.activity_links || activity.activity_links.length === 0) &&
          activity.thumbnail_url && (
            <div className="space-y-3 border-t border-[#F0ECE3] pt-6">
              <h2 className="text-xs font-medium uppercase tracking-widest text-[#636B62] font-sans">
                Activity Banner &amp; Thumbnail
              </h2>
              <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#D6C6A5] bg-[#202820] shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activity.thumbnail_url}
                  alt={activity.title}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          )}

        {cleanDescription && (
          <div className="space-y-2 border-t border-[#F0ECE3] pt-6">
            <h2 className="text-xs font-medium uppercase tracking-widest text-[#636B62] font-sans">
              Activity Details &amp; Reminders
            </h2>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[#202820]">
              {cleanDescription}
            </p>
          </div>
        )}

        {canManageActivity && (
          <div className="border-t border-[#F0ECE3] pt-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xs font-medium uppercase tracking-widest text-[#636B62] font-sans">
                Publisher Controls — Manage Activity
              </h2>
              <DeleteActivityButton activityId={activity.id} returnPath="/feed" />
            </div>

            {/* Automatic Schedule-Driven Status Indicator */}
            <div className="rounded-xl border border-[#D6C6A5]/60 bg-[#F5F1E9]/60 p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-medium text-[#202820]">
                  <Clock className="h-3.5 w-3.5 text-[#8C7853]" />
                  <span>Automatic Schedule Status</span>
                </div>
                <span className="text-[11px] text-[#636B62]">
                  Transitions automatically based on scheduled Start &amp; End Date/Time
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {scheduleStages.map((stage) => {
                  const isCurrent = scheduleStatus === stage.key;
                  return (
                    <div
                      key={stage.key}
                      className={`rounded-xl border px-3.5 py-2.5 text-xs ${
                        isCurrent
                          ? "border-[#303B32] bg-[#303B32] text-[#F5F1E9] shadow-sm"
                          : "border-[#D6C6A5]/60 bg-white/80 text-[#636B62]"
                      }`}
                    >
                      <p className="font-semibold capitalize">
                        {isCurrent ? `Current: ${stage.label}` : stage.label}
                      </p>
                      <p
                        className={`text-[11px] mt-0.5 ${
                          isCurrent ? "text-[#D6C6A5]" : "text-[#8C9288]"
                        }`}
                      >
                        {stage.rule}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <ActivityEditSection
              activity={activity}
              defaultOpen={query.edit === "true"}
              returnPath={`/activities/${activity.id}`}
            />
          </div>
        )}
      </article>
    </GsapPageAnimator>
  );
}

