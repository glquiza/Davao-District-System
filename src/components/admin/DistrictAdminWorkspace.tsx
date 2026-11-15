"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  Calendar,
  ExternalLink,
  FileClock,
  Lock,
  Megaphone,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  assignLocaleAdminAction,
  createLocaleAction,
  deleteLocaleWithPasswordAction,
  removeLocaleAdminAction,
  toggleLocaleActiveAction,
  updateDistrictLocaleDetailsAction,
} from "@/app/actions/district-admin";
import { ActivityPublisherForm } from "@/components/ActivityPublisherForm";
import { AnimatedCounter } from "@/components/gsap/AnimatedCounter";
import { DeleteActivityButton } from "@/components/ui/DeleteActivityButton";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { computeActivityScheduleStatus } from "@/lib/activity-reminders";
import { formatPhilippineDateTime } from "@/lib/date-utils";
import {
  getLocaleAdminInviteStatus,
  parseLocaleMetadata,
} from "@/lib/locale-metadata";
import type {
  AuditLog,
  District,
  Locale,
  LocaleAdminAssignment,
  ProgramActivity,
} from "@/types/database";

gsap.registerPlugin(useGSAP);

type DistrictTab = "locales" | "publish" | "logs";

function formatAuditAction(action: string): { label: string; style: string } {
  switch (action) {
    case "membership_request.approved":
      return {
        label: "Membership Approved",
        style: "bg-[#F0ECE3] text-[#303B32] border-[#D6C6A5]",
      };
    case "membership_request.rejected":
      return {
        label: "Membership Declined",
        style: "bg-[#FAF4F2] text-[#6E3429] border-[#C9A69B]",
      };
    case "leave_request.approved":
      return {
        label: "Leave / Transfer Approved",
        style: "bg-[#F5F1E9] text-[#5C4B28] border-[#D6C6A5]",
      };
    case "leave_request.rejected":
      return {
        label: "Leave Declined",
        style: "bg-[#F5F1E9] text-[#636B62] border-[#D6C6A5]/60",
      };
    case "activity.insert":
      return {
        label: "Activity Published",
        style: "bg-[#303B32] text-[#F5F1E9] border-[#303B32]",
      };
    case "activity.update":
      return {
        label: "Activity Updated",
        style: "bg-[#F0ECE3] text-[#202820] border-[#D6C6A5]",
      };
    case "locale.deleted":
      return {
        label: "Locale Removed",
        style: "bg-[#FAF4F2] text-[#6E3429] border-[#C9A69B]",
      };
    default:
      return {
        label: action,
        style: "bg-[#F5F1E9] text-[#475048] border-[#D6C6A5]/60",
      };
  }
}

export function DistrictAdminWorkspace({
  district,
  locales,
  assignments,
  memberCounts,
  totalActiveMembers,
  auditLogs,
  publishedActivities,
  initialTab = "locales",
}: {
  district: District | null;
  locales: Locale[];
  assignments: LocaleAdminAssignment[];
  memberCounts: Record<string, number>;
  totalActiveMembers: number;
  auditLogs: AuditLog[];
  publishedActivities: ProgramActivity[];
  initialTab?: DistrictTab;
}) {
  const [activeTab, setActiveTab] = useState<DistrictTab>(initialTab);
  const [showNewLocaleDrawer, setShowNewLocaleDrawer] = useState(false);
  const [assigningLocaleId, setAssigningLocaleId] = useState<string | null>(null);
  const [editingLocaleId, setEditingLocaleId] = useState<string | null>(null);
  const [deletingLocaleId, setDeletingLocaleId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const workspaceRef = useRef<HTMLDivElement>(null);
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabPillRef = useRef<HTMLSpanElement>(null);
  const tabContentRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

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
    { dependencies: [activeTab, locales.length, auditLogs.length] }
  );

  useGSAP(
    () => {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const cards = gsap.utils.toArray<HTMLElement>('[data-gsap="kpi"]');
      gsap.from(cards, {
        y: 10,
        opacity: 0,
        duration: 0.26,
        stagger: 0.04,
        ease: "power2.out",
        clearProps: "transform,opacity",
      });
    },
    { scope: workspaceRef }
  );

  useGSAP(
    () => {
      if (!tabContentRef.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        return;
      gsap.fromTo(
        tabContentRef.current,
        { y: 8, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.24, ease: "power2.out", clearProps: "transform" }
      );
    },
    { dependencies: [activeTab] }
  );

  useGSAP(
    () => {
      if (!showNewLocaleDrawer || !drawerRef.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        drawerRef.current,
        { y: -6, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.22, ease: "power2.out" }
      );
    },
    { dependencies: [showNewLocaleDrawer] }
  );

  const filteredLocales = locales.filter((loc) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      loc.name.toLowerCase().includes(q) ||
      (loc.address ?? "").toLowerCase().includes(q)
    );
  });

  const adminsByLocale = new Map<string, LocaleAdminAssignment[]>();
  for (const a of assignments) {
    const list = adminsByLocale.get(a.locale_id) ?? [];
    list.push(a);
    adminsByLocale.set(a.locale_id, list);
  }

  const tabs: { id: DistrictTab; label: string; icon: typeof Building2; count?: number }[] = [
    { id: "locales", label: "Locales & Admins", icon: Building2, count: locales.length },
    { id: "publish", label: "Publish Activity", icon: Megaphone },
    { id: "logs", label: "Audit Logs", icon: FileClock, count: auditLogs.length },
  ];

  return (
    <div ref={workspaceRef} className="space-y-8">
      {/* KPI Stat Cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        <div
          data-gsap="kpi"
          className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-br from-white via-[#FCFBF8] to-[#F2ECE0] p-6 shadow-sm flex items-center justify-between"
        >
          <div className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#303B32] via-[#8C7853] to-[#D6C6A5]" />
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#636B62]">
              Total Locales
            </p>
            <p className="font-serif text-3xl font-semibold text-[#202820] mt-1.5">
              <AnimatedCounter value={locales.length} />
            </p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D6C6A5]/70 bg-gradient-to-br from-[#3A483D] to-[#202820] text-[#F5F1E9] shadow-sm">
            <Building2 className="h-5 w-5 text-[#D6C6A5]" />
          </span>
        </div>

        <div
          data-gsap="kpi"
          className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-br from-white via-[#FCFBF8] to-[#F2ECE0] p-6 shadow-sm flex items-center justify-between"
        >
          <div className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#8C7853] via-[#D6C6A5] to-[#303B32]" />
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#636B62]">
              Active District Members
            </p>
            <p className="font-serif text-3xl font-semibold text-[#202820] mt-1.5">
              <AnimatedCounter value={totalActiveMembers} />
            </p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D6C6A5]/70 bg-gradient-to-br from-[#3A483D] to-[#202820] text-[#F5F1E9] shadow-sm">
            <Users className="h-5 w-5 text-[#D6C6A5]" />
          </span>
        </div>

        <div
          data-gsap="kpi"
          className="relative overflow-hidden rounded-2xl border border-[#D6C6A5]/70 bg-gradient-to-br from-white via-[#FCFBF8] to-[#F2ECE0] p-6 shadow-sm flex items-center justify-between"
        >
          <div className="inset-x-0 top-0 h-1 absolute bg-gradient-to-r from-[#D6C6A5] via-[#303B32] to-[#8C7853]" />
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-[#636B62]">
              Locale Admin Assignments
            </p>
            <p className="font-serif text-3xl font-semibold text-[#202820] mt-1.5">
              <AnimatedCounter value={assignments.length} />
            </p>
          </div>
          <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-[#D6C6A5]/70 bg-gradient-to-br from-[#3A483D] to-[#202820] text-[#F5F1E9] shadow-sm">
            <ShieldCheck className="h-5 w-5 text-[#D6C6A5]" />
          </span>
        </div>
      </div>

      {/* Segmented Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#D6C6A5]/50 pb-4">
        <div
          ref={tabBarRef}
          className="relative flex flex-wrap gap-1 rounded-xl border border-[#D6C6A5]/60 bg-[#F0ECE3] p-1"
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
                {typeof tab.count === "number" && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      active
                        ? "bg-[#303B32] text-[#F5F1E9]"
                        : "bg-[#F5F1E9] text-[#475048]"
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {activeTab === "locales" && district && (
          <button
            type="button"
            onClick={() => setShowNewLocaleDrawer((v) => !v)}
            className="inline-flex items-center gap-2 rounded-xl bg-[#303B32] px-4 py-2 text-xs sm:text-sm font-medium text-white shadow-sm hover:bg-[#202820]"
          >
            {showNewLocaleDrawer ? (
              <>
                <X className="h-4 w-4 text-[#D6C6A5]" />
                <span>Close Form</span>
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 text-[#D6C6A5]" />
                <span>New Locale</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Active Tab Content */}
      <div ref={tabContentRef}>
        {activeTab === "locales" && (
          <div className="space-y-6">
            {/* Collapsible Create Locale Drawer */}
            {showNewLocaleDrawer && district && (
              <div
                ref={drawerRef}
                className="rounded-2xl border border-[#D6C6A5] bg-[#F0ECE3] p-6 space-y-5 shadow-sm"
              >
                <div>
                  <h2 className="font-serif text-lg font-semibold text-[#202820]">
                    Create a New Davao District Locale
                  </h2>
                  <p className="text-xs text-[#475048] mt-0.5">
                    Step 1 creates the congregation. Step 2: click &ldquo;Assign Admin&rdquo; on
                    its card below so a Locale Admin can generate its invitation codes.
                  </p>
                </div>

                <form action={createLocaleAction} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <input type="hidden" name="district_id" value={district.id} />
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-[#475048] mb-1.5">
                      Locale Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      placeholder="e.g., Calinan Locale"
                      className="w-full rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2 text-sm text-[#202820] focus:border-[#303B32] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-[#475048] mb-1.5">
                      Head Minister&apos;s Name *
                    </label>
                    <input
                      type="text"
                      name="head_minister"
                      required
                      placeholder="e.g., Bro. Juan Dela Cruz"
                      className="w-full rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2 text-sm text-[#202820] focus:border-[#303B32] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-[#475048] mb-1.5">
                      Address / Area
                    </label>
                    <input
                      type="text"
                      name="address"
                      placeholder="e.g., Calinan District, Davao City"
                      className="w-full rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2 text-sm text-[#202820] focus:border-[#303B32] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-widest text-[#475048] mb-1.5">
                      Contact Info
                    </label>
                    <input
                      type="text"
                      name="contact_info"
                      placeholder="Email or mobile number"
                      className="w-full rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2 text-sm text-[#202820] focus:border-[#303B32] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2 lg:col-span-4 flex justify-end">
                    <SubmitButton
                      pendingText="Creating Locale..."
                      className="rounded-xl bg-[#303B32] px-5 py-2.5 text-xs font-medium text-white hover:bg-[#202820]"
                    >
                      <Plus className="h-4 w-4 text-[#D6C6A5]" />
                      <span>Create Locale</span>
                    </SubmitButton>
                  </div>
                </form>
              </div>
            )}

            {/* Search Filter */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8C7853]" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Locales by name or address..."
                className="w-full rounded-xl border border-[#D6C6A5]/70 bg-white pl-10 pr-4 py-2.5 text-sm text-[#202820] shadow-sm focus:border-[#303B32] focus:outline-none"
              />
            </div>

            {/* Locale Cards Grid */}
            <div className="grid gap-5 md:grid-cols-2">
              {filteredLocales.map((loc) => {
                const localeAdmins = adminsByLocale.get(loc.id) ?? [];
                const memberCount = memberCounts[loc.id] ?? 0;
                const isAssigningHere = assigningLocaleId === loc.id;
                const isEditingHere = editingLocaleId === loc.id;
                const isDeletingHere = deletingLocaleId === loc.id;
                const { headMinister, contactInfo } = parseLocaleMetadata(loc.contact_info);

                return (
                  <div
                    key={loc.id}
                    className="rounded-2xl border border-[#D6C6A5]/60 bg-white p-6 shadow-sm flex flex-col justify-between gap-5 hover:border-[#D6C6A5]"
                  >
                    <div className="space-y-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="font-serif text-lg font-semibold text-[#202820]">
                              {loc.name}
                            </h3>
                            <span
                              className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                                loc.is_active
                                  ? "border-[#D6C6A5] bg-[#F0ECE3] text-[#303B32]"
                                  : "border-[#D6C6A5]/50 bg-[#F5F1E9] text-[#636B62]"
                              }`}
                            >
                              {loc.is_active ? "Active" : "Inactive"}
                            </span>
                          </div>
                          {loc.address && (
                            <p className="text-xs text-[#636B62]">{loc.address}</p>
                          )}
                          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-[#303B32] pt-0.5">
                            <UserCheck className="h-3.5 w-3.5 text-[#8C7853]" />
                            <span>
                              Head Minister:{" "}
                              <strong className="text-[#202820]">
                                {headMinister ?? "Not set yet"}
                              </strong>
                            </span>
                          </p>
                        </div>

                        <span className="rounded-xl border border-[#D6C6A5]/50 bg-[#F5F1E9] px-3 py-1 text-xs font-medium text-[#303B32] shrink-0">
                          {memberCount} {memberCount === 1 ? "member" : "members"}
                        </span>
                      </div>

                      {isEditingHere && (
                        <form
                          action={updateDistrictLocaleDetailsAction}
                          className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/80 p-4 space-y-3"
                        >
                          <input type="hidden" name="locale_id" value={loc.id} />
                          <p className="text-[11px] font-medium uppercase tracking-widest text-[#475048]">
                            Edit Locale Details
                          </p>
                          <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                              <label className="block text-[11px] font-medium uppercase tracking-widest text-[#636B62] mb-1">
                                Locale Name *
                              </label>
                              <input
                                type="text"
                                name="name"
                                required
                                defaultValue={loc.name}
                                placeholder="e.g., Calinan Locale"
                                className="w-full rounded-lg border border-[#D6C6A5] bg-white px-2.5 py-1.5 text-xs text-[#202820] focus:border-[#303B32] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium uppercase tracking-widest text-[#636B62] mb-1">
                                Head Minister&apos;s Name *
                              </label>
                              <input
                                type="text"
                                name="head_minister"
                                required
                                defaultValue={headMinister ?? ""}
                                placeholder="e.g., Bro. Juan Dela Cruz"
                                className="w-full rounded-lg border border-[#D6C6A5] bg-white px-2.5 py-1.5 text-xs text-[#202820] focus:border-[#303B32] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium uppercase tracking-widest text-[#636B62] mb-1">
                                Address / Area
                              </label>
                              <input
                                type="text"
                                name="address"
                                defaultValue={loc.address ?? ""}
                                placeholder="Chapel Address / Area"
                                className="w-full rounded-lg border border-[#D6C6A5] bg-white px-2.5 py-1.5 text-xs text-[#202820] focus:border-[#303B32] focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-medium uppercase tracking-widest text-[#636B62] mb-1">
                                Contact Info
                              </label>
                              <input
                                type="text"
                                name="contact_info"
                                defaultValue={contactInfo ?? ""}
                                placeholder="Email or mobile number"
                                className="w-full rounded-lg border border-[#D6C6A5] bg-white px-2.5 py-1.5 text-xs text-[#202820] focus:border-[#303B32] focus:outline-none"
                              />
                            </div>
                          </div>
                          <div className="flex justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setEditingLocaleId(null)}
                              className="rounded-lg border border-[#D6C6A5] bg-white px-3 py-1.5 text-xs font-medium text-[#475048] hover:bg-[#F0ECE3]"
                            >
                              Cancel
                            </button>
                            <SubmitButton
                              pendingText="Saving..."
                              className="rounded-lg bg-[#303B32] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#202820]"
                            >
                              Save Changes
                            </SubmitButton>
                          </div>
                        </form>
                      )}

                      {isDeletingHere && (
                        <form
                          action={deleteLocaleWithPasswordAction}
                          className="rounded-xl border border-[#C9A69B] bg-[#FAF4F2] p-4 space-y-3"
                        >
                          <input type="hidden" name="locale_id" value={loc.id} />
                          <div className="flex items-start gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[#C9A69B] bg-white text-[#6E3429]">
                              <Lock className="h-3.5 w-3.5" />
                            </span>
                            <div className="space-y-0.5">
                              <p className="text-xs font-semibold text-[#6E3429]">
                                Password Verification Required — Remove &ldquo;{loc.name}&rdquo;
                              </p>
                              <p className="text-[11px] text-[#6E3429]/85 leading-relaxed">
                                This permanently removes <strong>{loc.name}</strong> and all <strong>Programs &amp; Activities</strong> published under this Locale. All {memberCount > 0 ? <strong>{memberCount} active {memberCount === 1 ? "member" : "members"}</strong> : "members"} and pending applicants will be automatically removed from this Locale and reset back to <strong>Step 1 (Join a Locale Church)</strong>.
                              </p>
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-medium uppercase tracking-widest text-[#6E3429] mb-1">
                              Confirm Your District Admin Password *
                            </label>
                            <PasswordInput
                              name="password"
                              required
                              autoComplete="current-password"
                              placeholder="Enter your account password to verify..."
                              className="rounded-lg border border-[#C9A69B] bg-white px-3 py-2 text-xs text-[#202820] focus:border-[#6E3429] focus:outline-none"
                            />
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setDeletingLocaleId(null)}
                              className="rounded-lg border border-[#D6C6A5] bg-white px-3 py-1.5 text-xs font-medium text-[#475048] hover:bg-[#F5F1E9]"
                            >
                              Cancel
                            </button>
                            <SubmitButton
                              pendingText="Verifying & Removing..."
                              className="rounded-lg bg-[#6E3429] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#56271F]"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>Verify &amp; Remove Locale</span>
                            </SubmitButton>
                          </div>
                        </form>
                      )}

                      {/* Locale Admins Section Inside Card */}
                      <div className="rounded-xl border border-[#D6C6A5]/40 bg-[#F5F1E9]/60 p-3.5 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-medium uppercase tracking-widest text-[#636B62]">
                            Assigned Locale Admins
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setAssigningLocaleId(isAssigningHere ? null : loc.id)
                            }
                            className="inline-flex items-center gap-1 text-xs font-medium text-[#303B32] hover:text-[#202820] underline decoration-[#D6C6A5] underline-offset-4"
                          >
                            <UserPlus className="h-3.5 w-3.5" />
                            <span>{isAssigningHere ? "Cancel" : "Assign Admin"}</span>
                          </button>
                        </div>

                        {localeAdmins.length === 0 ? (
                          <div className="flex items-center gap-2 text-xs font-medium text-[#5C4B28] bg-[#F0ECE3] border border-[#D6C6A5] rounded-lg px-3 py-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-[#8C7853] shrink-0" />
                            <span>No Admin assigned yet — assign one to generate invite codes.</span>
                          </div>
                        ) : (
                          <ul className="space-y-1.5">
                            {localeAdmins.map((a) => {
                              const inviteState = getLocaleAdminInviteStatus(
                                loc,
                                a.user_id,
                                false
                              );
                              return (
                                <li
                                  key={a.id}
                                  className="flex items-center justify-between gap-2 rounded-lg bg-white border border-[#D6C6A5]/60 px-3 py-2 text-xs"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <p className="font-medium text-[#202820] truncate">
                                        {a.profile?.full_name}
                                      </p>
                                      <span
                                        className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                          inviteState === "accepted"
                                            ? "border-[#D6C6A5] bg-[#F0ECE3] text-[#303B32]"
                                            : "border-[#D6C6A5] bg-[#F5F1E9] text-[#6B5A38]"
                                        }`}
                                      >
                                        {inviteState === "accepted"
                                          ? "Active Admin"
                                          : "Pending Invite"}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#636B62] truncate">
                                      {a.profile?.email}
                                    </p>
                                  </div>
                                  <form action={removeLocaleAdminAction}>
                                    <input type="hidden" name="assignment_id" value={a.id} />
                                    <SubmitButton
                                      pendingText="..."
                                      className="rounded-md px-2 py-1 text-[11px] font-medium text-[#6E3429] hover:bg-[#FAF4F2]"
                                    >
                                      Remove
                                    </SubmitButton>
                                  </form>
                                </li>
                              );
                            })}
                          </ul>
                        )}

                        {isAssigningHere && (
                          <form action={assignLocaleAdminAction} className="flex gap-2 pt-1">
                            <input type="hidden" name="locale_id" value={loc.id} />
                            <input
                              type="email"
                              name="email"
                              required
                              placeholder="Enter registered user's email..."
                              className="flex-1 rounded-lg border border-[#D6C6A5] bg-white px-3 py-1.5 text-xs text-[#202820] focus:border-[#303B32] focus:outline-none"
                            />
                            <SubmitButton
                              pendingText="Adding..."
                              className="rounded-lg bg-[#303B32] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#202820] shrink-0"
                            >
                              Assign
                            </SubmitButton>
                          </form>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#F0ECE3] pt-3.5 text-xs">
                      <span className="text-[#8C9288] truncate">
                        {contactInfo || "No contact info set"}
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setDeletingLocaleId(null);
                            setEditingLocaleId(isEditingHere ? null : loc.id);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-[#D6C6A5] bg-[#F0ECE3] px-2.5 py-1 font-medium text-[#202820] hover:bg-[#303B32] hover:text-white"
                        >
                          <Pencil className="h-3 w-3" />
                          <span>{isEditingHere ? "Close" : "Edit Locale"}</span>
                        </button>
                        <form action={toggleLocaleActiveAction}>
                          <input type="hidden" name="locale_id" value={loc.id} />
                          <input
                            type="hidden"
                            name="next_active"
                            value={loc.is_active ? "false" : "true"}
                          />
                          <SubmitButton
                            pendingText="Saving..."
                            className={`rounded-lg border px-3 py-1 font-medium ${
                              loc.is_active
                                ? "border-[#D6C6A5] text-[#475048] hover:bg-[#F5F1E9]"
                                : "border-[#303B32] bg-[#303B32] text-white"
                            }`}
                          >
                            {loc.is_active ? "Deactivate" : "Activate"}
                          </SubmitButton>
                        </form>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingLocaleId(null);
                            setDeletingLocaleId(isDeletingHere ? null : loc.id);
                          }}
                          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 font-medium ${
                            isDeletingHere
                              ? "border-[#6E3429] bg-[#6E3429] text-white"
                              : "border-[#C9A69B] bg-[#FAF4F2] text-[#6E3429] hover:bg-[#6E3429] hover:text-white"
                          }`}
                        >
                          <Trash2 className="h-3 w-3" />
                          <span>{isDeletingHere ? "Cancel" : "Remove"}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === "publish" && district && (
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            <div className="lg:col-span-7 space-y-3">
              <div>
                <h2 className="font-serif text-xl font-semibold text-[#202820]">
                  Publish National or Davao District Activity
                </h2>
                <p className="text-xs text-[#636B62] mt-0.5">
                  Locale-specific activities are published strictly by each congregation&apos;s
                  assigned Locale Admin.
                </p>
              </div>
              <ActivityPublisherForm
                mode="district-admin"
                districtId={district.id}
                returnPath="/district-admin?tab=publish"
              />
            </div>

            <div className="lg:col-span-5 rounded-2xl border border-[#D6C6A5]/60 bg-white p-6 shadow-sm space-y-4">
              <div>
                <h3 className="font-serif text-base font-semibold text-[#202820]">
                  Published National &amp; District Events
                </h3>
                <p className="text-xs text-[#636B62] mt-0.5">
                  Manage or remove events you have published ({publishedActivities.length})
                </p>
              </div>

              {publishedActivities.length === 0 ? (
                <p className="rounded-xl border border-dashed border-[#D6C6A5] bg-[#F5F1E9]/60 p-6 text-center text-xs text-[#636B62]">
                  No National or Davao District events published yet.
                </p>
              ) : (
                <ul className="divide-y divide-[#F0ECE3]">
                  {publishedActivities.map((act) => (
                    <li key={act.id} className="py-3.5 first:pt-0 last:pb-0 space-y-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${
                              act.level === "national"
                                ? "bg-[#303B32] text-[#F5F1E9] border-[#303B32]"
                                : "bg-[#F0ECE3] text-[#202820] border-[#D6C6A5]"
                            }`}
                          >
                            {act.level === "national" ? "National" : "Davao District"}
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
                        <div className="flex items-center gap-1.5">
                          <Link
                            href={`/activities/${act.id}?edit=true`}
                            className="inline-flex items-center gap-1 rounded-lg border border-[#D6C6A5] bg-[#F0ECE3] px-2.5 py-1 text-xs font-medium text-[#202820] hover:bg-[#303B32] hover:text-white"
                          >
                            <Pencil className="h-3 w-3" />
                            <span>Edit</span>
                          </Link>
                          <DeleteActivityButton
                            activityId={act.id}
                            returnPath="/district-admin?tab=publish"
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

        {activeTab === "logs" && (
          <div className="rounded-2xl border border-[#D6C6A5]/60 bg-white p-7 shadow-sm space-y-5">
            <h2 className="font-serif text-lg font-semibold text-[#202820]">
              Recent Administrative Activity
            </h2>
            {auditLogs.length === 0 ? (
              <p className="text-sm text-[#636B62]">No administrative actions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#D6C6A5]/50 uppercase tracking-widest text-[#636B62]">
                      <th className="py-3 pr-4 font-medium">When</th>
                      <th className="py-3 pr-4 font-medium">Administrator</th>
                      <th className="py-3 pr-4 font-medium">Event</th>
                      <th className="py-3 pr-4 font-medium">Scope</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0ECE3]">
                    {auditLogs.map((log) => {
                      const badge = formatAuditAction(log.action);
                      return (
                        <tr key={log.id} className="hover:bg-[#F5F1E9]/60">
                          <td className="py-3.5 pr-4 text-[#636B62] whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("en-PH", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </td>
                          <td className="py-3.5 pr-4 font-medium text-[#202820]">
                            {log.actor?.full_name ?? "System"}
                          </td>
                          <td className="py-3.5 pr-4">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${badge.style}`}
                            >
                              {badge.label}
                            </span>
                          </td>
                          <td className="py-3.5 pr-4 text-[#475048]">
                            {log.locale?.name ?? "District / National"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
