"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUserContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";

export async function submitMembershipRequestAction(formData: FormData) {
  const localeId = String(formData.get("locale_id") ?? "").trim();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();

  if (!localeId || !code) {
    redirect("/membership?error=" + encodeURIComponent("Please select a Locale and enter an invitation code."));
  }

  // Ensure any membership tied to a removed Locale is released first
  await getCurrentUserContext();

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_membership_request", {
    p_locale_id: localeId,
    p_code: code,
  });

  if (error) {
    redirect("/membership?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/membership");
  revalidatePath("/feed");
  redirect("/membership?message=" + encodeURIComponent("Membership request submitted! Waiting for Locale Admin approval."));
}

export async function cancelMembershipRequestAction(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "").trim();
  if (!requestId) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_membership_request", {
    p_request_id: requestId,
  });

  if (error) {
    redirect("/membership?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/membership");
  redirect("/membership?message=" + encodeURIComponent("Pending membership request cancelled."));
}

export async function submitLeaveRequestAction(formData: FormData) {
  const reason = String(formData.get("reason") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("submit_leave_request", {
    p_reason: reason || null,
  });

  if (error) {
    redirect("/membership?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/membership");
  redirect(
    "/membership?message=" +
      encodeURIComponent("Leave request submitted. Your current membership stays active until your outgoing Locale Admin approves it.")
  );
}

export async function cancelLeaveRequestAction(formData: FormData) {
  const leaveRequestId = String(formData.get("leave_request_id") ?? "").trim();
  if (!leaveRequestId) return;

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_leave_request", {
    p_leave_request_id: leaveRequestId,
  });

  if (error) {
    redirect("/membership?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/membership");
  redirect("/membership?message=" + encodeURIComponent("Leave request cancelled. Your Locale membership remains active."));
}
