"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { serializeLocaleMetadata } from "@/lib/locale-metadata";
import { createClient } from "@/lib/supabase/server";

function buildInviteCode(prefix: string): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let part1 = "";
  let part2 = "";
  for (let i = 0; i < 4; i++) {
    part1 += alphabet[Math.floor(Math.random() * alphabet.length)];
    part2 += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  const cleanPrefix = prefix
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 5) || "DAVAO";
  return `${cleanPrefix}-${part1}-${part2}`;
}

export async function generateInviteCodeAction(formData: FormData) {
  const localeId = String(formData.get("locale_id") ?? "").trim();
  const localeSlug = String(formData.get("locale_slug") ?? "DAVAO").trim();
  const customCode = String(formData.get("custom_code") ?? "").trim().toUpperCase();
  const label = String(formData.get("label") ?? "").trim();
  const maxUses = Number(formData.get("max_uses") ?? 10);
  const expiresInDays = Number(formData.get("expires_in_days") ?? 14);

  if (!localeId || !Number.isFinite(maxUses) || maxUses < 1) {
    redirect("/locale-admin?error=" + encodeURIComponent("Invalid invitation code settings."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const code = customCode || buildInviteCode(localeSlug);
  const expiresAt = new Date(Date.now() + Math.max(1, expiresInDays) * 86400 * 1000).toISOString();

  const { error } = await supabase.from("invitation_codes").insert({
    locale_id: localeId,
    code,
    label: label || null,
    max_uses: Math.floor(maxUses),
    expires_at: expiresAt,
    created_by: user.id,
  });

  if (error) {
    const friendly =
      error.code === "23505"
        ? `Invitation code "${code}" already exists. Try another custom code or leave it blank to auto-generate.`
        : error.message;
    redirect(`/locale-admin?locale=${localeId}&tab=codes&error=` + encodeURIComponent(friendly));
  }

  revalidatePath("/locale-admin");
  redirect(`/locale-admin?locale=${localeId}&tab=codes&message=` + encodeURIComponent(`Generated code ${code} — ready to copy and share!`));
}

export async function toggleInviteCodeStatusAction(formData: FormData) {
  const codeId = String(formData.get("code_id") ?? "").trim();
  const localeId = String(formData.get("locale_id") ?? "").trim();
  const nextActive = formData.get("next_active") === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("invitation_codes")
    .update({ is_active: nextActive })
    .eq("id", codeId);

  if (error) {
    redirect(`/locale-admin?locale=${localeId}&tab=codes&error=` + encodeURIComponent(error.message));
  }

  revalidatePath("/locale-admin");
  redirect(
    `/locale-admin?locale=${localeId}&tab=codes&message=` +
      encodeURIComponent(nextActive ? "Invitation code reactivated." : "Invitation code revoked.")
  );
}

export async function reviewJoinRequestAction(formData: FormData) {
  const requestId = String(formData.get("request_id") ?? "").trim();
  const localeId = String(formData.get("locale_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_membership_request", {
    p_request_id: requestId,
    p_decision: decision,
    p_note: note || null,
  });

  if (error) {
    redirect(`/locale-admin?locale=${localeId}&tab=requests&error=` + encodeURIComponent(error.message));
  }

  revalidatePath("/locale-admin");
  redirect(
    `/locale-admin?locale=${localeId}&tab=requests&message=` +
      encodeURIComponent(`Membership request ${decision}.`)
  );
}

export async function reviewLeaveRequestAction(formData: FormData) {
  const leaveRequestId = String(formData.get("leave_request_id") ?? "").trim();
  const localeId = String(formData.get("locale_id") ?? "").trim();
  const decision = String(formData.get("decision") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  const supabase = await createClient();
  const { error } = await supabase.rpc("review_leave_request", {
    p_leave_request_id: leaveRequestId,
    p_decision: decision,
    p_note: note || null,
  });

  if (error) {
    redirect(`/locale-admin?locale=${localeId}&tab=requests&error=` + encodeURIComponent(error.message));
  }

  revalidatePath("/locale-admin");
  redirect(
    `/locale-admin?locale=${localeId}&tab=requests&message=` +
      encodeURIComponent(`Leave request ${decision}.`)
  );
}

export async function updateLocaleInfoAction(formData: FormData) {
  const localeId = String(formData.get("locale_id") ?? "").trim();
  const headMinister = String(formData.get("head_minister") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const contactInfo = String(formData.get("contact_info") ?? "").trim();

  const supabase = await createClient();
  const { data: currentLocale } = await supabase
    .from("locales")
    .select("contact_info")
    .eq("id", localeId)
    .maybeSingle();

  const { error } = await supabase
    .from("locales")
    .update({
      address: address || null,
      contact_info: serializeLocaleMetadata(
        headMinister,
        contactInfo,
        false,
        undefined,
        currentLocale?.contact_info
      ),
    })
    .eq("id", localeId);

  if (error) {
    redirect(`/locale-admin?locale=${localeId}&tab=members&error=` + encodeURIComponent(error.message));
  }

  revalidatePath("/locale-admin");
  revalidatePath("/district-admin");
  revalidatePath("/membership");
  redirect(`/locale-admin?locale=${localeId}&tab=members&message=` + encodeURIComponent("Locale Head Minister and details updated."));
}
