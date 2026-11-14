import { cache } from "react";
import { redirect } from "next/navigation";
import {
  getLocaleAdminInviteStatus,
  isLocaleRemoved,
} from "@/lib/locale-metadata";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type {
  LeaveRequest,
  Locale,
  Membership,
  MembershipRequest,
  Profile,
  UserAccessContext,
} from "@/types/database";

export const getCurrentUserContext = cache(
  async (): Promise<UserAccessContext | null> => {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    const user = session?.user ?? null;

    if (!user) {
      return null;
    }

  const [
    profileRes,
    activeMembershipRes,
    pendingJoinRes,
    pendingLeaveRes,
    adminLocalesRes,
    unreadCountRes,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("memberships")
      .select("*, locale:locales(*)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle(),
    supabase
      .from("membership_requests")
      .select("*, locale:locales(*)")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle(),
    supabase
      .from("leave_requests")
      .select("*, locale:locales(*)")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .maybeSingle(),
    supabase
      .from("locale_admins")
      .select("locale:locales(*)")
      .eq("user_id", user.id),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false),
  ]);

  const fallbackName =
    (user.user_metadata?.full_name as string | undefined) ||
    user.email?.split("@")[0] ||
    "Member";

  let profile: Profile = (profileRes.data as Profile | null) ?? {
    id: user.id,
    email: user.email ?? "",
    full_name: fallbackName,
    avatar_url: null,
    is_district_admin: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (!profileRes.data) {
    const { data: upsertedProfile } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          email: user.email ?? "",
          full_name: fallbackName,
        },
        { onConflict: "id" }
      )
      .select("*")
      .maybeSingle();

    if (upsertedProfile) {
      profile = upsertedProfile as Profile;
    }
  }

  let activeMembership =
    (activeMembershipRes.data as (Membership & { locale: Locale }) | null) ?? null;
  let pendingJoinRequest =
    (pendingJoinRes.data as (MembershipRequest & { locale: Locale }) | null) ?? null;
  let pendingLeaveRequest =
    (pendingLeaveRes.data as (LeaveRequest & { locale: Locale }) | null) ?? null;

  // If the member's Locale was removed by the District Admin, automatically release them back to Step 1
  if (activeMembership && isLocaleRemoved(activeMembership.locale)) {
    try {
      let leaveId = pendingLeaveRequest?.id ?? null;
      if (!leaveId) {
        const { data: createdLeaveId } = await supabase.rpc("submit_leave_request", {
          p_reason: "Locale church removed by District Administration",
        });
        leaveId = (createdLeaveId as string | null) ?? null;
      }
      if (leaveId) {
        await supabase.rpc("review_leave_request", {
          p_leave_request_id: leaveId,
          p_decision: "approved",
          p_note: "Membership reset automatically because the Locale church was removed.",
        });
      }
    } catch {
      // Best-effort auto-release
    }
    activeMembership = null;
    pendingLeaveRequest = null;
  }

  if (pendingJoinRequest && isLocaleRemoved(pendingJoinRequest.locale)) {
    try {
      await supabase.rpc("cancel_membership_request", {
        p_request_id: pendingJoinRequest.id,
      });
    } catch {
      // Best-effort cancellation
    }
    pendingJoinRequest = null;
  }

  const allAssignedLocales = (adminLocalesRes.data ?? [])
    .map((row: { locale: Locale | Locale[] | null }) =>
      Array.isArray(row.locale) ? row.locale[0] : row.locale
    )
    .filter((loc): loc is Locale => Boolean(loc) && !isLocaleRemoved(loc));

  const adminLocales: Locale[] = [];
  const pendingAdminInvites: Locale[] = [];

  for (const loc of allAssignedLocales) {
    const hasActiveHere = Boolean(
      activeMembership && activeMembership.locale_id === loc.id
    );
    const inviteStatus = getLocaleAdminInviteStatus(loc, user.id, hasActiveHere);
    if (inviteStatus === "accepted") {
      adminLocales.push(loc);
    } else if (inviteStatus === "pending") {
      pendingAdminInvites.push(loc);
    }
  }

  // Accepted Locale Admins automatically receive active membership in their assigned Locale without needing an invite code
  if (!activeMembership && adminLocales.length > 0) {
    const primaryAdminLocale = adminLocales[0];
    activeMembership = {
      id: `admin-membership-${primaryAdminLocale.id}`,
      user_id: user.id,
      locale_id: primaryAdminLocale.id,
      request_id: null,
      status: "active",
      joined_at: primaryAdminLocale.created_at,
      left_at: null,
      left_reason: null,
      locale: primaryAdminLocale,
    };
  }

  return {
    profile,
    activeMembership,
    pendingJoinRequest,
    pendingLeaveRequest,
    adminLocales,
    pendingAdminInvites,
    unreadNotificationCount:
      (unreadCountRes.count ?? 0) + pendingAdminInvites.length,
  };
});

export async function requireUserContext(): Promise<UserAccessContext> {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }
  const ctx = await getCurrentUserContext();
  if (!ctx) {
    redirect("/login");
  }
  return ctx;
}

