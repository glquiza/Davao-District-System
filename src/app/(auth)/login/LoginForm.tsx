"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Loader2,
  LogIn,
  Mail,
  Send,
  X,
} from "lucide-react";
import {
  requestPasswordResetAction,
  signInAction,
} from "@/app/actions/auth";
import { FlashBanner } from "@/components/FlashBanner";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/SubmitButton";

interface LoginFormProps {
  initialMessage?: string;
  initialError?: string;
  initialView?: "login" | "forgot-password";
}

export function LoginForm({
  initialMessage,
  initialError,
  initialView = "login",
}: LoginFormProps) {
  const [view, setView] = useState<"login" | "forgot-password">(initialView);
  const [email, setEmail] = useState("");
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleResetSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(null);

    const formData = new FormData(e.currentTarget);
    const targetEmail = String(formData.get("reset_email") ?? "").trim();

    if (!targetEmail) {
      setResetError("Please enter your email address.");
      return;
    }

    startTransition(async () => {
      const res = await requestPasswordResetAction({ email: targetEmail });
      if (res?.error) {
        setResetError(res.error);
      } else if (res?.message) {
        setResetSuccess(res.message);
      } else {
        setResetSuccess(
          `Password reset instructions have been sent to ${targetEmail}. Please check your inbox and spam folder.`
        );
      }
    });
  };

  return (
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
        <Link href="/" className="inline-flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/pmcc-logo.png"
            alt="PMCC (4th Watch) Logo"
            className="h-20 w-20 object-contain drop-shadow-sm"
          />
        </Link>
        <h1 className="font-serif text-2xl sm:text-3xl font-semibold bg-gradient-to-r from-[#1A211B] via-[#303B32] to-[#5C4B28] bg-clip-text text-transparent pt-2">
          {view === "login" ? "Welcome Back" : "Reset Your Password"}
        </h1>
        <p className="text-sm text-[#636B62] leading-relaxed">
          {view === "login"
            ? "Sign in to view church programs, schedules, livestreams, and Locale updates."
            : "Enter your registered email and we will send you a secure link to reset your password."}
        </p>
      </div>

      {view === "login" ? (
        <>
          <FlashBanner message={initialMessage} error={initialError} />

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
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-4 py-2.5 text-sm text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none transition-colors"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-medium uppercase tracking-widest text-[#475048]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetError(null);
                    setResetSuccess(null);
                    setView("forgot-password");
                  }}
                  className="text-xs font-semibold text-[#8C7853] hover:text-[#303B32] transition-colors underline-offset-4 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
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
        </>
      ) : (
        /* Forgot Password View */
        <div className="space-y-5 animate-in fade-in duration-200">
          {resetError && (
            <div className="rounded-xl border border-red-200 bg-red-50/90 p-4 text-xs sm:text-sm text-red-800 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Unable to send reset link</p>
                <p>{resetError}</p>
              </div>
            </div>
          )}

          {resetSuccess ? (
            <div className="space-y-5">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/90 p-4 text-xs sm:text-sm text-emerald-800 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Check your email</p>
                  <p>{resetSuccess}</p>
                </div>
              </div>

              <div className="rounded-xl border border-[#D6C6A5]/50 bg-[#F5F1E9]/60 p-4 text-xs text-[#636B62] space-y-1.5">
                <p className="font-medium text-[#303B32]">Next steps:</p>
                <p>1. Open the email message from PMCC (4th Watch).</p>
                <p>2. Tap the secure reset link inside.</p>
                <p>3. Choose your new password and sign right back in.</p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setResetError(null);
                  setResetSuccess(null);
                  setView("login");
                }}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#D6C6A5] bg-white py-2.5 text-sm font-semibold text-[#303B32] shadow-sm hover:bg-[#F5F1E9] transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Return to Sign In</span>
              </button>
            </div>
          ) : (
            <form onSubmit={handleResetSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-medium uppercase tracking-widest text-[#475048] mb-2">
                  Account Email Address
                </label>
                <div className="relative">
                  <input
                    type="email"
                    name="reset_email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    defaultValue={email}
                    className="w-full rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 pl-10 pr-4 py-2.5 text-sm text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none transition-colors"
                  />
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C7853]" />
                </div>
                <p className="mt-1.5 text-[11px] text-[#636B62]">
                  We will send a single-use verification link to this address.
                </p>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#8C7853] via-[#736342] to-[#594B2E] py-3 text-sm font-semibold text-white shadow-md hover:from-[#736342] hover:to-[#473B23] transition-all disabled:opacity-70"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-[#F5F1E9]" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 text-[#F5F1E9]" />
                    <span>Send Password Reset Link</span>
                  </>
                )}
              </button>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setResetError(null);
                    setView("login");
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#475048] hover:text-[#202820] hover:underline"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Remember your password? Back to Sign In</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
