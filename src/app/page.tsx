import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BellRing,
  Building2,
  ClipboardCheck,
  Database,
  ShieldCheck,
  Video,
} from "lucide-react";
import { GsapPageAnimator } from "@/components/gsap/GsapPageAnimator";
import { InstallAppButton } from "@/components/InstallAppButton";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getCurrentUserContext } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const configured = isSupabaseConfigured();

  if (configured) {
    const ctx = await getCurrentUserContext();
    if (ctx) {
      redirect("/feed");
    }
  }

  return (
    <main className="relative overflow-hidden flex-1 flex flex-col justify-center">
      {/* Background Photo with Warm Ivory/Gold Gradient Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: 'url("/district-bg.jpg")' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 bg-gradient-to-b from-[#FBF9F4]/85 via-[#F5F1E9]/75 to-[#E8DFCC]/90 backdrop-blur-[1.5px]"
      />
      <GsapPageAnimator className="relative z-10 mx-auto max-w-6xl px-6 py-20 space-y-20">
        <section className="text-center space-y-6">
          <div data-gsap="hero" className="flex flex-col items-center gap-3.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/pmcc-logo.png"
              alt="Pentecostal Missionary Church of Christ (4th Watch) Logo"
              className="h-24 w-24 object-contain drop-shadow-sm"
            />
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D6C6A5] bg-gradient-to-r from-[#FBF9F4] via-[#F0ECE3] to-[#E6DEC8] px-4 py-1.5 text-[11px] sm:text-xs font-medium uppercase tracking-[0.12em] text-[#303B32] shadow-sm">
              <span>PENTECOSTAL MISSIONARY CHURCH OF CHRIST (4TH WATCH)</span>
            </div>
          </div>

          <h1
            data-gsap="hero"
            className="mx-auto max-w-5xl font-serif text-5xl sm:text-7xl md:text-[5.25rem] font-bold tracking-[0.18em] sm:tracking-[0.24em] bg-gradient-to-br from-[#1A211B] via-[#2D382F] to-[#5C4B28] bg-clip-text text-transparent leading-[1.1]"
          >
            DAVAO DISTRICT
          </h1>

          <p
            data-gsap="hero"
            className="mx-auto max-w-2xl text-base sm:text-lg text-[#475048] leading-relaxed"
          >
            An Integrated Digital Platform for Managing Church Programs, Activities, Livestreams, and Locale Membership
          </p>

          {configured ? (
            <div data-gsap="hero" className="flex flex-wrap justify-center gap-3.5 pt-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#3A483D] via-[#303B32] to-[#1F2720] px-7 py-3 text-sm font-medium text-white shadow-md hover:from-[#303B32] hover:to-[#181E19]"
              >
                <span>Create Account</span>
                <ArrowRight className="h-4 w-4 text-[#D6C6A5]" />
              </Link>
              <Link
                href="/login"
                className="rounded-xl border border-[#D6C6A5] bg-gradient-to-b from-white to-[#F5F1E9] px-7 py-3 text-sm font-medium text-[#202820] shadow-sm hover:from-[#FBF9F4] hover:to-[#EDE6D6]"
              >
                Sign In
              </Link>
              <InstallAppButton variant="hero" />
            </div>
          ) : (
            <div
              data-gsap="hero"
              className="mx-auto max-w-2xl text-left rounded-2xl border border-[#D6C6A5] bg-gradient-to-br from-[#FBF9F4] via-[#F0ECE3] to-[#E6DEC8] p-7 space-y-3 shadow-sm"
            >
              <div className="flex items-center gap-2 text-[#202820] font-semibold text-sm">
                <Database className="h-4 w-4 text-[#303B32]" />
                <span>Connect Your Supabase Project to Go Live</span>
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-sm text-[#303B32]">
                <li>
                  Copy <code className="rounded bg-white px-1.5 py-0.5">.env.example</code> to{" "}
                  <code className="rounded bg-white px-1.5 py-0.5">.env.local</code> and add your
                  Supabase URL and Publishable Key.
                </li>
                <li>
                  Run the SQL files inside{" "}
                  <code className="rounded bg-white px-1.5 py-0.5">supabase/migrations/</code> in
                  the Supabase SQL Editor.
                </li>
              </ol>
            </div>
          )}
        </section>

        <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div
            data-gsap="item"
            className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-br from-white via-[#FCFBF7] to-[#F2ECE0] p-7 shadow-sm space-y-3"
          >
            <div className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#303B32] via-[#8C7853] to-[#D6C6A5]" />
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#D6C6A5]/70 bg-gradient-to-br from-[#3A483D] to-[#202820] text-[#F5F1E9] shadow-sm">
              <BellRing className="h-5 w-5 text-[#D6C6A5]" />
            </span>
            <h2 className="font-serif text-lg font-semibold text-[#202820]">
              Event &amp; Activity Notifications
            </h2>
            <p className="text-sm text-[#475048] leading-relaxed">
              Get notified immediately whenever new National, Davao District, or Locale church
              events and activities are announced, complete with automatic countdown reminders.
            </p>
          </div>

          <div
            data-gsap="item"
            className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-br from-white via-[#FCFBF7] to-[#F2ECE0] p-7 shadow-sm space-y-3"
          >
            <div className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#8C7853] via-[#D6C6A5] to-[#303B32]" />
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#D6C6A5]/70 bg-gradient-to-br from-[#3A483D] to-[#202820] text-[#F5F1E9] shadow-sm">
              <Video className="h-5 w-5 text-[#D6C6A5]" />
            </span>
            <h2 className="font-serif text-lg font-semibold text-[#202820]">
              Direct Livestreams &amp; Schedules
            </h2>
            <p className="text-sm text-[#475048] leading-relaxed">
              Watch live worship broadcasts and special services directly in one place, and check
              accurate dates, venues, and online meeting links anytime.
            </p>
          </div>

          <div
            data-gsap="item"
            className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-br from-white via-[#FCFBF7] to-[#F2ECE0] p-7 shadow-sm space-y-3"
          >
            <div className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#5C4B28] via-[#8C7853] to-[#303B32]" />
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#D6C6A5]/70 bg-gradient-to-br from-[#3A483D] to-[#202820] text-[#F5F1E9] shadow-sm">
              <ClipboardCheck className="h-5 w-5 text-[#D6C6A5]" />
            </span>
            <h2 className="font-serif text-lg font-semibold text-[#202820]">
              Attendance Management
            </h2>
            <p className="text-sm text-[#475048] leading-relaxed">
              Check in seamlessly during services with a 6-digit code or QR scan. Leaders get
              live headcounts, manual sign-ins, and 1-click Excel, Word, or PDF reports.
            </p>
          </div>

          <div
            data-gsap="item"
            className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-br from-white via-[#FCFBF7] to-[#F2ECE0] p-7 shadow-sm space-y-3"
          >
            <div className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#D6C6A5] via-[#303B32] to-[#8C7853]" />
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#D6C6A5]/70 bg-gradient-to-br from-[#3A483D] to-[#202820] text-[#F5F1E9] shadow-sm">
              <Building2 className="h-5 w-5 text-[#D6C6A5]" />
            </span>
            <h2 className="font-serif text-lg font-semibold text-[#202820]">
              Easy Locale Connection
            </h2>
            <p className="text-sm text-[#475048] leading-relaxed">
              Connect with your home Locale congregation using an invitation code to view your
              local announcements, Head Minister details, and congregation schedules.
            </p>
          </div>
        </section>

        <footer
          data-gsap="item"
          className="flex items-center justify-center gap-2 text-xs text-[#636B62] pt-2"
        >
          <ShieldCheck className="h-4 w-4 text-[#8C7853]" />
          <span>Davao District System — Crafted for clarity, peace, and order</span>
        </footer>
      </GsapPageAnimator>
    </main>
  );
}
