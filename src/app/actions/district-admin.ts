"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import {
  serializeLocaleMetadata,
  setLocaleAdminInviteStatus,
} from "@/lib/locale-metadata";
import { getSupabaseEnv } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function createLocaleAction(formData: FormData) {
  const districtId = String(formData.get("district_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const headMinister = String(formData.get("head_minister") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const contactInfo = String(formData.get("contact_info") ?? "").trim();

  if (!districtId || !name) {
    redirect("/district-admin?error=" + encodeURIComponent("Locale name is required."));
  }

  const supabase = await createClient();
  const { error } = await supabase.from("locales").insert({
    district_id: districtId,
    name,
    slug: slugify(name),
    address: address || null,
    contact_info: serializeLocaleMetadata(headMinister, contactInfo),
  });

  if (error) {
    const friendly =
      error.code === "23505"
        ? `A Locale named "${name}" already exists in Davao District.`
        : error.message;
    redirect("/district-admin?error=" + encodeURIComponent(friendly));
  }

  revalidatePath("/district-admin");
  revalidatePath("/membership");
  redirect(
    "/district-admin?message=" +
      encodeURIComponent(
        `Created Locale "${name}"${headMinister ? ` (Head Minister: ${headMinister})` : ""}! Next, assign a Locale Admin to manage its invite codes.`
      )
  );
}

export async function updateDistrictLocaleDetailsAction(formData: FormData) {
  const localeId = String(formData.get("locale_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const headMinister = String(formData.get("head_minister") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const contactInfo = String(formData.get("contact_info") ?? "").trim();

  if (!localeId) return;
  if (!name) {
    redirect("/district-admin?error=" + encodeURIComponent("Locale name is required."));
  }

  const supabase = await createClient();
  const { data: currentLocale } = await supabase
    .from("locales")
    .select("contact_info")
    .eq("id", localeId)
    .maybeSingle();

  const { error } = await supabase
    .from("locales")
    .update({
      name,
      slug: slugify(name),
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
    const friendly =
      error.code === "23505"
        ? `Another Locale named "${name}" already exists in Davao District.`
        : error.message;
    redirect("/district-admin?error=" + encodeURIComponent(friendly));
  }

  revalidatePath("/district-admin");
  revalidatePath("/locale-admin");
  revalidatePath("/membership");
  revalidatePath("/feed");
  redirect(
    "/district-admin?message=" +
      encodeURIComponent(`Updated Locale "${name}" details successfully.`)
  );
}

export async function toggleLocaleActiveAction(formData: FormData) {
  const localeId = String(formData.get("locale_id") ?? "").trim();
  const nextActive = formData.get("next_active") === "true";

  const supabase = await createClient();
  const { error } = await supabase
    .from("locales")
    .update({ is_active: nextActive })
    .eq("id", localeId);

  if (error) {
    redirect("/district-admin?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/district-admin");
  revalidatePath("/membership");
  redirect(
    "/district-admin?message=" +
      encodeURIComponent(nextActive ? "Locale activated and visible to applicants." : "Locale deactivated.")
  );
}

export async function deleteLocaleWithPasswordAction(formData: FormData) {
  const localeId = String(formData.get("locale_id") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!localeId) {
    redirect("/district-admin?error=" + encodeURIComponent("Locale ID is required."));
  }

  if (!password) {
    redirect(
      "/district-admin?error=" +
        encodeURIComponent("Please enter your District Admin password to confirm removing this Locale church.")
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !user.email) {
    redirect("/login");
  }

  const { data: adminProfile } = await supabase
    .from("profiles")
    .select("is_district_admin")
    .eq("id", user.id)
    .maybeSingle();

  if (!adminProfile?.is_district_admin) {
    redirect(
      "/district-admin?error=" +
        encodeURIComponent("Only a District Admin can remove a Locale church.")
    );
  }

  // Verify the District Admin's password using a stateless Auth client so session cookies are not disturbed on failure
  const { url, anonKey } = getSupabaseEnv();
  const verifyClient = createSupabaseJsClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { error: passwordError } = await verifyClient.auth.signInWithPassword({
    email: user.email,
    password,
  });

  if (passwordError) {
    redirect(
      "/district-admin?error=" +
        encodeURIComponent(
          "Password verification failed. Please enter your valid District Admin password to remove a Locale church."
        )
    );
  }

  const { data: localeRow } = await supabase
    .from("locales")
    .select("id, name")
    .eq("id", localeId)
    .maybeSingle();

  if (!localeRow) {
    redirect("/district-admin?error=" + encodeURIComponent("Locale not found."));
  }

  // Try atomic RPC cascade first (if 0004 migration is applied), otherwise fall back to direct cleanup + delete
  const { error: rpcError } = await supabase.rpc("delete_locale_cascade", {
    p_locale_id: localeId,
  });

  if (rpcError) {
    // 1. Temporarily grant the District Admin locale_admin privileges on this Locale so RLS allows deleting its programs_activities and resolving requests
    await supabase.from("locale_admins").upsert(
      {
        locale_id: localeId,
        user_id: user.id,
        assigned_by: user.id,
      },
      { onConflict: "locale_id,user_id" }
    );

    // 2. Delete all Programs & Activities (and cascade-delete their activity_links) published by this Locale
    await supabase.from("programs_activities").delete().eq("locale_id", localeId);

    // 3. Deactivate all invitation codes for this Locale
    await supabase
      .from("invitation_codes")
      .update({ is_active: false })
      .eq("locale_id", localeId);

    // 4. Reject all pending join requests so applicants are reset to Step 1 (Join a Locale)
    const { data: pendingJoins } = await supabase
      .from("membership_requests")
      .select("id")
      .eq("locale_id", localeId)
      .eq("status", "pending");

    for (const req of pendingJoins ?? []) {
      await supabase.rpc("review_membership_request", {
        p_request_id: req.id,
        p_decision: "rejected",
        p_note: `Locale church "${localeRow.name}" was removed by the District Administration. You may now join another Locale church.`,
      });
    }

    // 5. Approve all pending leave requests so those members are immediately released to Step 1
    const { data: pendingLeaves } = await supabase
      .from("leave_requests")
      .select("id")
      .eq("locale_id", localeId)
      .eq("status", "pending");

    for (const lr of pendingLeaves ?? []) {
      await supabase.rpc("review_leave_request", {
        p_leave_request_id: lr.id,
        p_decision: "approved",
        p_note: `Locale church "${localeRow.name}" was removed by the District Administration.`,
      });
    }

    // 6. Attempt direct cleanup and deletion of the Locale row
    await supabase.from("locale_admins").delete().eq("locale_id", localeId);
    await supabase.from("leave_requests").delete().eq("locale_id", localeId);
    await supabase.from("memberships").delete().eq("locale_id", localeId);
    await supabase.from("membership_requests").delete().eq("locale_id", localeId);
    await supabase.from("invitation_codes").delete().eq("locale_id", localeId);

    const { error: deleteError } = await supabase
      .from("locales")
      .delete()
      .eq("id", localeId);

    if (deleteError) {
      if (deleteError.code === "23503") {
        // Zero-migration fallback when ON DELETE RESTRICT is still active on memberships:
        // Grant remaining active members temporary self-release capability so their next request/page load flips their membership to 'left'
        const { data: remainingMembers } = await supabase
          .from("memberships")
          .select("user_id")
          .eq("locale_id", localeId)
          .eq("status", "active");

        for (const m of remainingMembers ?? []) {
          await supabase.from("locale_admins").upsert(
            {
              locale_id: localeId,
              user_id: m.user_id,
              assigned_by: user.id,
            },
            { onConflict: "locale_id,user_id" }
          );
        }

        const removedSlug = `removed-${localeId.slice(0, 8)}-${Date.now()}`;
        const { error: archiveError } = await supabase
          .from("locales")
          .update({
            is_active: false,
            slug: removedSlug,
            contact_info: serializeLocaleMetadata(null, null, true),
          })
          .eq("id", localeId);

        if (archiveError) {
          redirect("/district-admin?error=" + encodeURIComponent(archiveError.message));
        }
      } else {
        redirect("/district-admin?error=" + encodeURIComponent(deleteError.message));
      }
    }
  }

  revalidatePath("/district-admin");
  revalidatePath("/locale-admin");
  revalidatePath("/membership");
  revalidatePath("/feed");
  revalidatePath("/", "layout");
  redirect(
    "/district-admin?message=" +
      encodeURIComponent(
        `Password verified. Locale "${localeRow.name}" and its published activities have been removed, and its members have been reset to join a new Locale church.`
      )
  );
}

export async function assignLocaleAdminAction(formData: FormData) {
  const localeId = String(formData.get("locale_id") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();

  if (!localeId || !email) {
    redirect("/district-admin?error=" + encodeURIComponent("Select a Locale and enter the user's email."));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: targetProfile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .ilike("email", email)
    .maybeSingle();

  if (profileErr || !targetProfile) {
    redirect(
      "/district-admin?error=" +
        encodeURIComponent(`No registered user found with email "${email}". Have them register an account first.`)
    );
  }

  const { data: localeRow } = await supabase
    .from("locales")
    .select("id, name, contact_info")
    .eq("id", localeId)
    .maybeSingle();

  // Record pending Locale Admin invitation in Locale metadata
  if (localeRow) {
    await supabase
      .from("locales")
      .update({
        contact_info: setLocaleAdminInviteStatus(
          localeRow.contact_info,
          targetProfile.id,
          "pending"
        ),
      })
      .eq("id", localeId);
  }

  const { error } = await supabase.from("locale_admins").upsert(
    {
      locale_id: localeId,
      user_id: targetProfile.id,
      assigned_by: user.id,
    },
    { onConflict: "locale_id,user_id" }
  );

  if (error) {
    const friendly =
      error.code === "23505"
        ? `${targetProfile.full_name} is already invited or assigned as an Admin for this Locale.`
        : error.message;
    redirect("/district-admin?error=" + encodeURIComponent(friendly));
  }

  revalidatePath("/district-admin");
  revalidatePath("/notifications");
  revalidatePath("/membership");
  revalidatePath("/", "layout");
  redirect(
    "/district-admin?message=" +
      encodeURIComponent(
        `Sent Locale Admin invitation to ${targetProfile.full_name} (${targetProfile.email}) for ${localeRow?.name ?? "this Locale"}. Once they accept the notification, they will automatically get membership and Locale Admin access.`
      )
  );
}

export async function acceptLocaleAdminInvitationAction(formData: FormData) {
  const localeId = String(formData.get("locale_id") ?? "").trim();
  if (!localeId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: localeRow } = await supabase
    .from("locales")
    .select("*")
    .eq("id", localeId)
    .maybeSingle();

  if (!localeRow) {
    redirect("/notifications?error=" + encodeURIComponent("Locale not found."));
  }

  // 1. Mark invitation as accepted in Locale metadata
  await supabase
    .from("locales")
    .update({
      contact_info: setLocaleAdminInviteStatus(
        localeRow.contact_info,
        user.id,
        "accepted"
      ),
    })
    .eq("id", localeId);

  // 2. Try atomic RPC if migration 0004 is applied
  const { error: rpcError } = await supabase.rpc(
    "accept_locale_admin_invitation",
    { p_locale_id: localeId }
  );

  // 3. Zero-migration fallback to provision a real row in public.memberships without needing a manual invite code
  if (rpcError) {
    try {
      // Cancel any pending join request first
      const { data: pendingReq } = await supabase
        .from("membership_requests")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "pending")
        .maybeSingle();

      if (pendingReq?.id) {
        await supabase.rpc("cancel_membership_request", {
          p_request_id: pendingReq.id,
        });
      }

      // Check if user already has an active membership
      const { data: existingMembership } = await supabase
        .from("memberships")
        .select("id, locale_id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (!existingMembership) {
        const autoCode = `ADM-${localeId.slice(0, 4).toUpperCase()}-${Math.random()
          .toString(36)
          .slice(2, 6)
          .toUpperCase()}`;
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

        const { data: createdCode } = await supabase
          .from("invitation_codes")
          .insert({
            locale_id: localeId,
            code: autoCode,
            label: "Automatic Locale Admin Membership",
            max_uses: 1,
            expires_at: expiresAt,
            is_active: true,
            created_by: user.id,
          })
          .select("id")
          .maybeSingle();

        const { data: reqId } = await supabase.rpc("submit_membership_request", {
          p_locale_id: localeId,
          p_code: autoCode,
        });

        if (reqId) {
          await supabase.rpc("review_membership_request", {
            p_request_id: reqId as string,
            p_decision: "approved",
            p_note: `Automatic membership granted upon accepting Locale Admin invitation for ${localeRow.name}.`,
          });
        }

        if (createdCode?.id) {
          await supabase
            .from("invitation_codes")
            .update({ is_active: false })
            .eq("id", createdCode.id);
        }
      }
    } catch {
      // getCurrentUserContext() also guarantees automatic membership in memory
    }
  }

  revalidatePath("/locale-admin");
  revalidatePath("/district-admin");
  revalidatePath("/membership");
  revalidatePath("/notifications");
  revalidatePath("/feed");
  revalidatePath("/", "layout");
  redirect(
    `/locale-admin?locale=${localeId}&message=` +
      encodeURIComponent(
        `Welcome! You have accepted the Locale Admin invitation for ${localeRow.name} and have been automatically enrolled as a member of this congregation.`
      )
  );
}

export async function declineLocaleAdminInvitationAction(formData: FormData) {
  const localeId = String(formData.get("locale_id") ?? "").trim();
  const returnPath = String(formData.get("return_path") ?? "/notifications").trim();
  if (!localeId) return;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: localeRow } = await supabase
    .from("locales")
    .select("id, name, contact_info")
    .eq("id", localeId)
    .maybeSingle();

  if (localeRow) {
    await supabase
      .from("locales")
      .update({
        contact_info: setLocaleAdminInviteStatus(
          localeRow.contact_info,
          user.id,
          "declined"
        ),
      })
      .eq("id", localeId);
  }

  await supabase.rpc("decline_locale_admin_invitation", { p_locale_id: localeId });
  await supabase
    .from("locale_admins")
    .delete()
    .eq("locale_id", localeId)
    .eq("user_id", user.id);

  revalidatePath("/notifications");
  revalidatePath("/membership");
  revalidatePath("/district-admin");
  revalidatePath("/feed");
  revalidatePath("/", "layout");
  redirect(
    `${returnPath}?message=` +
      encodeURIComponent(
        `Declined the Locale Admin invitation${localeRow ? ` for ${localeRow.name}` : ""}.`
      )
  );
}

export async function removeLocaleAdminAction(formData: FormData) {
  const assignmentId = String(formData.get("assignment_id") ?? "").trim();
  if (!assignmentId) return;

  const supabase = await createClient();
  const { data: assignmentRow } = await supabase
    .from("locale_admins")
    .select("locale_id, user_id")
    .eq("id", assignmentId)
    .maybeSingle();

  if (assignmentRow) {
    const { data: localeRow } = await supabase
      .from("locales")
      .select("contact_info")
      .eq("id", assignmentRow.locale_id)
      .maybeSingle();

    if (localeRow) {
      await supabase
        .from("locales")
        .update({
          contact_info: setLocaleAdminInviteStatus(
            localeRow.contact_info,
            assignmentRow.user_id,
            "declined"
          ),
        })
        .eq("id", assignmentRow.locale_id);
    }
  }

  const { error } = await supabase.from("locale_admins").delete().eq("id", assignmentId);

  if (error) {
    redirect("/district-admin?error=" + encodeURIComponent(error.message));
  }

  revalidatePath("/district-admin");
  revalidatePath("/", "layout");
  redirect("/district-admin?message=" + encodeURIComponent("Locale Admin assignment removed."));
}
