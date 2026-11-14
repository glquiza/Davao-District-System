"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  BellRing,
  Building2,
  CalendarDays,
  ExternalLink,
  LogOut,
  Menu,
  ShieldCheck,
  Users,
  X,
} from "lucide-react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { signOutAction } from "@/app/actions/auth";
import { evaluateDueActivityReminders } from "@/lib/activity-reminders";
import { getLocaleAdminInviteStatus, isLocaleRemoved } from "@/lib/locale-metadata";
import { createClient } from "@/lib/supabase/client";
import type {
  Locale,
  NotificationItem,
  ProgramActivity,
  UserAccessContext,
} from "@/types/database";

gsap.registerPlugin(useGSAP);

export function AppNavbar({ ctx }: { ctx: UserAccessContext }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(ctx.unreadNotificationCount);
  const [liveToast, setLiveToast] = useState<NotificationItem | null>(null);

  const navRef = useRef<HTMLElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const latestTimestampRef = useRef<string>(new Date().toISOString());

  // Sync server-rendered unread count whenever navigation updates ctx
  useEffect(() => {
    setUnreadCount(ctx.unreadNotificationCount);
  }, [ctx.unreadNotificationCount]);

  // Dual-engine Live Notification & Countdown Reminder Watcher
  useEffect(() => {
    const supabase = createClient();
    const userId = ctx.profile.id;
    const storageKey = `dds_seen_reminders_${userId}`;

    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as string[];
        if (Array.isArray(parsed)) {
          parsed.forEach((id) => seenIdsRef.current.add(id));
        }
      }
    } catch {
      // Ignore localStorage parse errors
    }

    function persistSeenId(id: string) {
      seenIdsRef.current.add(id);
      try {
        const recent = Array.from(seenIdsRef.current).slice(-100);
        window.localStorage.setItem(storageKey, JSON.stringify(recent));
      } catch {
        // Ignore storage quota errors
      }
    }

    function triggerIncomingAlert(item: NotificationItem) {
      if (seenIdsRef.current.has(item.id)) return;
      persistSeenId(item.id);

      if (item.created_at > latestTimestampRef.current) {
        latestTimestampRef.current = item.created_at;
      }

      setUnreadCount((prev) => prev + 1);
      setLiveToast(item);
      router.refresh();

      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        window.Notification.permission === "granted"
      ) {
        try {
          new window.Notification(item.title, {
            body: item.body,
          });
        } catch {
          // Ignore browser notification errors on restricted environments
        }
      }
    }

    async function checkDueCountdownReminders() {
      const { data: upcoming } = await supabase
        .from("programs_activities")
        .select(
          "id, title, description, level, district_id, locale_id, category, modality, starts_at, ends_at, venue, status, created_by, created_at, updated_at"
        )
        .in("status", ["upcoming", "ongoing"])
        .order("starts_at", { ascending: true })
        .limit(30);

      if (!upcoming || upcoming.length === 0) return;

      const dueReminders = evaluateDueActivityReminders(
        upcoming as ProgramActivity[],
        userId
      );

      for (const rem of dueReminders) {
        if (!seenIdsRef.current.has(rem.id)) {
          triggerIncomingAlert(rem);
          break;
        }
      }
    }

    async function checkPendingAdminInvites() {
      const { data: adminRows } = await supabase
        .from("locale_admins")
        .select("locale:locales(*)")
        .eq("user_id", userId);

      const locales = (adminRows ?? [])
        .map((r: { locale: Locale | Locale[] | null }) =>
          Array.isArray(r.locale) ? r.locale[0] : r.locale
        )
        .filter((loc): loc is Locale => Boolean(loc) && !isLocaleRemoved(loc));

      for (const loc of locales) {
        const status = getLocaleAdminInviteStatus(loc, userId, false);
        const syntheticId = `admin-invite-${loc.id}-${userId}`;
        if (status === "pending" && !seenIdsRef.current.has(syntheticId)) {
          triggerIncomingAlert({
            id: syntheticId,
            user_id: userId,
            type: "announcement",
            title: `Locale Admin Invitation — ${loc.name}`,
            body: `You have been invited to serve as a Locale Admin for ${loc.name}. Accept to automatically receive membership in ${loc.name} and manage the congregation.`,
            activity_id: null,
            action_url: "/notifications",
            is_read: false,
            read_at: null,
            created_at: new Date().toISOString(),
          });
          break;
        }
      }
    }

    // Check due countdown reminders and pending admin invites immediately on mount
    void checkDueCountdownReminders();
    void checkPendingAdminInvites();

    // 1. Instant Realtime WebSocket channel (when publication is active)
    const channel = supabase
      .channel(`user-notifications-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as NotificationItem;
          if (newNotif && newNotif.id) {
            triggerIncomingAlert(newNotif);
          }
        }
      )
      .subscribe();

    // 2. Lightweight check every 8s while tab is visible (catches new notifications + countdown reminders + admin invites)
    const interval = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;

      const { data: recentUnread } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .eq("is_read", false)
        .gt("created_at", latestTimestampRef.current)
        .order("created_at", { ascending: false })
        .limit(1);

      if (recentUnread && recentUnread.length > 0) {
        triggerIncomingAlert(recentUnread[0] as NotificationItem);
      }

      await checkDueCountdownReminders();
      await checkPendingAdminInvites();
    }, 8000);

    return () => {
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [ctx.profile.id, router]);

  // Gentle 220ms GSAP entrance animation for Live Notification Toast
  useGSAP(
    () => {
      if (!liveToast || !toastRef.current) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      gsap.fromTo(
        toastRef.current,
        { y: -12, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.22, ease: "power2.out" }
      );
    },
    { dependencies: [liveToast?.id] }
  );

  const isDistrictAdmin = ctx.profile.is_district_admin;
  const isLocaleAdmin = ctx.adminLocales.length > 0;

  const statusBadge = ctx.activeMembership
    ? ctx.pendingLeaveRequest
      ? `${ctx.activeMembership.locale.name} • Leave Pending`
      : ctx.activeMembership.locale.name
    : ctx.pendingAdminInvites.length > 0
      ? `Admin Invite: ${ctx.pendingAdminInvites[0].name}`
      : ctx.pendingJoinRequest
        ? `Pending: ${ctx.pendingJoinRequest.locale.name}`
        : "National Access";

  const statusBadgeColor = ctx.activeMembership
    ? "bg-gradient-to-r from-[#FBF9F4] via-[#F0ECE3] to-[#E6DEC8] text-[#303B32] border-[#D6C6A5]"
    : ctx.pendingJoinRequest
      ? "bg-gradient-to-r from-[#FBF9F4] to-[#EDE3CE] text-[#6B5A38] border-[#D6C6A5]"
      : "bg-gradient-to-r from-[#F5F1E9] to-[#E8E2D4] text-[#475048] border-[#D6C6A5]/70";

  const initials =
    ctx.profile.full_name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join("") || "DD";

  const navItems = [
    {
      href: "/feed",
      label: "Activities",
      icon: CalendarDays,
      active: pathname.startsWith("/feed") || pathname.startsWith("/activities"),
    },
    {
      href: "/membership",
      label: "Membership",
      icon: Users,
      active: pathname.startsWith("/membership"),
    },
    ...(isLocaleAdmin
      ? [
          {
            href: "/locale-admin",
            label: "Locale Admin",
            icon: Building2,
            active: pathname.startsWith("/locale-admin"),
          },
        ]
      : []),
    ...(isDistrictAdmin
      ? [
          {
            href: "/district-admin",
            label: "District Admin",
            icon: ShieldCheck,
            active: pathname.startsWith("/district-admin"),
          },
        ]
      : []),
  ];

  // Gentle 250ms GSAP sliding active-route pill on desktop nav
  useGSAP(
    () => {
      if (!navRef.current || !pillRef.current) return;
      const activeLink = navRef.current.querySelector<HTMLElement>('[data-active="true"]');
      if (!activeLink) {
        gsap.set(pillRef.current, { opacity: 0 });
        return;
      }

      gsap.to(pillRef.current, {
        x: activeLink.offsetLeft,
        width: activeLink.offsetWidth,
        opacity: 1,
        duration: 0.25,
        ease: "power2.out",
      });
    },
    { scope: navRef, dependencies: [pathname, isLocaleAdmin, isDistrictAdmin] }
  );

  // Gentle 220ms GSAP mobile menu reveal
  useGSAP(
    () => {
      if (!mobileOpen || !mobileMenuRef.current) return;
      gsap.fromTo(
        mobileMenuRef.current,
        { height: 0, opacity: 0 },
        { height: "auto", opacity: 1, duration: 0.22, ease: "power2.out" }
      );
    },
    { dependencies: [mobileOpen] }
  );

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-[#D6C6A5]/70 bg-gradient-to-r from-[#FBF9F4]/95 via-[#F5F1E9]/95 to-[#EDE6D6]/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 py-3.5">
          {/* Brand + Status Pill */}
          <div className="flex items-center gap-3.5 min-w-0">
            <Link
              href="/feed"
              className="flex items-center gap-3 text-[#202820] shrink-0 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/pmcc-logo.png"
                alt="PMCC (4th Watch) Logo"
                className="h-11 w-11 shrink-0 object-contain drop-shadow-sm"
              />
              <div className="leading-tight">
                <span className="block font-serif text-base sm:text-lg font-semibold tracking-tight text-[#202820]">
                  Davao District
                </span>
                <span className="hidden sm:block text-[11px] font-normal text-[#636B62]">
                  Programs &amp; Membership
                </span>
              </div>
            </Link>

            <span
              className={`hidden lg:inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium truncate max-w-[220px] ${statusBadgeColor}`}
            >
              {statusBadge}
            </span>
          </div>

          {/* Desktop Nav with GSAP Sliding Pill */}
          <nav
            ref={navRef}
            className="relative hidden md:flex items-center gap-1 rounded-xl border border-[#D6C6A5]/60 bg-gradient-to-b from-[#ECE6D8] to-[#F3EFE6] p-1 shadow-inner"
          >
            <span
              ref={pillRef}
              aria-hidden="true"
              className="pointer-events-none absolute top-1 bottom-1 left-0 rounded-lg border border-[#D6C6A5]/70 bg-gradient-to-b from-white to-[#F7F3EA] shadow-sm opacity-0"
            />
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-active={item.active ? "true" : "false"}
                  className={`relative z-10 inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-sm font-medium ${
                    item.active
                      ? "text-[#202820]"
                      : "text-[#636B62] hover:text-[#202820]"
                  }`}
                >
                  <Icon className="h-4 w-4 text-[#303B32]" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Controls: Notifications + User Profile + Mobile Menu Toggle */}
          <div className="flex items-center gap-2">
            <Link
              href="/notifications"
              className={`relative inline-flex items-center justify-center h-9 w-9 rounded-xl border ${
                pathname.startsWith("/notifications")
                  ? "border-[#303B32] bg-[#303B32] text-white"
                  : "border-[#D6C6A5]/70 bg-white text-[#303B32] hover:bg-[#F0ECE3]"
              }`}
              title="Notifications"
            >
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 inline-flex min-w-[18px] h-[18px] items-center justify-center rounded-full border border-white bg-[#303B32] px-1 text-[10px] font-semibold text-[#F5F1E9]">
                  {unreadCount}
                </span>
              )}
            </Link>

            <div className="hidden sm:flex items-center gap-2 rounded-xl border border-[#D6C6A5]/70 bg-gradient-to-b from-white to-[#F7F4EC] pl-2 pr-1.5 py-1 shadow-sm">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[#3A483D] to-[#202820] font-serif text-[11px] font-semibold text-[#F5F1E9]">
                {initials}
              </span>
              <span className="text-xs font-medium text-[#202820] max-w-[120px] truncate">
                {ctx.profile.full_name}
              </span>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-[#636B62] hover:bg-[#F0ECE3] hover:text-[#202820]"
                  title={`Sign out (${ctx.profile.email})`}
                >
                  <LogOut className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="inline-flex md:hidden h-9 w-9 items-center justify-center rounded-xl border border-[#D6C6A5]/70 bg-white text-[#202820]"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {/* Mobile Slide-Down Drawer */}
        {mobileOpen && (
          <div
            ref={mobileMenuRef}
            className="md:hidden overflow-hidden border-t border-[#D6C6A5]/60 bg-[#F5F1E9] px-4 py-4 space-y-3"
          >
            <div className="flex items-center justify-between rounded-xl border border-[#D6C6A5]/50 bg-white px-3.5 py-2.5">
              <div>
                <p className="text-xs font-semibold text-[#202820]">{ctx.profile.full_name}</p>
                <p className="text-[11px] text-[#636B62]">{ctx.profile.email}</p>
              </div>
              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${statusBadgeColor}`}
              >
                {statusBadge}
              </span>
            </div>

            <div className="grid gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-sm font-medium ${
                      item.active
                        ? "bg-[#303B32] text-white"
                        : "text-[#202820] hover:bg-[#F0ECE3]"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>

            <form action={signOutAction} className="pt-2 border-t border-[#D6C6A5]/40">
              <button
                type="submit"
                className="flex w-full items-center gap-2.5 rounded-xl px-3.5 py-2 text-sm font-medium text-[#636B62] hover:bg-[#F0ECE3] hover:text-[#202820]"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </form>
          </div>
        )}
      </header>

      {/* Live Incoming Notification Toast Popup */}
      {liveToast && (
        <div
          ref={toastRef}
          role="status"
          aria-live="polite"
          className="fixed top-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm rounded-2xl border border-[#D6C6A5] bg-white p-4 shadow-lg"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#303B32] text-[#F5F1E9]">
                <BellRing className="h-4 w-4" />
              </div>
              <div className="space-y-1">
                <p className="text-[11px] font-medium uppercase tracking-widest text-[#8C7853]">
                  New Announcement
                </p>
                <h3 className="font-serif text-sm font-semibold text-[#202820] leading-snug">
                  {liveToast.title}
                </h3>
                <p className="text-xs text-[#475048] leading-relaxed">{liveToast.body}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLiveToast(null)}
              className="rounded-lg p-1 text-[#636B62] hover:bg-[#F0ECE3] hover:text-[#202820]"
              aria-label="Dismiss notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3.5 flex items-center justify-end gap-2 border-t border-[#F0ECE3] pt-3">
            <button
              type="button"
              onClick={() => setLiveToast(null)}
              className="rounded-lg px-2.5 py-1 text-xs font-medium text-[#636B62] hover:bg-[#F0ECE3] hover:text-[#202820]"
            >
              Dismiss
            </button>
            {liveToast.action_url && (
              <Link
                href={liveToast.action_url}
                onClick={() => setLiveToast(null)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#303B32] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#202820]"
              >
                <span>View Activity</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            )}
          </div>
        </div>
      )}
    </>
  );
}

