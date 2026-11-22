"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ExternalLink,
  Inbox,
  KeyRound,
  LogOut,
  Megaphone,
  Pencil,
  Search,
  Sparkles,
  UserCheck,
  Users,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  generateInviteCodeAction,
  reviewJoinRequestAction,
  reviewLeaveRequestAction,
  toggleInviteCodeStatusAction,
  updateLocaleInfoAction,
} from "@/app/actions/locale-admin";
import { ActivityPublisherForm } from "@/components/ActivityPublisherForm";
import { DistrictAttendanceManager } from "@/components/admin/DistrictAttendanceManager";
import { CopyCodeButton } from "@/components/CopyCodeButton";
import { DeleteActivityButton } from "@/components/ui/DeleteActivityButton";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { computeActivityScheduleStatus } from "@/lib/activity-reminders";
import { formatPhilippineDateTime } from "@/lib/date-utils";
import { parseLocaleMetadata } from "@/lib/locale-metadata";
import type {
  ActivityAttendanceRecord,
  InvitationCode,
  LeaveRequest,
  Locale,
  Membership,
  MembershipRequest,
  Profile,
  ProgramActivity,
} from "@/types/database";

gsap.registerPlugin(useGSAP);

export type LocaleAdminTab = "requests" | "codes" | "publish" | "members";

export function LocaleAdminWorkspace({
  selectedLocale,
  codes,
  codeCounts,
  pendingJoins,
  pendingLeaves,
  activeMembers,
  localeActivities,
  attendanceByActivity = {},
  allMembers = [],
  initialTab = "requests",
}: {
  selectedLocale: Locale;
  codes: InvitationCode[];
  codeCounts: Record<string, { pending: number; approved: number }>;
  pendingJoins: (MembershipRequest & {
    profile: Profile;
    invitation_code: { id: string; code: string; label: string | null };
  })[];
  pendingLeaves: (LeaveRequest & { profile: Profile })[];
  activeMembers: (Membership & { profile: Profile })[];
  localeActivities: ProgramActivity[];
  attendanceByActivity?: Record<string, ActivityAttendanceRecord[]>;
  allMembers?: Pick<Profile, "id" | "full_name" | "email">[];
  initialTab?: LocaleAdminTab;
}) {
  const [activeTab, setActiveTab] = useState<LocaleAdminTab>(initialTab);
  const [memberSearch, setMemberSearch] = useState("");
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabPillRef = useRef<HTMLSpanElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useGSAP(
    () => {
      if (!tabBarRef.current || !tabPillRef.current) return;
      const activeBtn = tabBarRef.current.querySelector<HTMLElement>(
        '[data-tab-active="true"]'
      );
      if (!activeBtn) return;

      gsap.to(tabPillRef.current, {
        x: activeBtn.offsetLeft,
        y: activeBtn.offsetTop,
        width: activeBtn.offsetWidth,
        height: activeBtn.offsetHeight,
        opacity: 1,
        duration: 0.25,
        ease: "power2.out",
      });
    },
    {
      dependencies: [
        activeTab,
        selectedLocale.id,
        pendingJoins.length,
        pendingLeaves.length,
        codes.length,
        activeMembers.length,
      ],
    }
  );

  useGSAP(
    () => {
      if (!contentRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        return;
      gsap.fromTo(
        contentRef.current,
        { y: 8, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.24, ease: "power2.out", clearProps: "transform" }
      );
    },
    { dependencies: [activeTab, selectedLocale.id] }
  );

  const totalPendingRequests = pendingJoins.length + pendingLeaves.length;

  const filteredMembers = activeMembers.filter((m) => {
    const q = memberSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      (m.profile?.full_name ?? "").toLowerCase().includes(q) ||
      (m.profile?.email ?? "").toLowerCase().includes(q)
    );
  });

  const tabs: {
    id: LocaleAdminTab;
    label: string;
    icon: typeof Inbox;
    badge?: number;
    urgent?: boolean;
  }[] = [
    {
      id: "requests",
      label: "Approvals Queue",
      icon: Inbox,
      badge: totalPendingRequests,
      urgent: totalPendingRequests > 0,
    },
    {
      id: "codes",
      label: "Invitation Codes",
      icon: KeyRound,
      badge: codes.filter((c) => c.is_active && new Date(c.expires_at) > new Date()).length,
    },
    {
      id: "publish",
      label: "Publish Activity",
      icon: Megaphone,
    },
    {
      id: "members",
      label: "Members & Info",
      icon: Users,
      badge: activeMembers.length,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Segmented Tab Bar */}
      <div
        ref={tabBarRef}
        className="relative flex flex-wrap gap-1 rounded-xl border border-[#D6C6A5]/60 bg-[#F0ECE3] p-1 w-fit"
      >
        <span
          ref={tabPillRef}
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 rounded-lg border border-[#D6C6A5]/50 bg-white shadow-sm opacity-0"
        />
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              data-tab-btn="true"
              data-tab-active={active ? "true" : "false"}
              onClick={() => setActiveTab(tab.id)}
              className={`relative z-10 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs sm:text-sm font-medium motion-reduce:data-[tab-active=true]:bg-white ${
                active
                  ? "text-[#202820]"
                  : "text-[#636B62] hover:text-[#202820]"
              }`}
            >
              <Icon className="h-4 w-4 text-[#303B32]" />
              <span>{tab.label}</span>
              {typeof tab.badge === "number" && (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    tab.urgent && tab.badge > 0
                      ? "bg-[#303B32] text-[#F5F1E9]"
                      : active
                        ? "bg-[#F0ECE3] text-[#202820]"
                        : "bg-[#F5F1E9] text-[#475048]"
                  }`}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div ref={contentRef}>
        {/* TAB 1: REQUESTS QUEUE */}
        {activeTab === "requests" && (
          <div className="grid gap-6 lg:grid-cols-2">
            <section className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-br from-white via-[#FCFBF8] to-[#F2ECE0] p-6 sm:p-7 shadow-sm space-y-5">
              <div className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#303B32] via-[#8C7853] to-[#D6C6A5]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <UserCheck className="h-5 w-5 text-[#303B32]" />
                  <h2 className="font-serif text-lg font-semibold text-[#202820]">
                    Incoming Join Applications
                  </h2>
                </div>
                <span className="rounded-full border border-[#D6C6A5] bg-[#F0ECE3] px-3 py-0.5 text-xs font-medium text-[#303B32]">
                  {pendingJoins.length} Waiting
                </span>
              </div>

              {pendingJoins.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D6C6A5] bg-[#F5F1E9]/60 p-8 text-center space-y-2">
                  <p className="text-sm font-medium text-[#475048]">
                    No pending membership applications.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("codes")}
                    className="text-xs font-medium text-[#303B32] underline decoration-[#D6C6A5] underline-offset-4 hover:text-[#202820]"
                  >
                    Need to invite brethren? Generate or copy an Invitation Code &rarr;
                  </button>
                </div>
              ) : (
                <ul className="space-y-3.5">
                  {pendingJoins.map((req) => (
                    <li
                      key={req.id}
                      className="rounded-xl border border-[#D6C6A5]/60 bg-[#F5F1E9]/60 p-4 space-y-3.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-[#202820]">
                            {req.profile?.full_name}
                          </p>
                          <p className="text-xs text-[#636B62]">{req.profile?.email}</p>
                        </div>
                        <span className="rounded-md bg-white border border-[#D6C6A5] px-2.5 py-0.5 font-mono text-[11px] font-medium text-[#303B32]">
                          {req.invitation_code?.code}
                        </span>
                      </div>

                      <form action={reviewJoinRequestAction} className="flex flex-wrap gap-2">
                        <input type="hidden" name="request_id" value={req.id} />
                        <input type="hidden" name="locale_id" value={selectedLocale.id} />
                        <input
                          type="text"
                          name="note"
                          placeholder="Optional welcome or review note..."
                          className="flex-1 min-w-[150px] rounded-xl border border-[#D6C6A5] bg-white px-3 py-1.5 text-xs text-[#202820] focus:border-[#303B32] focus:outline-none"
                        />
                        <SubmitButton
                          name="decision"
                          value="approved"
                          pendingText="Approving..."
                          className="rounded-xl bg-[#303B32] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#202820]"
                        >
                          Approve
                        </SubmitButton>
                        <SubmitButton
                          name="decision"
                          value="rejected"
                          pendingText="Declining..."
                          className="rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#5C3A32] hover:bg-[#FAF4F2]"
                        >
                          Decline
                        </SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-br from-white via-[#FCFBF8] to-[#F2ECE0] p-6 sm:p-7 shadow-sm space-y-5">
              <div className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#8C7853] via-[#D6C6A5] to-[#303B32]" />
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <LogOut className="h-5 w-5 text-[#8C7853]" />
                  <h2 className="font-serif text-lg font-semibold text-[#202820]">
                    Outgoing Leave / Transfer Queue
                  </h2>
                </div>
                <span className="rounded-full border border-[#D6C6A5] bg-[#F5F1E9] px-3 py-0.5 text-xs font-medium text-[#5C4B28]">
                  {pendingLeaves.length} Waiting
                </span>
              </div>

              {pendingLeaves.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D6C6A5] bg-[#F5F1E9]/60 p-8 text-center">
                  <p className="text-sm font-medium text-[#475048]">
                    No outgoing transfer or leave requests right now.
                  </p>
                </div>
              ) : (
                <ul className="space-y-3.5">
                  {pendingLeaves.map((lr) => (
                    <li
                      key={lr.id}
                      className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/70 p-4 space-y-3.5"
                    >
                      <div>
                        <p className="text-sm font-semibold text-[#202820]">
                          {lr.profile?.full_name}
                        </p>
                        <p className="text-xs text-[#636B62]">{lr.profile?.email}</p>
                        {lr.reason && (
                          <p className="mt-2 rounded-lg bg-white px-3 py-1.5 text-xs text-[#303B32] border border-[#D6C6A5]/60">
                            Reason: <span className="italic">&ldquo;{lr.reason}&rdquo;</span>
                          </p>
                        )}
                      </div>

                      <form action={reviewLeaveRequestAction} className="flex flex-wrap gap-2">
                        <input type="hidden" name="leave_request_id" value={lr.id} />
                        <input type="hidden" name="locale_id" value={selectedLocale.id} />
                        <input
                          type="text"
                          name="note"
                          placeholder="Optional note..."
                          className="flex-1 min-w-[150px] rounded-xl border border-[#D6C6A5] bg-white px-3 py-1.5 text-xs text-[#202820] focus:border-[#303B32] focus:outline-none"
                        />
                        <SubmitButton
                          name="decision"
                          value="approved"
                          pendingText="Approving..."
                          className="rounded-xl bg-[#303B32] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#202820]"
                        >
                          Approve Departure
                        </SubmitButton>
                        <SubmitButton
                          name="decision"
                          value="rejected"
                          pendingText="Declining..."
                          className="rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-1.5 text-xs font-medium text-[#475048] hover:bg-[#F0ECE3]"
                        >
                          Decline
                        </SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {/* TAB 2: INVITATION CODES */}
        {activeTab === "codes" && (
          <div className="space-y-6">
            <form
              action={generateInviteCodeAction}
              className="rounded-2xl border border-[#D6C6A5] bg-[#F0ECE3] p-6 space-y-5 shadow-sm"
            >
              <input type="hidden" name="locale_id" value={selectedLocale.id} />
              <input type="hidden" name="locale_slug" value={selectedLocale.slug} />

              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#8C7853]" />
                <h2 className="font-serif text-lg font-semibold text-[#202820]">
                  Generate a Readable Invitation Code for {selectedLocale.name}
                </h2>
              </div>

              <div className="grid gap-4 sm:grid-cols-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium uppercase tracking-widest text-[#475048] mb-1.5">
                    Batch Label / Purpose
                  </label>
                  <input
                    type="text"
                    name="label"
                    placeholder="e.g., April New Brethren Batch"
                    className="w-full rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2 text-sm text-[#202820] focus:border-[#303B32] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-[#475048] mb-1.5">
                    Max Members Allowed
                  </label>
                  <input
                    type="number"
                    name="max_uses"
                    min={1}
                    max={1000}
                    defaultValue={25}
                    required
                    className="w-full rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2 text-sm text-[#202820]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium uppercase tracking-widest text-[#475048] mb-1.5">
                    Valid For (Days)
                  </label>
                  <input
                    type="number"
                    name="expires_in_days"
                    min={1}
                    max={365}
                    defaultValue={14}
                    required
                    className="w-full rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2 text-sm text-[#202820]"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center gap-2.5">
                  <label className="text-xs font-medium text-[#475048]">
                    Optional Custom Code:
                  </label>
                  <input
                    type="text"
                    name="custom_code"
                    placeholder="Leave blank to auto-generate"
                    className="rounded-xl border border-[#D6C6A5] bg-white px-3 py-1.5 text-xs uppercase font-mono w-56 text-[#202820]"
                  />
                </div>

                <SubmitButton
                  pendingText="Generating..."
                  className="rounded-xl bg-[#303B32] px-5 py-2.5 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-[#202820]"
                >
                  <KeyRound className="h-4 w-4 text-[#D6C6A5]" />
                  <span>Generate Code</span>
                </SubmitButton>
              </div>
            </form>

            {codes.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#D6C6A5] bg-white p-12 text-center">
                <p className="text-sm font-medium text-[#475048]">
                  No invitation codes generated yet. Create one above to start onboarding members.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {codes.map((c) => {
                  const counts = codeCounts[c.id] ?? { pending: 0, approved: 0 };
                  const used = counts.approved + counts.pending;
                  const pct = Math.min(100, Math.round((used / c.max_uses) * 100));
                  const isExpired = new Date(c.expires_at) <= new Date();

                  return (
                    <div
                      key={c.id}
                      className="rounded-2xl border border-[#D6C6A5]/60 bg-white p-6 shadow-sm space-y-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-base font-semibold tracking-wide text-[#202820]">
                              {c.code}
                            </span>
                            <CopyCodeButton code={c.code} />
                          </div>
                          <p className="text-xs text-[#636B62] mt-1">
                            {c.label || "General Locale Invitation"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                            !c.is_active
                              ? "border-[#C9A69B] bg-[#FAF4F2] text-[#6E3429]"
                              : isExpired
                                ? "border-[#D6C6A5]/50 bg-[#F5F1E9] text-[#636B62]"
                                : "border-[#D6C6A5] bg-[#F0ECE3] text-[#303B32]"
                          }`}
                        >
                          {!c.is_active ? "Revoked" : isExpired ? "Expired" : "Active"}
                        </span>
                      </div>

                      {/* Capacity Bar */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="font-medium text-[#202820]">
                            {used} of {c.max_uses} slots used
                          </span>
                          <span className="text-[#636B62]">
                            {counts.approved} approved • {counts.pending} reserved
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[#F0ECE3]">
                          <div
                            className="h-full rounded-full bg-[#303B32] transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#F0ECE3] pt-3 text-xs text-[#636B62]">
                        <span>
                          Expires{" "}
                          {new Date(c.expires_at).toLocaleDateString("en-PH", {
                            dateStyle: "medium",
                          })}
                        </span>

                        <form action={toggleInviteCodeStatusAction}>
                          <input type="hidden" name="code_id" value={c.id} />
                          <input type="hidden" name="locale_id" value={selectedLocale.id} />
                          <input
                            type="hidden"
                            name="next_active"
                            value={c.is_active ? "false" : "true"}
                          />
                          <SubmitButton
                            pendingText="Saving..."
                            className="rounded-lg border border-[#D6C6A5] px-3 py-1 font-medium text-[#303B32] hover:bg-[#F5F1E9]"
                          >
                            {c.is_active ? "Revoke Code" : "Reactivate"}
                          </SubmitButton>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: PUBLISH LOCALE ACTIVITY */}
        {activeTab === "publish" && (
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7 space-y-3">
              <div>
                <h2 className="font-serif text-xl font-semibold text-[#202820]">
                  Publish Activity for {selectedLocale.name}
                </h2>
                <p className="text-xs text-[#636B62] mt-0.5">
                  Only approved active members of {selectedLocale.name} will see and be notified
                  about this event.
                </p>
              </div>
              <ActivityPublisherForm
                mode="locale-admin"
                districtId={selectedLocale.district_id}
                localeId={selectedLocale.id}
                localeName={selectedLocale.name}
                returnPath={`/locale-admin?locale=${selectedLocale.id}&tab=publish`}
              />
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-[#D6C6A5]/60 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-serif text-base font-semibold text-[#202820]">
                  Published Events for {selectedLocale.name}
                </h3>
                <p className="text-xs text-[#636B62] mt-0.5">
                  Manage or remove congregation events ({localeActivities.length})
                </p>
              </div>

              {localeActivities.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#D6C6A5] bg-[#F5F1E9]/60 p-6 text-center text-xs text-[#636B62]">
                  No Locale events published for {selectedLocale.name} yet.
                </p>
              ) : (
                <ul className="divide-y divide-[#F0ECE3]">
                  {localeActivities.map((act) => (
                    <li key={act.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="rounded-full border border-[#D6C6A5] bg-[#F0ECE3] px-2 py-0.5 text-[10px] font-medium uppercase text-[#303B32]">
                            {act.category}
                          </span>
                          <span className="rounded-full border border-[#D6C6A5]/50 bg-[#F5F1E9] px-2 py-0.5 text-[10px] font-medium capitalize text-[#475048]">
                            {computeActivityScheduleStatus(act.starts_at, act.ends_at)}
                          </span>
                        </div>
                        <Link
                          href={`/activities/${act.id}`}
                          className="font-serif text-base font-semibold text-[#202820] hover:text-[#303B32] line-clamp-1"
                        >
                          {act.title}
                        </Link>
                        <p className="inline-flex items-center gap-1.5 text-xs text-[#636B62] mt-0.5">
                          <Calendar className="h-3 w-3 text-[#8C7853]" />
                          {formatPhilippineDateTime(act.starts_at)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        <Link
                          href={`/activities/${act.id}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#303B32] hover:text-[#202820] underline decoration-[#D6C6A5] underline-offset-4"
                        >
                          <span>Open Details</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <DistrictAttendanceManager
                            activity={act}
                            attendanceRecords={attendanceByActivity[act.id] ?? []}
                            allLocales={[selectedLocale]}
                            allMembers={allMembers}
                            returnPath={`/locale-admin?locale=${selectedLocale.id}&tab=publish`}
                          />
                          <Link
                            href={`/activities/${act.id}?edit=true`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#D6C6A5] bg-[#F0ECE3] px-2.5 py-1 text-xs font-medium text-[#202820] hover:bg-[#303B32] hover:text-white"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Edit</span>
                          </Link>
                          <DeleteActivityButton
                            activityId={act.id}
                            returnPath={`/locale-admin?locale=${selectedLocale.id}&tab=publish`}
                            compact
                          />
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: MEMBERS & LOCALE INFO */}
        {activeTab === "members" && (
          <div className="grid gap-6 lg:grid-cols-5">
            <section className="lg:col-span-3 rounded-2xl border border-[#D6C6A5]/60 bg-white p-6 sm:p-7 shadow-sm space-y-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-serif text-lg font-semibold text-[#202820]">
                  Approved Congregation Roster ({activeMembers.length})
                </h2>
              </div>

              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C7853]" />
                <input
                  type="search"
                  value={memberSearch}
                  onChange={(e) => setMemberSearch(e.target.value)}
                  placeholder="Search members by name or email..."
                  className="w-full rounded-xl border border-[#D6C6A5]/70 bg-[#F5F1E9]/40 pl-9 pr-3 py-2 text-xs text-[#202820] focus:bg-white focus:border-[#303B32] focus:outline-none"
                />
              </div>

              {filteredMembers.length === 0 ? (
                <p className="text-sm text-[#636B62] py-4 text-center">
                  No matching members found.
                </p>
              ) : (
                <ul className="divide-y divide-[#F0ECE3] max-h-96 overflow-y-auto text-sm">
                  {filteredMembers.map((m) => (
                    <li key={m.id} className="py-3.5 flex items-center justify-between gap-2">
                      <div>
                        <p className="font-medium text-[#202820]">{m.profile?.full_name}</p>
                        <p className="text-xs text-[#636B62]">{m.profile?.email}</p>
                      </div>
                      <span className="text-xs text-[#636B62]">
                        Joined {new Date(m.joined_at).toLocaleDateString("en-PH")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="lg:col-span-2 rounded-2xl border border-[#D6C6A5]/60 bg-white p-6 sm:p-7 shadow-sm space-y-5 h-fit">
              <div>
                <h2 className="font-serif text-lg font-semibold text-[#202820]">Locale Details</h2>
                <p className="text-xs text-[#636B62] mt-0.5">
                  Shown to members and applicants when joining your Locale.
                </p>
              </div>

              {(() => {
                const { headMinister, contactInfo } = parseLocaleMetadata(
                  selectedLocale.contact_info
                );
                return (
                  <form action={updateLocaleInfoAction} className="space-y-4">
                    <input type="hidden" name="locale_id" value={selectedLocale.id} />
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-1.5">
                        Head Minister&apos;s Name
                      </label>
                      <input
                        type="text"
                        name="head_minister"
                        defaultValue={headMinister ?? ""}
                        placeholder="e.g., Bro. Juan Dela Cruz"
                        className="w-full rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-3.5 py-2 text-sm text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-1.5">
                        Chapel Address / Area
                      </label>
                      <input
                        type="text"
                        name="address"
                        defaultValue={selectedLocale.address ?? ""}
                        className="w-full rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-3.5 py-2 text-sm text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-1.5">
                        Contact Information
                      </label>
                      <input
                        type="text"
                        name="contact_info"
                        defaultValue={contactInfo ?? ""}
                        className="w-full rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-3.5 py-2 text-sm text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none"
                      />
                    </div>
                    <SubmitButton
                      pendingText="Saving..."
                      className="w-full rounded-xl bg-[#303B32] py-2.5 text-xs font-medium text-white hover:bg-[#202820]"
                    >
                      Save Locale Details
                    </SubmitButton>
                  </form>
                );
              })()}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
