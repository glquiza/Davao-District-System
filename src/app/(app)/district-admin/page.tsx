import { redirect } from "next/navigation";
import { DistrictAdminWorkspace } from "@/components/admin/DistrictAdminWorkspace";
import { FlashBanner } from "@/components/FlashBanner";
import { requireUserContext } from "@/lib/auth-context";
import {
  getLocaleAdminInviteStatus,
  isLocaleRemoved,
} from "@/lib/locale-metadata";
import { createClient } from "@/lib/supabase/server";
import type {
  ActivityAttendanceRecord,
  AuditLog,
  District,
  Locale,
  LocaleAdminAssignment,
  Profile,
  ProgramActivity,
} from "@/types/database";

export default async function DistrictAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; message?: string; error?: string }>;
}) {
  const ctx = await requireUserContext();

  if (!ctx.profile.is_district_admin) {
    redirect("/feed");
  }

  const params = await searchParams;
  const supabase = await createClient();

  const [
    districtRes,
    localesRes,
    assignmentsRes,
    activeMemberCountsRes,
    auditLogsRes,
    publishedActivitiesRes,
    attendanceRes,
    allMembersRes,
  ] = await Promise.all([
    supabase
      .from("districts")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase.from("locales").select("*").order("name", { ascending: true }),
    supabase
      .from("locale_admins")
      .select("*, locale:locales(*), profile:profiles!user_id(*)")
      .order("created_at", { ascending: false }),
    supabase.from("memberships").select("locale_id").eq("status", "active"),
    supabase
      .from("audit_logs")
      .select("*, actor:profiles!actor_id(id, full_name, email), locale:locales(id, name)")
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("programs_activities")
      .select(
        "id, title, description, level, district_id, locale_id, category, modality, starts_at, ends_at, venue, status, attendance_status, attendance_code, attendance_activated_at, attendance_closed_at, created_by, created_at, updated_at"
      )
      .in("level", ["national", "district"])
      .order("starts_at", { ascending: true }),
    supabase
      .from("activity_attendance")
      .select("*, profile:profiles!user_id(id, full_name, email, avatar_url), locale:locales(id, name, slug)")
      .order("attended_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name", { ascending: true }),
  ]);

  const queryError =
    localesRes.error?.message ||
    assignmentsRes.error?.message ||
    auditLogsRes.error?.message;

  const district = districtRes.data as District | null;
  const allFetchedLocales = (localesRes.data ?? []) as Locale[];
  const staleRemovedLocales = allFetchedLocales.filter((loc) => isLocaleRemoved(loc));

  // Automatically purge any leftover soft-removed Locales and their activities/admins
  if (staleRemovedLocales.length > 0) {
    for (const rem of staleRemovedLocales) {
      await supabase.rpc("delete_locale_cascade", { p_locale_id: rem.id });
      await supabase.from("locale_admins").upsert(
        { locale_id: rem.id, user_id: ctx.profile.id, assigned_by: ctx.profile.id },
        { onConflict: "locale_id,user_id" }
      );
      await supabase.from("programs_activities").delete().eq("locale_id", rem.id);
      await supabase.from("locale_admins").delete().eq("locale_id", rem.id);
      await supabase.from("leave_requests").delete().eq("locale_id", rem.id);
      await supabase.from("memberships").delete().eq("locale_id", rem.id);
      await supabase.from("membership_requests").delete().eq("locale_id", rem.id);
      await supabase.from("invitation_codes").delete().eq("locale_id", rem.id);
      await supabase.from("locales").delete().eq("id", rem.id);
    }
  }

  const locales = allFetchedLocales.filter((loc) => !isLocaleRemoved(loc));
  const validLocaleIds = new Set(locales.map((l) => l.id));
  const localeMap = new Map(locales.map((l) => [l.id, l]));

  const rawAssignments = ((assignmentsRes.data ?? []) as LocaleAdminAssignment[]).filter(
    (a) => validLocaleIds.has(a.locale_id)
  );

  const assignments: LocaleAdminAssignment[] = [];
  for (const a of rawAssignments) {
    const loc = localeMap.get(a.locale_id);
    const status = getLocaleAdminInviteStatus(loc, a.user_id, false);
    if (status === "declined") {
      await supabase.from("locale_admins").delete().eq("id", a.id);
    } else {
      assignments.push(a);
    }
  }
  const auditLogs = (auditLogsRes.data ?? []) as AuditLog[];
  const publishedActivities = (publishedActivitiesRes.data ?? []) as ProgramActivity[];
  const rawAttendance = (attendanceRes.data ?? []) as ActivityAttendanceRecord[];
  const allMembers = (allMembersRes.data ?? []) as Pick<Profile, "id" | "full_name" | "email">[];

  const attendanceByActivity: Record<string, ActivityAttendanceRecord[]> = {};
  for (const att of rawAttendance) {
    if (!attendanceByActivity[att.activity_id]) {
      attendanceByActivity[att.activity_id] = [];
    }
    attendanceByActivity[att.activity_id].push(att);
  }

  const memberCounts: Record<string, number> = {};
  let totalActiveMembers = 0;
  for (const row of activeMemberCountsRes.data ?? []) {
    if (validLocaleIds.has(row.locale_id)) {
      memberCounts[row.locale_id] = (memberCounts[row.locale_id] ?? 0) + 1;
      totalActiveMembers += 1;
    }
  }

  const initialTab =
    params.tab === "publish" || params.tab === "logs" ? params.tab : "locales";

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-r from-white via-[#FBF8F1] to-[#EDE4D0] p-6 sm:p-7 shadow-sm space-y-1.5">
        <div
          aria-hidden="true"
          className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#303B32] via-[#8C7853] to-[#D6C6A5]"
        />
        <span className="inline-flex items-center rounded-full border border-[#D6C6A5] bg-gradient-to-r from-[#FBF9F4] via-[#F0ECE3] to-[#E6DEC8] px-3.5 py-0.5 text-xs font-medium uppercase tracking-widest text-[#303B32] shadow-sm">
          Davao District Administration
        </span>
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-[#1A211B] via-[#303B32] to-[#5C4B28] bg-clip-text text-transparent pt-1">
          {district?.name ?? "Davao District"} Console
        </h1>
        <p className="text-sm text-[#475048]">
          Create Locales, assign Locale Admins directly on each Locale card, and publish National or
          District-wide programs.
        </p>
      </div>

      <FlashBanner message={params.message} error={params.error ?? queryError} />

      <DistrictAdminWorkspace
        district={district}
        locales={locales}
        assignments={assignments}
        memberCounts={memberCounts}
        totalActiveMembers={totalActiveMembers}
        auditLogs={auditLogs}
        publishedActivities={publishedActivities}
        attendanceByActivity={attendanceByActivity}
        allMembers={allMembers}
        initialTab={initialTab}
      />
    </div>
  );
}
