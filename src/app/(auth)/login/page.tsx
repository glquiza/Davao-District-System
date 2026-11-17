import { redirect } from "next/navigation";
import { GsapPageAnimator } from "@/components/gsap/GsapPageAnimator";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string; view?: string }>;
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
        <LoginForm
          initialMessage={params.message}
          initialError={params.error}
          initialView={params.view === "forgot-password" ? "forgot-password" : "login"}
        />
      </GsapPageAnimator>
    </main>
  );
}
