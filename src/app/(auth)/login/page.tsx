import Link from "next/link";
import { redirect } from "next/navigation";
import { LogIn, X } from "lucide-react";
import { signInAction } from "@/app/actions/auth";
import { FlashBanner } from "@/components/FlashBanner";
import { GsapPageAnimator } from "@/components/gsap/GsapPageAnimator";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  if (!isSupabaseConfigured()) {
    redirect("/");
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
            className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[#D6C6A5]/70 bg-white/90 text-[#475048] shadow-sm hover:bg-[#303B32] hover:border-[#303B32] hover:text-white"
          >
            <X className="h-4 w-4" />
          </Link>
          <div className="mb-8 text-center space-y-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/pmcc-logo.png"
                alt="PMCC (4th Watch) Logo"
                className="h-20 w-20 object-contain drop-shadow-sm"
              />
            </Link>
            <h1 className="font-serif text-2xl sm:text-3xl font-semibold bg-gradient-to-r from-[#1A211B] via-[#303B32] to-[#5C4B28] bg-clip-text text-transparent pt-2">
              Welcome Back
            </h1>
            <p className="text-sm text-[#636B62] leading-relaxed">
              Sign in to view church programs, schedules, livestreams, and Locale updates.
            </p>
          </div>

          <FlashBanner message={params.message} error={params.error} />

          <form action={signInAction} className="space-y-5">
            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-[#475048] mb-2">
                Email Address
              </label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-4 py-2.5 text-sm text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium uppercase tracking-widest text-[#475048] mb-2">
                Password
              </label>
              <PasswordInput
                name="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-4 py-2.5 text-sm text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none"
              />
            </div>

            <SubmitButton
              pendingText="Signing in..."
              className="w-full rounded-xl bg-gradient-to-r from-[#3A483D] via-[#303B32] to-[#1F2720] py-3 text-sm font-medium text-white shadow-md hover:from-[#303B32] hover:to-[#181E19]"
            >
              <LogIn className="h-4 w-4 text-[#D6C6A5]" />
              <span>Sign In</span>
            </SubmitButton>
          </form>

          <p className="mt-7 text-center text-sm text-[#636B62]">
            Don&apos;t have an account yet?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#303B32] underline decoration-[#D6C6A5] underline-offset-4 hover:text-[#202820]"
            >
              Create an account
            </Link>
          </p>
        </div>
      </GsapPageAnimator>
    </main>
  );
}
