import { AppNavbar } from "@/components/AppNavbar";
import { requireUserContext } from "@/lib/auth-context";

export const dynamic = "force-dynamic";

export default async function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await requireUserContext();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#FBF9F4]/75 via-[#F5F1E9]/70 to-[#EDE6D6]/80">
      <AppNavbar ctx={ctx} />
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-10">{children}</main>
    </div>
  );
}
