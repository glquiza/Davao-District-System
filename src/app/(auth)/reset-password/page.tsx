import Link from "next/link";
import { redirect } from "next/navigation";
import { KeyRound, ShieldCheck, X } from "lucide-react";
import { updatePasswordAction } from "@/app/actions/auth";
import { FlashBanner } from "@/components/FlashBanner";
import { GsapPageAnimator } from "@/components/gsap/GsapPageAnimator";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      "/login?error=" +
        encodeURIComponent(
          "Your password reset link is invalid or has expired. Please request a new one."
        )
    );
  }

  const params = await searchParams;

  return (
    <main className="relative overflow-hidden flex-1 flex items-center justify-center px-4 py-16">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/district-bg.jpg")' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-[#FBF9F4]/85 via-[#F5F1E9]/75 to-[#E8DFCC]/90 backdrop-blur-[1.5px]"
      />
      <GsapPageAnimator className="relative z-10 w-full max-w-md">
        <div
          data-gsap="hero"
          className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-br from-white via-[#FCFBF7] to-[#F2ECE0] p-8 sm:p-10 shadow-md"
        >
          <div className="inset-x-0 top-0 h-1.5 absolute bg-gradient-to-r from-[#303B32] via-[#8C7853] to-[#D6C6A5]" />

          <Link
            href="/"
            aria-label="Close and return to main page"
            title="Return to main page"
            className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#D6C6A5]/70 bg-white/90 text-[#475048] shadow-sm hover:bg-[#303B32] hover:border-[#303B32] hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </Link>

          {/* Brand Header */}
          <div className="mb-6 text-center space-y-2">
            <div className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D6C6A5] bg-[#F5F1E9] shadow-sm">
              <KeyRound className="h-8 w-8 text-[#8C7853]" />
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold bg-gradient-to-r from-[#1A211B] via-[#303B32] to-[#5C4B28] bg-clip-text text-transparent pt-2">
              Set New Password
            </h1>
            <p className="text-sm text-[#636B62] leading-relaxed">
              Create a strong new password for{" "}
              <strong className="text-[#202820] font-semibold">{user.email}</strong>.
            </p>
          </div>

          <FlashBanner message={params.message} error={params.error} />

          <form action={updatePasswordAction} className="space-y-5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-[#475048] mb-2">
                New Password
              </label>
              <PasswordInput
                name="password"
                required
                autoComplete="new-password"
                placeholder="At least 6 characters"
                className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-4 py-2.5 text-sm text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-[#475048] mb-2">
                Confirm New Password
              </label>
              <PasswordInput
                name="confirm_password"
                required
                autoComplete="new-password"
                placeholder="Re-enter new password"
                className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-4 py-2.5 text-sm text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="rounded-xl border border-[#D6C6A5]/50 bg-[#F5F1E9]/60 p-3.5 text-xs text-[#636B62] flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-[#8C7853] shrink-0" />
              <span>Password must be at least 6 characters long.</span>
            </div>

            <SubmitButton
              pendingText="Updating password..."
              className="w-full rounded-xl bg-gradient-to-r from-[#3A483D] via-[#303B32] to-[#1F2720] py-3 text-sm font-medium text-white shadow-md hover:from-[#303B32] hover:to-[#181E19]"
            >
              <KeyRound className="h-4 w-4 text-[#D6C6A5]" />
              <span>Update Password &amp; Continue</span>
            </SubmitButton>
          </form>

          <p className="mt-7 text-center text-sm text-[#636B62]">
            <Link
              href="/login"
              className="font-medium text-[#303B32] underline decoration-[#D6C6A5] underline-offset-4 hover:text-[#202820]"
            >
              Cancel and return to Sign In
            </Link>
          </p>
        </div>
      </GsapPageAnimator>
    </main>
  );
}
