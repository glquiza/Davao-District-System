"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function signInAction(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
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
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || !password) {
    redirect("/register?error=" + encodeURIComponent("Full name, email, and password are required."));
  }

  if (password.length < 6) {
    redirect("/register?error=" + encodeURIComponent("Password must be at least 6 characters."));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    redirect("/register?error=" + encodeURIComponent(error.message));
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
