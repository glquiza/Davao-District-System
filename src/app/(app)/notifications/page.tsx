import Link from "next/link";
import { Bell, CheckCheck, Clock, ExternalLink } from "lucide-react";
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
import { createClient } from "@/lib/supabase/server";
import type { NotificationItem, ProgramActivity } from "@/types/database";

export default async function NotificationsPage() {
  const ctx = await requireUserContext();
  const supabase = await createClient();

  const [notifsRes, upcomingRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("*")
      .eq("user_id", ctx.profile.id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("programs_activities")
      .select(
        "id, title, description, level, district_id, locale_id, category, modality, starts_at, ends_at, venue, status, created_by, created_at, updated_at"
      )
      .in("status", ["upcoming", "ongoing"])
      .order("starts_at", { ascending: true })
      .limit(30),
  ]);

  const notifications = (notifsRes.data ?? []) as NotificationItem[];
  const upcomingActivities = (upcomingRes.data ?? []) as ProgramActivity[];
  const dueReminders = evaluateDueActivityReminders(
    upcomingActivities,
    ctx.profile.id
  );

  return (
    <GsapPageAnimator className="max-w-3xl mx-auto space-y-8">
      <div
        data-gsap="hero"
        className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-r from-white via-[#FBF8F1] to-[#EDE4D0] p-6 sm:p-7 shadow-sm flex flex-wrap items-center justify-between gap-4"
      >
        <div
          aria-hidden="true"
          className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#303B32] via-[#8C7853] to-[#D6C6A5]"
        />
        <div className="space-y-1.5">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-[#1A211B] via-[#303B32] to-[#5C4B28] bg-clip-text text-transparent">
            Notifications
          </h1>
          <p className="text-sm text-[#475048]">
            Activity announcements, countdown reminders, schedule updates, and membership decisions for your account.
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

      {/* Active Scheduled Countdown Reminders */}
      {dueReminders.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#8C7853]" />
            <h2 className="text-xs font-medium uppercase tracking-widest text-[#475048]">
              Upcoming Event Countdown Reminders ({dueReminders.length})
            </h2>
          </div>

          <ul className="space-y-3">
            {dueReminders.map((rem) => (
              <li
                key={rem.id}
                data-gsap="item"
                className="rounded-2xl border border-[#D6C6A5] bg-[#F0ECE3] p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="space-y-1 flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#303B32] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-[#F5F1E9]">
                        <Clock className="h-3 w-3 text-[#D6C6A5]" />
                        <span>Event Reminder</span>
                      </span>
                    </div>
                    <h3 className="font-serif text-base font-semibold text-[#202820] pt-1">
                      {rem.title}
                    </h3>
                    <p className="text-sm text-[#475048] leading-relaxed">{rem.body}</p>
                  </div>

                  {rem.action_url && (
                    <Link
                      href={rem.action_url}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#303B32] px-3.5 py-2 text-xs font-medium text-white shadow-sm hover:bg-[#202820]"
                    >
                      <span>View Activity</span>
                      <ExternalLink className="h-3.5 w-3.5 text-[#D6C6A5]" />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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
            New announcements and approval updates will appear here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3.5">
          {notifications.map((n) => (
            <li
              key={n.id}
              data-gsap="item"
              className={`rounded-2xl border p-5 sm:p-6 shadow-sm ${
                n.is_read
                  ? "border-[#D6C6A5]/50 bg-white"
                  : "border-[#D6C6A5] bg-[#F0ECE3]/80"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2.5">
                    {!n.is_read && (
                      <span className="h-2 w-2 rounded-full bg-[#303B32] shrink-0" />
                    )}
                    <h2 className="font-serif text-base font-semibold text-[#202820]">
                      {n.title}
                    </h2>
                  </div>
                  <p className="text-sm text-[#475048] leading-relaxed">{n.body}</p>
                  <p className="text-xs text-[#636B62]">
                    {new Date(n.created_at).toLocaleString("en-PH", {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {n.action_url &&
                    (n.action_url.startsWith("/activities/") && !n.activity_id ? (
                      <span className="rounded-lg border border-[#D6C6A5]/50 bg-[#F5F1E9] px-2.5 py-1 text-xs font-medium text-[#636B62]">
                        Activity removed
                      </span>
                    ) : (
                      <Link
                        href={n.action_url}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#202820] hover:bg-[#F5F1E9]"
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
                        className="rounded-xl bg-[#303B32] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#202820]"
                      >
                        Done
                      </SubmitButton>
                    </form>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </GsapPageAnimator>
  );
}
