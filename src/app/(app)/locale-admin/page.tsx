import Link from "next/link";
import { redirect } from "next/navigation";
import { LocaleAdminWorkspace, type LocaleAdminTab } from "@/components/admin/LocaleAdminWorkspace";
import { FlashBanner } from "@/components/FlashBanner";
import { requireUserContext } from "@/lib/auth-context";
import { createClient } from "@/lib/supabase/server";
import type {
  InvitationCode,
  LeaveRequest,
  Membership,
  MembershipRequest,
  Profile,
  ProgramActivity,
} from "@/types/database";

export default async function LocaleAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; tab?: string; message?: string; error?: string }>;
}) {
  const ctx = await requireUserContext();

  if (ctx.adminLocales.length === 0) {
    redirect("/membership");
  }

  const params = await searchParams;
  const selectedLocale =
    ctx.adminLocales.find((l) => l.id === params.locale) ?? ctx.adminLocales[0];

  const supabase = await createClient();

  const [
    codesRes,
    allCodeRequestsRes,
    pendingJoinsRes,
    pendingLeavesRes,
    activeMembersRes,
    localeActivitiesRes,
  ] = await Promise.all([
    supabase
      .from("invitation_codes")
      .select("*")
      .eq("locale_id", selectedLocale.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("membership_requests")
      .select("id, invitation_code_id, status")
      .eq("locale_id", selectedLocale.id)
      .in("status", ["pending", "approved"]),
    supabase
      .from("membership_requests")
      .select("*, profile:profiles!user_id(*), invitation_code:invitation_codes(id, code, label)")
      .eq("locale_id", selectedLocale.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("leave_requests")
      .select("*, profile:profiles!user_id(*)")
      .eq("locale_id", selectedLocale.id)
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("memberships")
      .select("*, profile:profiles!user_id(*)")
      .eq("locale_id", selectedLocale.id)
      .eq("status", "active")
      .order("joined_at", { ascending: false }),
    supabase
      .from("programs_activities")
      .select(
        "id, title, description, level, district_id, locale_id, category, modality, starts_at, ends_at, venue, status, created_by, created_at, updated_at"
      )
      .eq("locale_id", selectedLocale.id)
      .eq("level", "locale")
      .order("starts_at", { ascending: true }),
  ]);

  const queryError =
    codesRes.error?.message ||
    pendingJoinsRes.error?.message ||
    pendingLeavesRes.error?.message ||
    activeMembersRes.error?.message;

  const codes = (codesRes.data ?? []) as InvitationCode[];
  const codeCounts: Record<string, { pending: number; approved: number }> = {};
  for (const row of allCodeRequestsRes.data ?? []) {
    const entry = codeCounts[row.invitation_code_id] ?? { pending: 0, approved: 0 };
    if (row.status === "pending") entry.pending += 1;
    if (row.status === "approved") entry.approved += 1;
    codeCounts[row.invitation_code_id] = entry;
  }

  const pendingJoins = (pendingJoinsRes.data ?? []) as (MembershipRequest & {
    profile: Profile;
    invitation_code: { id: string; code: string; label: string | null };
  })[];

  const pendingLeaves = (pendingLeavesRes.data ?? []) as (LeaveRequest & {
    profile: Profile;
  })[];

  const activeMembers = (activeMembersRes.data ?? []) as (Membership & {
    profile: Profile;
  })[];

  const localeActivities = (localeActivitiesRes.data ?? []) as ProgramActivity[];

  const validTabs: LocaleAdminTab[] = ["requests", "codes", "publish", "members"];
  const initialTab: LocaleAdminTab = validTabs.includes(params.tab as LocaleAdminTab)
    ? (params.tab as LocaleAdminTab)
    : "requests";

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-r from-white via-[#FBF8F1] to-[#EDE4D0] p-6 sm:p-7 shadow-sm flex flex-wrap items-end justify-between gap-4">
        <div
          aria-hidden="true"
          className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#303B32] via-[#8C7853] to-[#D6C6A5]"
        />
        <div className="space-y-1.5">
          <span className="inline-flex items-center rounded-full border border-[#D6C6A5] bg-gradient-to-r from-[#FBF9F4] via-[#F0ECE3] to-[#E6DEC8] px-3.5 py-0.5 text-xs font-medium uppercase tracking-widest text-[#303B32] shadow-sm">
            Locale Administration
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-[#1A211B] via-[#303B32] to-[#5C4B28] bg-clip-text text-transparent pt-1">
            {selectedLocale.name}
          </h1>
          <p className="text-sm text-[#475048]">
            Review join &amp; transfer requests, share readable invitation codes, and publish
            activities for {selectedLocale.name}.
          </p>
        </div>

        {ctx.adminLocales.length > 1 && (
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#636B62]">
              Switch Managed Locale
            </p>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-[#D6C6A5]/70 bg-gradient-to-b from-[#EAE3D2] to-[#F3EFE6] p-1 shadow-inner">
              {ctx.adminLocales.map((loc) => (
                <Link
                  key={loc.id}
                  href={`/locale-admin?locale=${loc.id}&tab=${initialTab}`}
                  className={`rounded-lg px-3.5 py-1.5 text-xs font-medium ${
                    loc.id === selectedLocale.id
                      ? "bg-gradient-to-r from-[#3A483D] to-[#202820] text-white shadow-sm"
                      : "text-[#475048] hover:text-[#202820]"
                  }`}
                >
                  {loc.name}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      <FlashBanner message={params.message} error={params.error ?? queryError} />

      <LocaleAdminWorkspace
        selectedLocale={selectedLocale}
        codes={codes}
        codeCounts={codeCounts}
        pendingJoins={pendingJoins}
        pendingLeaves={pendingLeaves}
        activeMembers={activeMembers}
        localeActivities={localeActivities}
        initialTab={initialTab}
      />
    </div>
  );
}
