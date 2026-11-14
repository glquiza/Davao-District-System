import {
  Building2,
  CheckCircle2,
  Clock,
  History,
  KeyRound,
  LogOut,
  MapPin,
  UserCheck,
} from "lucide-react";
import {
  cancelLeaveRequestAction,
  cancelMembershipRequestAction,
  submitLeaveRequestAction,
} from "@/app/actions/membership";
import { FlashBanner } from "@/components/FlashBanner";
import { GsapPageAnimator } from "@/components/gsap/GsapPageAnimator";
import { JoinLocaleForm } from "@/components/JoinLocaleForm";
import { LocaleAdminInvitationCards } from "@/components/LocaleAdminInvitationCards";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireUserContext } from "@/lib/auth-context";
import { isLocaleRemoved, parseLocaleMetadata } from "@/lib/locale-metadata";
import { createClient } from "@/lib/supabase/server";
import type { LeaveRequest, Locale, Membership, MembershipRequest } from "@/types/database";

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; error?: string }>;
}) {
  const ctx = await requireUserContext();
  const params = await searchParams;
  const supabase = await createClient();

  const [localesRes, historyMembershipsRes, pastJoinRequestsRes, pastLeaveRequestsRes] =
    await Promise.all([
      supabase
        .from("locales")
        .select("*")
        .eq("is_active", true)
        .order("name", { ascending: true }),
      supabase
        .from("memberships")
        .select("*, locale:locales(*)")
        .eq("user_id", ctx.profile.id)
        .order("joined_at", { ascending: false }),
      supabase
        .from("membership_requests")
        .select("*, locale:locales(*)")
        .eq("user_id", ctx.profile.id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("leave_requests")
        .select("*, locale:locales(*)")
        .eq("user_id", ctx.profile.id)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

  const activeLocales = ((localesRes.data ?? []) as Locale[]).filter(
    (loc) => !isLocaleRemoved(loc)
  );
  const membershipHistory = ((historyMembershipsRes.data ?? []) as (Membership & {
    locale: Locale;
  })[]).filter((m) => !isLocaleRemoved(m.locale));
  const joinRequests = ((pastJoinRequestsRes.data ?? []) as (MembershipRequest & {
    locale: Locale;
  })[]).filter((r) => !isLocaleRemoved(r.locale));
  const leaveRequests = ((pastLeaveRequestsRes.data ?? []) as (LeaveRequest & {
    locale: Locale;
  })[]).filter((r) => !isLocaleRemoved(r.locale));

  const currentStep = ctx.activeMembership ? 3 : ctx.pendingJoinRequest ? 2 : 1;

  const steps = [
    { num: 1, title: "Account Registered", sub: "National access unlocked" },
    { num: 2, title: "Submit Invite Code", sub: "Locale Admin reviews request" },
    { num: 3, title: "Approved Member", sub: "Full District & Locale access" },
  ];

  const activeLocaleMeta = ctx.activeMembership
    ? parseLocaleMetadata(ctx.activeMembership.locale.contact_info)
    : null;
  const pendingLocaleMeta = ctx.pendingJoinRequest
    ? parseLocaleMetadata(ctx.pendingJoinRequest.locale.contact_info)
    : null;

  return (
    <GsapPageAnimator className="max-w-4xl mx-auto space-y-8">
      <div
        data-gsap="hero"
        className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-r from-white via-[#FBF8F1] to-[#EDE4D0] p-6 sm:p-7 shadow-sm space-y-1.5"
      >
        <div
          aria-hidden="true"
          className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#303B32] via-[#8C7853] to-[#D6C6A5]"
        />
        <h1 className="font-serif text-3xl sm:text-4xl font-semibold tracking-tight bg-gradient-to-r from-[#1A211B] via-[#303B32] to-[#5C4B28] bg-clip-text text-transparent">
          Locale Membership &amp; Transfer
        </h1>
        <p className="text-sm text-[#475048]">
          Track your membership status, join a Davao District congregation with an invitation code,
          or request a Locale transfer.
        </p>
      </div>

      {/* Visual 3-Step Onboarding Progress Bar */}
      <div
        data-gsap="hero"
        className="grid gap-3 sm:grid-cols-3 rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-br from-white via-[#FCFBF8] to-[#F2ECE0] p-4 shadow-sm"
      >
        {steps.map((step) => {
          const done = currentStep > step.num || (step.num === 3 && currentStep === 3);
          const current = currentStep === step.num && step.num < 3;
          return (
            <div
              key={step.num}
              className={`flex items-center gap-3 rounded-xl p-3.5 ${
                done
                  ? "bg-gradient-to-r from-[#FBF9F4] via-[#F0ECE3] to-[#E5D9BF] border border-[#C8B48E]"
                  : current
                    ? "bg-gradient-to-r from-[#F5F1E9] to-[#E6ECE7] border border-[#303B32]/40"
                    : "bg-[#F5F1E9]/50 border border-transparent"
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold shadow-sm ${
                  done
                    ? "bg-gradient-to-br from-[#3A483D] to-[#202820] text-[#F5F1E9]"
                    : current
                      ? "bg-gradient-to-br from-[#DFCFAF] to-[#BFA87E] text-[#202820]"
                      : "bg-[#F0ECE3] text-[#636B62]"
                }`}
              >
                {done ? <CheckCircle2 className="h-4 w-4" /> : step.num}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[#202820]">{step.title}</p>
                <p className="text-[11px] text-[#636B62] truncate">{step.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      <FlashBanner message={params.message} error={params.error} />

      <LocaleAdminInvitationCards
        invites={ctx.pendingAdminInvites}
        returnPath="/membership"
      />

      {/* CASE 1: User has an Active Membership */}
      {ctx.activeMembership && (
        <section
          data-gsap="item"
          className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-br from-white via-[#FCFBF8] to-[#F2ECE0] p-7 sm:p-8 shadow-sm space-y-6"
        >
          <div
            aria-hidden="true"
            className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#303B32] via-[#8C7853] to-[#D6C6A5]"
          />
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6C6A5] bg-[#F0ECE3] px-3 py-0.5 text-xs font-medium text-[#303B32]">
                  <Building2 className="h-3.5 w-3.5" />
                  Active Locale Membership
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6C6A5] bg-[#F5F1E9] px-3 py-0.5 text-xs font-medium text-[#303B32]">
                  <UserCheck className="h-3.5 w-3.5 text-[#8C7853]" />
                  <span>
                    Head Minister:{" "}
                    <strong className="text-[#202820]">
                      {activeLocaleMeta?.headMinister ?? "To be assigned"}
                    </strong>
                  </span>
                </span>
              </div>
              <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-[#202820]">
                {ctx.activeMembership.locale.name}
              </h2>
              {ctx.activeMembership.locale.address && (
                <p className="inline-flex items-center gap-1.5 text-sm text-[#475048]">
                  <MapPin className="h-4 w-4 text-[#8C7853]" />
                  {ctx.activeMembership.locale.address}
                </p>
              )}
              <p className="block text-xs text-[#636B62]">
                Member since{" "}
                {new Date(ctx.activeMembership.joined_at).toLocaleDateString("en-PH", {
                  dateStyle: "long",
                })}
              </p>
            </div>
          </div>

          {ctx.pendingLeaveRequest ? (
            <div className="rounded-xl border border-[#D6C6A5] bg-[#F0ECE3] p-5 space-y-3.5">
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-[#8C7853] shrink-0" />
                <div className="space-y-1 text-sm text-[#202820]">
                  <p className="font-semibold">
                    Leave Request Awaiting Outgoing Locale Admin Approval
                  </p>
                  <p className="text-xs text-[#475048] leading-relaxed">
                    Your membership in <strong>{ctx.activeMembership.locale.name}</strong> stays
                    active while your Locale Admin reviews your departure request. Once approved,
                    you can apply to your new Locale using its invitation code.
                  </p>
                  {ctx.pendingLeaveRequest.reason && (
                    <p className="text-xs italic text-[#475048]">
                      Reason submitted: &ldquo;{ctx.pendingLeaveRequest.reason}&rdquo;
                    </p>
                  )}
                </div>
              </div>

              <form action={cancelLeaveRequestAction}>
                <input
                  type="hidden"
                  name="leave_request_id"
                  value={ctx.pendingLeaveRequest.id}
                />
                <SubmitButton
                  pendingText="Cancelling..."
                  className="rounded-xl border border-[#D6C6A5] bg-white px-4 py-2 text-xs font-medium text-[#202820] hover:bg-[#F5F1E9]"
                >
                  Cancel Leave Request
                </SubmitButton>
              </form>
            </div>
          ) : (
            <form
              action={submitLeaveRequestAction}
              className="border-t border-[#F0ECE3] pt-6 space-y-3.5"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-[#202820]">
                <LogOut className="h-4 w-4 text-[#8C7853]" />
                <span>Need to Transfer to Another Locale?</span>
              </div>
              <p className="text-xs text-[#475048] leading-relaxed">
                Submit a departure request to the Locale Admin of{" "}
                <strong>{ctx.activeMembership.locale.name}</strong>. You keep full access to your
                current Locale until departure is approved.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  name="reason"
                  placeholder="Reason / destination Locale (e.g., Relocating to Buhangin Locale)"
                  className="flex-1 rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-4 py-2.5 text-sm text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none"
                />
                <SubmitButton
                  pendingText="Submitting..."
                  className="rounded-xl border border-[#D6C6A5] bg-[#F0ECE3] px-4 py-2.5 text-xs font-medium text-[#202820] hover:bg-[#303B32] hover:text-white shrink-0"
                >
                  Request Leave Approval
                </SubmitButton>
              </div>
            </form>
          )}
        </section>
      )}

      {/* CASE 2: User has a Pending Join Request */}
      {!ctx.activeMembership && ctx.pendingJoinRequest && (
        <section
          data-gsap="item"
          className="rounded-2xl border border-[#D6C6A5] bg-[#F0ECE3] p-7 space-y-4 shadow-sm"
        >
          <div className="flex items-start gap-3.5">
            <Clock className="h-5 w-5 mt-1 text-[#8C7853] shrink-0" />
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-xl font-semibold text-[#202820]">
                  Waiting for Approval — {ctx.pendingJoinRequest.locale.name}
                </h2>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6C6A5] bg-white px-3 py-0.5 text-xs font-medium text-[#303B32]">
                  <UserCheck className="h-3.5 w-3.5 text-[#8C7853]" />
                  <span>
                    Head Minister:{" "}
                    <strong className="text-[#202820]">
                      {pendingLocaleMeta?.headMinister ?? "To be assigned"}
                    </strong>
                  </span>
                </span>
              </div>
              <p className="text-sm text-[#475048] leading-relaxed">
                Your invitation code slot is reserved while the Locale Admin reviews your
                application. You will receive an in-app notification as soon as it is approved.
              </p>
              <p className="text-xs text-[#636B62]">
                Submitted{" "}
                {new Date(ctx.pendingJoinRequest.created_at).toLocaleString("en-PH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </p>
            </div>
          </div>

          <form action={cancelMembershipRequestAction}>
            <input type="hidden" name="request_id" value={ctx.pendingJoinRequest.id} />
            <SubmitButton
              pendingText="Cancelling..."
              className="rounded-xl border border-[#D6C6A5] bg-white px-4 py-2 text-xs font-medium text-[#202820] hover:bg-[#F5F1E9]"
            >
              Cancel Application
            </SubmitButton>
          </form>
        </section>
      )}

      {/* CASE 3: Join Locale Form */}
      {!ctx.activeMembership && !ctx.pendingJoinRequest && (
        <section
          data-gsap="item"
          className="rounded-2xl border border-[#D6C6A5]/60 bg-white p-7 sm:p-8 shadow-sm space-y-6"
        >
          <div className="flex items-start gap-3.5">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D6C6A5]/60 bg-[#F0ECE3] text-[#303B32]">
              <KeyRound className="h-5 w-5" />
            </span>
            <div>
              <h2 className="font-serif text-xl font-semibold text-[#202820]">
                Join Your Davao District Congregation
              </h2>
              <p className="text-sm text-[#475048] mt-0.5">
                Choose your Locale below to view its Head Minister and chapel details, then enter
                the invitation code shared by your Locale Admin.
              </p>
            </div>
          </div>

          <JoinLocaleForm activeLocales={activeLocales} />
        </section>
      )}

      {/* History Cards */}
      <section className="grid gap-6 md:grid-cols-2">
        <div
          data-gsap="item"
          className="rounded-2xl border border-[#D6C6A5]/60 bg-white p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-[#8C7853]" />
            <h3 className="font-serif text-base font-semibold text-[#202820]">
              Congregation History
            </h3>
          </div>
          {membershipHistory.length === 0 ? (
            <p className="text-xs text-[#636B62]">No Locale memberships recorded yet.</p>
          ) : (
            <ul className="divide-y divide-[#F0ECE3] text-sm">
              {membershipHistory.map((m) => (
                <li key={m.id} className="py-3 flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-[#202820]">{m.locale?.name}</p>
                    <p className="text-xs text-[#636B62]">
                      Joined {new Date(m.joined_at).toLocaleDateString("en-PH")}
                      {m.left_at
                        ? ` • Left ${new Date(m.left_at).toLocaleDateString("en-PH")}`
                        : ""}
                    </p>
                  </div>
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize ${
                      m.status === "active"
                        ? "border-[#D6C6A5] bg-[#F0ECE3] text-[#303B32]"
                        : "border-[#D6C6A5]/40 bg-[#F5F1E9] text-[#636B62]"
                    }`}
                  >
                    {m.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div
          data-gsap="item"
          className="rounded-2xl border border-[#D6C6A5]/60 bg-white p-6 shadow-sm space-y-4"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#8C7853]" />
            <h3 className="font-serif text-base font-semibold text-[#202820]">
              Application &amp; Transfer Log
            </h3>
          </div>
          {joinRequests.length === 0 && leaveRequests.length === 0 ? (
            <p className="text-xs text-[#636B62]">No requests submitted yet.</p>
          ) : (
            <ul className="divide-y divide-[#F0ECE3] text-sm">
              {joinRequests.map((r) => (
                <li key={r.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#202820]">Join: {r.locale?.name}</span>
                    <span className="rounded-full border border-[#D6C6A5]/50 bg-[#F5F1E9] px-2.5 py-0.5 text-xs font-medium capitalize text-[#475048]">
                      {r.status}
                    </span>
                  </div>
                  {r.review_note && (
                    <p className="text-xs text-[#636B62]">Admin note: {r.review_note}</p>
                  )}
                </li>
              ))}
              {leaveRequests.map((lr) => (
                <li key={lr.id} className="py-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-[#202820]">Leave: {lr.locale?.name}</span>
                    <span className="rounded-full border border-[#D6C6A5]/50 bg-[#F5F1E9] px-2.5 py-0.5 text-xs font-medium capitalize text-[#475048]">
                      {lr.status}
                    </span>
                  </div>
                  {lr.review_note && (
                    <p className="text-xs text-[#636B62]">Admin note: {lr.review_note}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </GsapPageAnimator>
  );
}
