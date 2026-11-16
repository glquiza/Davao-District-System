import Link from "next/link";
import { ArrowRight, CalendarSearch } from "lucide-react";
import { ActivityCard } from "@/components/ActivityCard";
import { FlashBanner } from "@/components/FlashBanner";
import { GsapPageAnimator } from "@/components/gsap/GsapPageAnimator";
import { LocaleAdminInvitationCards } from "@/components/LocaleAdminInvitationCards";
import { requireUserContext } from "@/lib/auth-context";
import { isLocaleRemoved } from "@/lib/locale-metadata";
import { createClient } from "@/lib/supabase/server";
import type { ActivityLevel, ProgramActivity } from "@/types/database";

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; message?: string; error?: string }>;
}) {
  const ctx = await requireUserContext();
  const params = await searchParams;
  const selectedLevel = params.level as ActivityLevel | undefined;

  const supabase = await createClient();
  let query = supabase
    .from("programs_activities")
    .select("*, locale:locales(id, name, slug, contact_info), district:districts(id, name, slug), activity_links(*)")
    .order("starts_at", { ascending: true });

  if (selectedLevel && ["national", "district", "locale"].includes(selectedLevel)) {
    query = query.eq("level", selectedLevel);
  }

  const { data: activitiesData, error: queryErr } = await query;

  const hasDistrictAndLocaleAccess =
    Boolean(ctx.activeMembership) ||
    ctx.profile.is_district_admin ||
    ctx.adminLocales.length > 0;

  const allowedLocaleIds = new Set<string>([
    ...(ctx.activeMembership ? [ctx.activeMembership.locale_id] : []),
    ...ctx.adminLocales.map((l) => l.id),
  ]);

  const activities = ((activitiesData ?? []) as ProgramActivity[]).filter((act) => {
    if (act.level === "national") return true;
    if (!hasDistrictAndLocaleAccess) return false;
    if (act.level === "district") return true;
    if (act.level === "locale") {
      if (isLocaleRemoved(act.locale)) return false;
      if (ctx.profile.is_district_admin) return true;
      return Boolean(act.locale_id && allowedLocaleIds.has(act.locale_id));
    }
    return false;
  });

  const filterTabs: { label: string; value?: string }[] = [
    { label: "All Accessible", value: undefined },
    { label: "National", value: "national" },
    ...(hasDistrictAndLocaleAccess
      ? [
          { label: "Davao District", value: "district" },
          { label: ctx.activeMembership?.locale.name ?? "Locale", value: "locale" },
        ]
      : []),
  ];

  return (
    <GsapPageAnimator triggerKey={selectedLevel ?? "all"} className="space-y-8">
      <div
        data-gsap="hero"
        className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-r from-white via-[#FBF8F1] to-[#EDE4D0] p-6 sm:p-7 shadow-sm flex flex-wrap items-end justify-between gap-4"
      >
        <div
          aria-hidden="true"
          className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#303B32] via-[#8C7853] to-[#D6C6A5]"
        />
        <div className="space-y-1.5">
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-[#1A211B] via-[#303B32] to-[#5C4B28] bg-clip-text text-transparent">
            Programs &amp; Activities
          </h1>
          <p className="text-sm text-[#475048]">
            Welcome, <span className="font-medium text-[#202820]">{ctx.profile.full_name}</span>.
            Showing schedules and livestreams authorized for your membership.
          </p>
        </div>

        <div className="flex flex-wrap gap-1 rounded-xl border border-[#D6C6A5]/70 bg-gradient-to-b from-[#EAE3D2] to-[#F3EFE6] p-1 shadow-inner">
          {filterTabs.map((tab) => {
            const active = selectedLevel === tab.value;
            const href = tab.value ? `/feed?level=${tab.value}` : "/feed";
            return (
              <Link
                key={tab.label}
                href={href}
                prefetch={true}
                className={`rounded-lg px-4 py-1.5 text-xs font-medium ${
                  active
                    ? "bg-gradient-to-r from-[#3A483D] to-[#202820] text-[#F5F1E9] shadow-sm"
                    : "text-[#636B62] hover:text-[#202820]"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <FlashBanner message={params.message} error={params.error ?? queryErr?.message} />

      <LocaleAdminInvitationCards
        invites={ctx.pendingAdminInvites}
        returnPath="/feed"
      />

      {!ctx.activeMembership && !ctx.profile.is_district_admin && (
        <div
          data-gsap="hero"
          className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#D6C6A5] bg-gradient-to-r from-[#FBF9F4] via-[#F0ECE3] to-[#E5D9BF] px-6 py-5 shadow-sm"
        >
          <div className="space-y-1">
            <p className="font-serif text-base font-semibold text-[#202820]">
              {ctx.pendingJoinRequest
                ? `Your request to join ${ctx.pendingJoinRequest.locale.name} is awaiting Locale Admin approval.`
                : "Want to see Davao District and Locale events?"}
            </p>
            <p className="text-xs text-[#475048]">
              {ctx.pendingJoinRequest
                ? "Your invitation code slot is reserved. District and Locale schedules will unlock automatically once approved."
                : "Submit your congregation's invitation code in Membership to unlock District and Locale activities."}
            </p>
          </div>
          <Link
            href="/membership"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3A483D] via-[#303B32] to-[#1F2720] px-4 py-2.5 text-xs font-medium text-white shadow-sm hover:from-[#303B32] hover:to-[#181E19]"
          >
            <span>{ctx.pendingJoinRequest ? "Check Status" : "Join Your Locale"}</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#D6C6A5]" />
          </Link>
        </div>
      )}

      {activities.length === 0 ? (
        <div
          data-gsap="item"
          className="rounded-2xl border border-[#D6C6A5]/70 bg-white p-16 text-center space-y-3 shadow-sm"
        >
          <CalendarSearch className="h-8 w-8 text-[#8C7853] mx-auto" />
          <div className="space-y-1">
            <h2 className="font-serif text-lg font-semibold text-[#202820]">
              No activities published under this filter yet
            </h2>
            <p className="text-xs text-[#636B62]">
              New announcements, worship schedules, and livestreams will appear here automatically.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {activities.map((activity) => {
            const canManage =
              (activity.level !== "locale" && ctx.profile.is_district_admin) ||
              (activity.level === "locale" &&
                Boolean(activity.locale_id) &&
                ctx.adminLocales.some((l) => l.id === activity.locale_id));

            return (
              <ActivityCard
                key={activity.id}
                activity={activity}
                canManage={canManage}
                returnPath={selectedLevel ? `/feed?level=${selectedLevel}` : "/feed"}
              />
            );
          })}
        </div>
      )}
    </GsapPageAnimator>
  );
}
