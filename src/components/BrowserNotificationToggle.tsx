"use client";

import { useEffect, useState } from "react";
import { Bell, BellRing, Check } from "lucide-react";

export function BrowserNotificationToggle() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setSupported(true);
      setPermission(window.Notification.permission);
    }
  }, []);

  if (!supported) {
    return null;
  }

  async function handleEnableAlerts() {
    if (!("Notification" in window)) return;
    const result = await window.Notification.requestPermission();
    setPermission(result);
    if (result === "granted") {
      new window.Notification("Davao District Alerts Enabled", {
        body: "You will now receive instant desktop/browser alerts when new programs or activities are published.",
      });
    }
  }

  function handleSendTest() {
    if (permission !== "granted") return;
    new window.Notification("Sample Activity Alert — Davao District", {
      body: "Worship Service • In-Person Venue • Instant browser notifications are working.",
    });
    setTestSent(true);
    window.setTimeout(() => setTestSent(false), 2500);
  }

  return (
    <div
      data-gsap="item"
      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#D6C6A5] bg-[#F0ECE3]/85 px-5 py-4 shadow-sm"
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#D6C6A5] bg-white text-[#303B32] shadow-sm">
          {permission === "granted" ? (
            <BellRing className="h-5 w-5 text-[#303B32]" />
          ) : (
            <Bell className="h-5 w-5 text-[#8C7853]" />
          )}
        </div>
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-base font-semibold text-[#202820]">
              Instant Live &amp; Browser Alerts
            </h2>
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${
                permission === "granted"
                  ? "border-[#303B32]/30 bg-[#303B32] text-[#F5F1E9]"
                  : "border-[#D6C6A5] bg-white text-[#475048]"
              }`}
            >
              {permission === "granted"
                ? "Browser Push Active"
                : permission === "denied"
                  ? "Blocked in Browser"
                  : "In-App Live Active"}
            </span>
          </div>
          <p className="text-xs text-[#475048] leading-relaxed">
            {permission === "granted"
              ? "Real-time popups and browser notifications are active whenever a new National, District, or Locale activity is published."
              : permission === "denied"
                ? "In-app live toast popups are active. To also receive desktop/phone system banners, allow notifications in your browser address bar."
                : "In-app live toast popups are active automatically. Enable browser notifications to also get system alerts when you are on another tab."}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {permission === "default" && (
          <button
            type="button"
            onClick={handleEnableAlerts}
            className="inline-flex items-center gap-2 rounded-xl bg-[#303B32] px-4 py-2 text-xs font-medium text-white shadow-sm hover:bg-[#202820]"
          >
            <BellRing className="h-3.5 w-3.5" />
            <span>Enable Browser Alerts</span>
          </button>
        )}

        {permission === "granted" && (
          <button
            type="button"
            onClick={handleSendTest}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2 text-xs font-medium text-[#202820] shadow-sm hover:bg-[#F5F1E9]"
          >
            {testSent ? (
              <>
                <Check className="h-3.5 w-3.5 text-[#303B32]" />
                <span>Test Alert Sent</span>
              </>
            ) : (
              <>
                <BellRing className="h-3.5 w-3.5 text-[#303B32]" />
                <span>Send Test Alert</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
