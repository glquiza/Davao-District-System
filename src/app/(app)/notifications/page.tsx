import Link from "next/link";
import {
  Bell,
  Calendar,
  CalendarDays,
  CheckCheck,
  Clock,
  ExternalLink,
  MapPin,
  Sparkles,
} from "lucide-react";
import {
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/app/actions/activities";
import { BrowserNotificationToggle } from "@/components/BrowserNotificationToggle";
import { GsapPageAnimator } from "@/components/gsap/GsapPageAnimator";
import { LocaleAdminInvitationCards } from "@/components/LocaleAdminInvitationCards";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { evaluateDueActivityReminders } from "@/lib/activity-reminders";
import { requireUserContext } from "@/lib/auth-context";
import { formatPhilippineDateTime } from "@/lib/date-utils";
import { createClient } from "@/lib/supabase/server";
import type { NotificationItem, ProgramActivity } from "@/types/database";

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ filter?: string }>;
}) {
  const ctx = await requireUserContext();
  const supabase = await createClient();
  const params = searchParams ? await searchParams : {};
  const activeFilter = params.filter ?? "all";

  const [notifsRes, upcomingRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("*, activity:programs_activities(id, title, category, level, starts_at, venue)")
      .eq("user_id", ctx.profile.id)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("programs_activities")
      .select(
        "id, title, description, level, district_id, locale_id, category, modality, starts_at, ends_at, venue, status, created_by, created_at, updated_at"
      )
      .in("status", ["upcoming", "ongoing"])
      .order("starts_at", { ascending: true })
      .limit(30),
  ]);

  const rawNotifications = (notifsRes.data ?? []) as NotificationItem[];
  const upcomingActivities = (upcomingRes.data ?? []) as ProgramActivity[];
  const dueReminders = evaluateDueActivityReminders(
    upcomingActivities,
    ctx.profile.id
  );

  function isActivityNotification(n: NotificationItem): boolean {
    return (
      Boolean(n.activity_id) ||
      Boolean(n.action_url?.startsWith("/activities/")) ||
      n.type === "activity_published" ||
      n.type === "activity_updated" ||
      n.type === "activity_cancelled" ||
      n.type === "activity_reminder"
    );
  }

  const activityCount = rawNotifications.filter(isActivityNotification).length;
  const generalCount = rawNotifications.length - activityCount;

  const notifications = rawNotifications.filter((n) => {
    if (activeFilter === "activities") return isActivityNotification(n);
    if (activeFilter === "general") return !isActivityNotification(n);
    return true;
  });

  return (
    <GsapPageAnimator className="max-w-3xl mx-auto space-y-8">
      {/* Header Banner */}
      <div
        data-gsap="hero"
        className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-r from-white via-[#FBF8F1] to-[#EDE4D0] p-6 sm:p-7 shadow-sm flex flex-wrap items-center justify-between gap-4"
      >
        <div
          aria-hidden="true"
          className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#303B32] via-[#8C7853] to-[#D6C6A5]"
        />
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6C6A5] bg-[#F0ECE3] px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#303B32]">
              <Sparkles className="h-3.5 w-3.5 text-[#8C7853]" />
              <span>Notification Center</span>
            </span>
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-[#1A211B] via-[#303B32] to-[#5C4B28] bg-clip-text text-transparent">
            Notifications &amp; Alerts
          </h1>
          <p className="text-sm text-[#475048]">
            Stay updated with church programs, district conferences, countdown reminders, and account alerts.
          </p>
        </div>

        {ctx.unreadNotificationCount > 0 && (
          <form action={markAllNotificationsReadAction}>
            <SubmitButton
              pendingText="Clearing..."
              className="rounded-xl border border-[#D6C6A5] bg-gradient-to-b from-white to-[#F5F1E9] px-4 py-2 text-xs font-medium text-[#202820] shadow-sm hover:from-[#FBF9F4] hover:to-[#EDE6D6]"
            >
              <CheckCheck className="h-4 w-4 text-[#303B32]" />
              <span>Mark All as Read</span>
            </SubmitButton>
          </form>
        )}
      </div>

      <BrowserNotificationToggle />

      <LocaleAdminInvitationCards
        invites={ctx.pendingAdminInvites}
        returnPath="/notifications"
      />

      {/* Category Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#D6C6A5]/60 pb-3">
        <div className="flex items-center gap-1.5 bg-[#F5F1E9] p-1 rounded-xl border border-[#D6C6A5]/60">
          <Link
            href="/notifications"
            prefetch={true}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === "all"
                ? "bg-white text-[#202820] shadow-sm"
                : "text-[#636B62] hover:text-[#202820]"
            }`}
          >
            <span>All</span>
            <span className="rounded-full bg-[#E0DACD] px-1.5 py-0.2 text-[10px] text-[#475048]">
              {rawNotifications.length}
            </span>
          </Link>

          <Link
            href="/notifications?filter=activities"
            prefetch={true}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === "activities"
                ? "bg-[#303B32] text-white shadow-sm"
                : "text-[#8C7853] hover:text-[#303B32]"
            }`}
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <span>Programs &amp; Activities</span>
            {activityCount > 0 && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                activeFilter === "activities" ? "bg-[#8C7853] text-white" : "bg-[#D6C6A5] text-[#202820]"
              }`}>
                {activityCount}
              </span>
            )}
          </Link>

          <Link
            href="/notifications?filter=general"
            prefetch={true}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
              activeFilter === "general"
                ? "bg-white text-[#202820] shadow-sm"
                : "text-[#636B62] hover:text-[#202820]"
            }`}
          >
            <span>General</span>
            <span className="rounded-full bg-[#E0DACD] px-1.5 py-0.2 text-[10px] text-[#475048]">
              {generalCount}
            </span>
          </Link>
        </div>

        <span className="text-xs text-[#636B62]">
          Showing {notifications.length} {notifications.length === 1 ? "notification" : "notifications"}
        </span>
      </div>

      {/* Active Scheduled Countdown Reminders */}
      {dueReminders.length > 0 && activeFilter !== "general" && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#8C7853]" />
            <h2 className="text-xs font-bold uppercase tracking-widest text-[#475048]">
              Event Countdown Reminders ({dueReminders.length})
            </h2>
          </div>

          <ul className="space-y-3">
            {dueReminders.map((rem) => (
              <li
                key={rem.id}
                data-gsap="item"
                className="relative overflow-hidden rounded-2xl border-2 border-[#8C7853] bg-gradient-to-r from-[#F7F2E8] via-[#FAF6EE] to-white p-5 sm:p-6 shadow-md"
              >
                <div
                  aria-hidden="true"
                  className="absolute left-0 top-0 bottom-0 w-2 bg-gradient-to-b from-[#8C7853] via-[#D4AF37] to-[#303B32]"
                />
                <div className="flex flex-wrap items-start justify-between gap-4 pl-2">
                  <div className="space-y-2 flex-1 min-w-[200px]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#303B32] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F5F1E9] shadow-sm">
                        <Clock className="h-3 w-3 text-[#D4AF37]" />
                        <span>Happening Soon &bull; Countdown Reminder</span>
                      </span>
                    </div>
                    <h3 className="font-serif text-lg font-bold text-[#202820]">
                      {rem.title}
                    </h3>
                    <p className="text-sm text-[#475048] leading-relaxed">{rem.body}</p>
                  </div>

                  {rem.action_url && (
                    <Link
                      href={rem.action_url}
                      prefetch={true}
                      className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#303B32] to-[#202820] px-4 py-2.5 text-xs font-semibold text-white shadow hover:from-[#202820] hover:to-[#161c16] transition-all"
                    >
                      <CalendarDays className="h-4 w-4 text-[#D4AF37]" />
                      <span>Open Event</span>
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Main Notifications List */}
      {notifications.length === 0 &&
      dueReminders.length === 0 &&
      ctx.pendingAdminInvites.length === 0 ? (
        <div
          data-gsap="item"
          className="rounded-2xl border border-[#D6C6A5]/70 bg-white p-16 text-center space-y-2.5 shadow-sm"
        >
          <Bell className="h-8 w-8 text-[#8C7853] mx-auto" />
          <h2 className="font-serif text-lg font-semibold text-[#202820]">
            You&apos;re all caught up
          </h2>
          <p className="text-xs text-[#636B62]">
            {activeFilter === "activities"
              ? "No program or activity notifications right now."
              : "New announcements and activity updates will appear here."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3.5">
          {notifications.map((n) => {
            const isActivity = isActivityNotification(n);

            return (
              <li
                key={n.id}
                data-gsap="item"
                className={`relative overflow-hidden rounded-2xl border transition-all ${
                  isActivity
                    ? n.is_read
                      ? "border-[#D6C6A5] bg-gradient-to-r from-[#FBF9F4] via-white to-white p-5 sm:p-6 shadow-sm hover:border-[#8C7853]"
                      : "border-2 border-[#8C7853] bg-gradient-to-r from-[#FAF5EC] via-[#FDFBF7] to-white p-5 sm:p-6 shadow-md"
                    : n.is_read
                    ? "border-[#D6C6A5]/50 bg-white p-5 sm:p-6 shadow-sm"
                    : "border-[#D6C6A5] bg-[#F0ECE3]/80 p-5 sm:p-6 shadow-sm"
                }`}
              >
                {/* Visual Left Highlight Bar for Activities */}
                {isActivity && (
                  <div
                    aria-hidden="true"
                    className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-[#8C7853] via-[#D4AF37] to-[#303B32]"
                  />
                )}

                <div className={`flex flex-wrap items-start justify-between gap-4 ${isActivity ? "pl-2" : ""}`}>
                  <div className="space-y-2 flex-1 min-w-[200px]">
                    {/* Header Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      {!n.is_read && (
                        <span className="h-2 w-2 rounded-full bg-[#8C7853] shrink-0" />
                      )}

                      {isActivity ? (
                        <>
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6C6A5] bg-[#303B32] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#F5F1E9] shadow-sm">
                            <CalendarDays className="h-3 w-3 text-[#D4AF37]" />
                            <span>Program &amp; Activity</span>
                          </span>

                          {n.activity?.category && (
                            <span className="rounded-full border border-[#D6C6A5]/60 bg-[#F5F1E9] px-2.5 py-0.5 text-[10px] font-semibold text-[#303B32]">
                              {n.activity.category}
                            </span>
                          )}

                          {n.activity?.level && (
                            <span className="rounded-full border border-[#D6C6A5]/60 bg-[#F5F1E9] px-2 py-0.5 text-[10px] font-medium uppercase text-[#636B62]">
                              {n.activity.level}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-stone-100 px-2.5 py-0.5 text-[10px] font-medium text-stone-600">
                          General Notice
                        </span>
                      )}

                      <span className="text-[11px] text-[#8C9288] ml-auto sm:ml-0">
                        {new Date(n.created_at).toLocaleString("en-PH", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>

                    <h2 className="font-serif text-base sm:text-lg font-bold text-[#202820]">
                      {n.title}
                    </h2>
                    <p className="text-sm text-[#475048] leading-relaxed">{n.body}</p>

                    {/* Rich Activity Schedule Snippet if available */}
                    {isActivity && n.activity && (
                      <div className="flex flex-wrap items-center gap-4 pt-1 rounded-xl bg-[#F5F1E9]/80 border border-[#D6C6A5]/50 px-3.5 py-2 text-xs">
                        {n.activity.starts_at && (
                          <div className="flex items-center gap-1.5 font-semibold text-[#303B32]">
                            <Calendar className="h-3.5 w-3.5 text-[#8C7853]" />
                            <span>
                              {formatPhilippineDateTime(n.activity.starts_at, {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                          </div>
                        )}
                        {n.activity.venue && (
                          <div className="flex items-center gap-1.5 text-[#636B62]">
                            <MapPin className="h-3.5 w-3.5 text-[#8C7853]" />
                            <span>{n.activity.venue}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-2 shrink-0">
                    {n.action_url &&
                      (n.action_url.startsWith("/activities/") && !n.activity_id ? (
                        <span className="rounded-lg border border-[#D6C6A5]/50 bg-[#F5F1E9] px-2.5 py-1 text-xs font-medium text-[#636B62]">
                          Activity removed
                        </span>
                      ) : isActivity ? (
                        <Link
                          href={n.action_url}
                          prefetch={true}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#303B32] to-[#202820] px-4 py-2 text-xs font-semibold text-white shadow hover:from-[#202820] hover:to-[#161c16] hover:shadow-md transition-all"
                        >
                          <CalendarDays className="h-3.5 w-3.5 text-[#D4AF37]" />
                          <span>View Event</span>
                        </Link>
                      ) : (
                        <Link
                          href={n.action_url}
                          prefetch={true}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#202820] hover:bg-[#F5F1E9] transition-colors"
                        >
                          <span>View</span>
                          <ExternalLink className="h-3.5 w-3.5 text-[#303B32]" />
                        </Link>
                      ))}

                    {!n.is_read && (
                      <form action={markNotificationReadAction}>
                        <input type="hidden" name="notification_id" value={n.id} />
                        <SubmitButton
                          pendingText="..."
                          className="rounded-xl border border-[#D6C6A5] bg-white px-3 py-1.5 text-xs font-medium text-[#475048] hover:bg-[#F5F1E9] transition-colors"
                        >
                          Done
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </GsapPageAnimator>
  );
}
