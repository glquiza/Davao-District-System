"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { validateRealEmailAddress } from "@/lib/email-validator";
import { createClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=" + encodeURIComponent("Email and password are required."));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect("/login?error=" + encodeURIComponent(error.message));
  }

  redirect("/feed");
}

export async function signUpAction(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || !password) {
    redirect("/register?error=" + encodeURIComponent("Full name, email, and password are required."));
  }

  if (password.length < 6) {
    redirect("/register?error=" + encodeURIComponent("Password must be at least 6 characters."));
  }

  const emailCheck = await validateRealEmailAddress(email);
  if (!emailCheck.valid) {
    redirect(
      "/register?error=" +
        encodeURIComponent(emailCheck.reason ?? "Please enter a valid, active email address.")
    );
  }

  const headerList = await headers();
  const origin =
    headerList.get("origin") ||
    (headerList.get("host") ? `https://${headerList.get("host")}` : "http://localhost:3000");

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    redirect("/register?error=" + encodeURIComponent(error.message));
  }

  // When "Confirm email" is enabled and the email is already registered,
  // Supabase returns a user with an empty identities array instead of sending a duplicate email
  if (
    data.user &&
    Array.isArray(data.user.identities) &&
    data.user.identities.length === 0
  ) {
    redirect(
      "/login?error=" +
        encodeURIComponent(
          `An account with "${email}" is already registered! Please sign in with your password instead.`
        )
    );
  }

  if (data.user) {
    await supabase.from("profiles").upsert(
      {
        id: data.user.id,
        email,
        full_name: fullName,
      },
      { onConflict: "id" }
    );
  }

  if (data.session) {
    redirect("/feed?welcome=1");
  }

  redirect(
    "/login?message=" +
      encodeURIComponent("Account created! Check your email if confirmation is enabled, then sign in.")
  );
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
