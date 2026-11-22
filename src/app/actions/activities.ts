"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  computeActivityScheduleStatus,
  parseActivityMetadata,
  parseReminderMinutesInput,
  serializeActivityMetadata,
} from "@/lib/activity-reminders";
import { parseDateTimeInputToISO } from "@/lib/date-utils";
import { createClient } from "@/lib/supabase/server";
import type { ActivityLevel, ActivityModality, ActivityStatus, AttendanceStatus, LinkPlatform } from "@/types/database";

function withQueryParam(basePath: string, key: string, value: string): string {
  const sep = basePath.includes("?") ? "&" : "?";
  return `${basePath}${sep}${key}=${encodeURIComponent(value)}`;
}

export async function createActivityAction(formData: FormData) {
  const returnPath = String(formData.get("return_path") ?? "/feed").trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const reminderMinutes = parseReminderMinutesInput(
    formData.get("reminder_minutes") !== null
      ? String(formData.get("reminder_minutes"))
      : undefined
  );
  const level = String(formData.get("level") ?? "") as ActivityLevel;
  const districtId = String(formData.get("district_id") ?? "").trim() || null;
  const localeId = String(formData.get("locale_id") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "Worship Service").trim();
  const modality = String(formData.get("modality") ?? "physical") as ActivityModality;
  const startsAtRaw = String(formData.get("starts_at") ?? "").trim();
  const endsAtRaw = String(formData.get("ends_at") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const thumbnailUrl = String(formData.get("thumbnail_url") ?? "").trim() || null;

  const linkLabel1 = String(formData.get("link_label_1") ?? "").trim();
  const linkUrl1 = String(formData.get("link_url_1") ?? "").trim();
  const linkPlatform1 = String(formData.get("link_platform_1") ?? "youtube") as LinkPlatform;

  const linkLabel2 = String(formData.get("link_label_2") ?? "").trim();
  const linkUrl2 = String(formData.get("link_url_2") ?? "").trim();
  const linkPlatform2 = String(formData.get("link_platform_2") ?? "facebook") as LinkPlatform;

  if (!title || !startsAtRaw) {
    redirect(withQueryParam(returnPath, "error", "Activity title and start date/time are required."));
  }

  if (modality !== "online" && !venue) {
    redirect(withQueryParam(returnPath, "error", "Physical and hybrid activities require a venue."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const timezoneOffset = formData.get("timezone_offset");
  const startsAt = parseDateTimeInputToISO(
    startsAtRaw,
    timezoneOffset !== null ? String(timezoneOffset) : null
  );
  const endsAt = endsAtRaw
    ? parseDateTimeInputToISO(
        endsAtRaw,
        timezoneOffset !== null ? String(timezoneOffset) : null
      )
    : null;

  if (!startsAt) {
    redirect(withQueryParam(returnPath, "error", "Invalid start date and time format."));
  }

  const autoStatus = computeActivityScheduleStatus(startsAt, endsAt);
  const serializedDescription = serializeActivityMetadata(description, reminderMinutes);

  const { data: created, error } = await supabase
    .from("programs_activities")
    .insert({
      title,
      description: serializedDescription,
      level,
      district_id: level === "national" ? null : districtId,
      locale_id: level === "locale" ? localeId : null,
      category,
      modality,
      starts_at: startsAt,
      ends_at: endsAt,
      venue: modality === "online" ? null : venue,
      thumbnail_url: modality === "physical" ? thumbnailUrl : null,
      status: autoStatus,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) {
    redirect(withQueryParam(returnPath, "error", error?.message ?? "Failed to publish activity."));
  }

  const linksToInsert: Array<{
    activity_id: string;
    platform: LinkPlatform;
    label: string;
    url: string;
    sort_order: number;
  }> = [];

  if (modality !== "physical" && linkUrl1) {
    linksToInsert.push({
      activity_id: created.id,
      platform: linkPlatform1,
      label: linkLabel1 || "Primary Stream / Meeting Link",
      url: linkUrl1,
      sort_order: 1,
    });
  }

  if (modality !== "physical" && linkUrl2) {
    linksToInsert.push({
      activity_id: created.id,
      platform: linkPlatform2,
      label: linkLabel2 || "Secondary Stream / Backup Link",
      url: linkUrl2,
      sort_order: 2,
    });
  }

  if (linksToInsert.length > 0) {
    await supabase.from("activity_links").insert(linksToInsert);
  }

  revalidatePath("/feed");
  revalidatePath("/district-admin");
  revalidatePath("/locale-admin");
  redirect(withQueryParam(returnPath, "message", `Published "${title}" and configured member reminders!`));
}

export async function updateActivityAction(formData: FormData) {
  const activityId = String(formData.get("activity_id") ?? "").trim();
  const returnPath = String(formData.get("return_path") ?? `/activities/${activityId}`).trim();
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const reminderMinutes = parseReminderMinutesInput(
    formData.get("reminder_minutes") !== null
      ? String(formData.get("reminder_minutes"))
      : undefined
  );
  const category = String(formData.get("category") ?? "Worship Service").trim();
  const modality = String(formData.get("modality") ?? "physical") as ActivityModality;
  const startsAtRaw = String(formData.get("starts_at") ?? "").trim();
  const endsAtRaw = String(formData.get("ends_at") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const thumbnailUrl = String(formData.get("thumbnail_url") ?? "").trim() || null;

  const linkLabel1 = String(formData.get("link_label_1") ?? "").trim();
  const linkUrl1 = String(formData.get("link_url_1") ?? "").trim();
  const linkPlatform1 = String(formData.get("link_platform_1") ?? "youtube") as LinkPlatform;

  const linkLabel2 = String(formData.get("link_label_2") ?? "").trim();
  const linkUrl2 = String(formData.get("link_url_2") ?? "").trim();
  const linkPlatform2 = String(formData.get("link_platform_2") ?? "facebook") as LinkPlatform;

  if (!activityId || !title || !startsAtRaw) {
    redirect(
      withQueryParam(returnPath, "error", "Activity title and start date/time are required.")
    );
  }

  if (modality !== "online" && !venue) {
    redirect(
      withQueryParam(returnPath, "error", "Physical and hybrid activities require a venue.")
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: existingRow } = await supabase
    .from("programs_activities")
    .select("description")
    .eq("id", activityId)
    .maybeSingle();

  const existingMeta = parseActivityMetadata(
    (existingRow as { description?: string | null } | null)?.description
  );

  const timezoneOffset = formData.get("timezone_offset");
  const startsAt = parseDateTimeInputToISO(
    startsAtRaw,
    timezoneOffset !== null ? String(timezoneOffset) : null
  );
  const endsAt = endsAtRaw
    ? parseDateTimeInputToISO(
        endsAtRaw,
        timezoneOffset !== null ? String(timezoneOffset) : null
      )
    : null;

  if (!startsAt) {
    redirect(withQueryParam(returnPath, "error", "Invalid start date and time format."));
  }

  const autoStatus = computeActivityScheduleStatus(startsAt, endsAt);
  const serializedDescription = serializeActivityMetadata(
    description,
    reminderMinutes,
    existingMeta.lastManualBlastAt
  );

  const { data: updated, error } = await supabase
    .from("programs_activities")
    .update({
      title,
      description: serializedDescription,
      category,
      modality,
      status: autoStatus,
      starts_at: startsAt,
      ends_at: endsAt,
      venue: modality === "online" ? null : venue,
      thumbnail_url: modality === "physical" ? thumbnailUrl : null,
    })
    .eq("id", activityId)
    .select("id, title");

  if (error) {
    redirect(withQueryParam(returnPath, "error", error.message));
  }

  if (!updated || updated.length === 0) {
    redirect(
      withQueryParam(
        returnPath,
        "error",
        "You do not have permission to edit this activity."
      )
    );
  }

  // Replace activity_links with the updated livestream / meeting links
  await supabase.from("activity_links").delete().eq("activity_id", activityId);

  const linksToInsert: Array<{
    activity_id: string;
    platform: LinkPlatform;
    label: string;
    url: string;
    sort_order: number;
  }> = [];

  if (modality !== "physical" && linkUrl1) {
    linksToInsert.push({
      activity_id: activityId,
      platform: linkPlatform1,
      label: linkLabel1 || "Primary Stream / Meeting Link",
      url: linkUrl1,
      sort_order: 1,
    });
  }

  if (modality !== "physical" && linkUrl2) {
    linksToInsert.push({
      activity_id: activityId,
      platform: linkPlatform2,
      label: linkLabel2 || "Secondary Stream / Backup Link",
      url: linkUrl2,
      sort_order: 2,
    });
  }

  if (linksToInsert.length > 0) {
    await supabase.from("activity_links").insert(linksToInsert);
  }

  revalidatePath("/feed");
  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/district-admin");
  revalidatePath("/locale-admin");
  revalidatePath("/notifications");
  redirect(
    withQueryParam(
      returnPath,
      "message",
      `Updated "${title}" and saved automatic reminder schedule.`
    )
  );
}

export async function sendInstantActivityReminderAction(formData: FormData) {
  const activityId = String(formData.get("activity_id") ?? "").trim();
  const returnPath = String(formData.get("return_path") ?? `/activities/${activityId}`).trim();

  if (!activityId) {
    redirect(withQueryParam(returnPath, "error", "Missing activity ID."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: row } = await supabase
    .from("programs_activities")
    .select("id, title, description")
    .eq("id", activityId)
    .maybeSingle();

  if (!row) {
    redirect(withQueryParam(returnPath, "error", "Activity not found."));
  }

  const typedRow = row as { id: string; title: string; description: string | null };
  const { cleanDescription, reminderMinutes } = parseActivityMetadata(typedRow.description);
  const blastNowIso = new Date().toISOString();

  const updatedDescription = serializeActivityMetadata(
    cleanDescription,
    reminderMinutes,
    blastNowIso
  );

  const { data: updated, error } = await supabase
    .from("programs_activities")
    .update({ description: updatedDescription })
    .eq("id", activityId)
    .select("id, title");

  if (error || !updated || updated.length === 0) {
    redirect(
      withQueryParam(
        returnPath,
        "error",
        error?.message ?? "You do not have permission to send a reminder for this activity."
      )
    );
  }

  revalidatePath("/feed");
  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/notifications");
  redirect(
    withQueryParam(
      returnPath,
      "message",
      `Sent an instant reminder notification for "${typedRow.title}" to eligible members!`
    )
  );
}

export async function updateActivityStatusAction(formData: FormData) {
  const activityId = String(formData.get("activity_id") ?? "").trim();
  const status = String(formData.get("status") ?? "") as ActivityStatus;
  const returnPath = String(formData.get("return_path") ?? "/feed").trim();

  if (!activityId || !status) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("programs_activities")
    .update({ status })
    .eq("id", activityId);

  if (error) {
    redirect(withQueryParam(returnPath, "error", error.message));
  }

  revalidatePath("/feed");
  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/district-admin");
  revalidatePath("/locale-admin");
  redirect(withQueryParam(returnPath, "message", `Activity marked as ${status}.`));
}

export async function deleteActivityAction(formData: FormData) {
  const activityId = String(formData.get("activity_id") ?? "").trim();
  const returnPath = String(formData.get("return_path") ?? "/feed").trim();

  if (!activityId) {
    redirect(withQueryParam(returnPath, "error", "Missing activity ID."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: deleted, error } = await supabase
    .from("programs_activities")
    .delete()
    .eq("id", activityId)
    .select("id, title");

  if (error) {
    redirect(withQueryParam(returnPath, "error", error.message));
  }

  if (!deleted || deleted.length === 0) {
    redirect(
      withQueryParam(
        returnPath,
        "error",
        "You do not have permission to remove this activity, or it was already removed."
      )
    );
  }

  revalidatePath("/feed");
  revalidatePath("/district-admin");
  revalidatePath("/locale-admin");
  revalidatePath("/notifications");
  redirect(
    withQueryParam(returnPath, "message", `Removed "${deleted[0].title}".`)
  );
}

export async function markNotificationReadAction(formData: FormData) {
  const notificationId = String(formData.get("notification_id") ?? "").trim();
  if (!notificationId) return;

  const supabase = await createClient();
  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationId);

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function markAllNotificationsReadAction() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return;

  await supabase
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .eq("is_read", false);

  revalidatePath("/notifications");
  revalidatePath("/", "layout");
}

export async function updateAttendanceStatusAction(formData: FormData) {
  const activityId = String(formData.get("activity_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim() as AttendanceStatus;
  const code = String(formData.get("attendance_code") ?? "").trim().toUpperCase();
  const returnPath = String(formData.get("return_path") ?? `/activities/${activityId}`).trim();

  if (!activityId || !status) {
    redirect(withQueryParam(returnPath, "error", "Missing required attendance parameters."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: activity, error: actError } = await supabase
    .from("programs_activities")
    .select("id, title, level, locale_id")
    .eq("id", activityId)
    .single();

  if (actError || !activity) {
    redirect(withQueryParam(returnPath, "error", "Activity not found."));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_district_admin")
    .eq("id", user.id)
    .single();

  let canManage = Boolean(profile?.is_district_admin);

  if (!canManage && activity.level === "locale" && activity.locale_id) {
    const { data: la } = await supabase
      .from("locale_admins")
      .select("id")
      .eq("user_id", user.id)
      .eq("locale_id", activity.locale_id)
      .maybeSingle();

    if (la) {
      canManage = true;
    }
  }

  if (!canManage) {
    redirect(
      withQueryParam(
        returnPath,
        "error",
        "Permission denied. You can only manage attendance settings for your assigned Locale church activities."
      )
    );
  }

  const updates: Record<string, unknown> = {
    attendance_status: status,
  };

  if (status === "active") {
    if (code) updates.attendance_code = code;
    updates.attendance_activated_at = new Date().toISOString();
  } else if (status === "closed") {
    updates.attendance_closed_at = new Date().toISOString();
  }

  const { error } = await supabase
    .from("programs_activities")
    .update(updates)
    .eq("id", activityId);

  if (error) {
    redirect(withQueryParam(returnPath, "error", error.message));
  }

  revalidatePath("/feed");
  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/district-admin");
  revalidatePath("/locale-admin");
  redirect(
    withQueryParam(
      returnPath,
      "message",
      `Attendance status updated to ${status.replace("_", " ")}.`
    )
  );
}

export async function submitAttendanceAction(formData: FormData) {
  const activityId = String(formData.get("activity_id") ?? "").trim();
  const rawCode = String(formData.get("attendance_code") ?? "").trim().toUpperCase();
  const returnPath = String(formData.get("return_path") ?? `/activities/${activityId}`).trim();

  if (!activityId) {
    redirect(withQueryParam(returnPath, "error", "Missing activity ID."));
  }
  if (!rawCode) {
    redirect(withQueryParam(returnPath, "error", "Please enter the attendance code."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: activity, error: actError } = await supabase
    .from("programs_activities")
    .select("id, title, attendance_status, attendance_code")
    .eq("id", activityId)
    .single();

  if (actError || !activity) {
    redirect(withQueryParam(returnPath, "error", "Activity not found."));
  }

  if (activity.attendance_status !== "active") {
    if (activity.attendance_status === "paused") {
      redirect(withQueryParam(returnPath, "error", "Attendance submission is temporarily paused by the administrator."));
    }
    if (activity.attendance_status === "closed") {
      redirect(withQueryParam(returnPath, "error", "Attendance for this activity is officially closed."));
    }
    redirect(withQueryParam(returnPath, "error", "Attendance has not been activated for this activity yet."));
  }

  const expectedCode = (activity.attendance_code ?? "").trim().toUpperCase();
  if (!expectedCode || rawCode !== expectedCode) {
    redirect(withQueryParam(returnPath, "error", "Incorrect attendance code. Please check with your pastor or administrator."));
  }

  const { data: existing } = await supabase
    .from("activity_attendance")
    .select("id")
    .eq("activity_id", activityId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    redirect(withQueryParam(returnPath, "message", "Attendance Recorded!"));
  }

  const { data: activeMembership } = await supabase
    .from("memberships")
    .select("locale_id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  const { error: insertError } = await supabase
    .from("activity_attendance")
    .insert({
      activity_id: activityId,
      user_id: user.id,
      locale_id: activeMembership?.locale_id ?? null,
      attended_at: new Date().toISOString(),
    });

  if (insertError) {
    if (insertError.code === "23505") {
      redirect(withQueryParam(returnPath, "message", "Attendance Recorded!"));
    }
    redirect(withQueryParam(returnPath, "error", insertError.message));
  }

  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/district-admin");
  redirect(withQueryParam(returnPath, "message", "Attendance Recorded!"));
}

export async function manualCheckInAction(formData: FormData) {
  const activityId = String(formData.get("activity_id") ?? "").trim();
  const targetUserId = String(formData.get("user_id") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const returnPath = String(formData.get("return_path") ?? `/activities/${activityId}`).trim();

  if (!activityId || !targetUserId) {
    redirect(withQueryParam(returnPath, "error", "Missing activity or member ID."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: activity, error: actError } = await supabase
    .from("programs_activities")
    .select("id, title, level, locale_id")
    .eq("id", activityId)
    .single();

  if (actError || !activity) {
    redirect(withQueryParam(returnPath, "error", "Activity not found."));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_district_admin")
    .eq("id", user.id)
    .single();

  let canManage = Boolean(profile?.is_district_admin);
  let adminRoleLabel = "District Admin";

  if (!canManage && activity.level === "locale" && activity.locale_id) {
    const { data: la } = await supabase
      .from("locale_admins")
      .select("id, locale:locales(name)")
      .eq("user_id", user.id)
      .eq("locale_id", activity.locale_id)
      .maybeSingle();

    if (la) {
      canManage = true;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const locName = (la.locale as any)?.name ?? "Locale";
      adminRoleLabel = `${locName} Admin`;
    }
  }

  if (!canManage) {
    redirect(
      withQueryParam(
        returnPath,
        "error",
        "Permission denied. You can only check in attendees for your assigned Locale church activities."
      )
    );
  }

  const { data: activeMembership } = await supabase
    .from("memberships")
    .select("locale_id")
    .eq("user_id", targetUserId)
    .eq("status", "active")
    .maybeSingle();

  const { error } = await supabase
    .from("activity_attendance")
    .upsert(
      {
        activity_id: activityId,
        user_id: targetUserId,
        locale_id: activeMembership?.locale_id ?? null,
        attended_at: new Date().toISOString(),
        marked_by: user.id,
        notes: notes || `Checked in by ${adminRoleLabel}`,
      },
      { onConflict: "activity_id,user_id" }
    );

  if (error) {
    redirect(withQueryParam(returnPath, "error", error.message));
  }

  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/district-admin");
  revalidatePath("/locale-admin");
  redirect(withQueryParam(returnPath, "message", "Member checked in successfully."));
}

export async function removeAttendanceRecordAction(formData: FormData) {
  const recordId = String(formData.get("record_id") ?? "").trim();
  const activityId = String(formData.get("activity_id") ?? "").trim();
  const returnPath = String(formData.get("return_path") ?? `/activities/${activityId}`).trim();

  if (!recordId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: record, error: recError } = await supabase
    .from("activity_attendance")
    .select("id, activity_id, activity:programs_activities(id, level, locale_id)")
    .eq("id", recordId)
    .single();

  if (recError || !record) {
    redirect(withQueryParam(returnPath, "error", "Attendance record not found."));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parentAct = record.activity as any;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_district_admin")
    .eq("id", user.id)
    .single();

  let canManage = Boolean(profile?.is_district_admin);

  if (!canManage && parentAct?.level === "locale" && parentAct?.locale_id) {
    const { data: la } = await supabase
      .from("locale_admins")
      .select("id")
      .eq("user_id", user.id)
      .eq("locale_id", parentAct.locale_id)
      .maybeSingle();

    if (la) {
      canManage = true;
    }
  }

  if (!canManage) {
    redirect(
      withQueryParam(
        returnPath,
        "error",
        "Permission denied. You can only remove attendance records for your assigned Locale church activities."
      )
    );
  }

  const { error } = await supabase
    .from("activity_attendance")
    .delete()
    .eq("id", recordId);

  if (error) {
    redirect(withQueryParam(returnPath, "error", error.message));
  }

  revalidatePath(`/activities/${activityId}`);
  revalidatePath("/district-admin");
  revalidatePath("/locale-admin");
  redirect(withQueryParam(returnPath, "message", "Attendance record removed."));
}

