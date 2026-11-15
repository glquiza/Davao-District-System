"use client";

import { useEffect, useState } from "react";
import { Download, Monitor, Share, Smartphone, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export function InstallAppButton({
  variant = "hero",
}: {
  variant?: "hero" | "navbar";
}) {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register PWA Service Worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Ignore service worker registration errors in restricted contexts
      });
    }

    // Check if already installed and running as standalone app
    const checkStandalone = () => {
      const standaloneMatch = window.matchMedia(
        "(display-mode: standalone)"
      ).matches;
      const iosStandalone = Boolean(
        (window.navigator as Navigator & { standalone?: boolean }).standalone
      );
      setIsStandalone(standaloneMatch || iosStandalone);
    };

    checkStandalone();

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      setShowGuideModal(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  if (isStandalone) {
    return null;
  }

  async function handleInstallClick() {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setDeferredPrompt(null);
        }
        return;
      } catch {
        // Fall back to guide modal if prompt fails
      }
    }
    setShowGuideModal(true);
  }

  return (
    <>
      {variant === "hero" ? (
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex items-center gap-2 rounded-xl border border-[#C8B48E] bg-gradient-to-r from-[#FBF9F4] via-[#F0ECE3] to-[#E5D9BF] px-6 py-3 text-sm font-medium text-[#202820] shadow-sm hover:from-[#F5F1E9] hover:to-[#DFCFAF]"
        >
          <Download className="h-4 w-4 text-[#303B32]" />
          <span>Install App</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleInstallClick}
          title="Install Davao District App on your device"
          className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6C6A5] bg-gradient-to-b from-white to-[#F5F1E9] px-3 py-1.5 text-xs font-medium text-[#202820] shadow-sm hover:from-[#FBF9F4] hover:to-[#EDE6D6]"
        >
          <Download className="h-3.5 w-3.5 text-[#303B32]" />
          <span className="hidden lg:inline">Install App</span>
        </button>
      )}

      {showGuideModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-app-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#202820]/50 backdrop-blur-xs p-4"
        >
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-[#D6C6A5] bg-gradient-to-br from-white via-[#FCFBF7] to-[#F2ECE0] p-6 sm:p-7 text-left shadow-xl space-y-5">
            <div className="inset-x-0 top-0 h-1.5 absolute bg-gradient-to-r from-[#303B32] via-[#8C7853] to-[#D6C6A5]" />

            <button
              type="button"
              onClick={() => setShowGuideModal(false)}
              aria-label="Close install guide"
              className="absolute top-4 right-4 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-[#D6C6A5]/70 bg-white text-[#475048] hover:bg-[#303B32] hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/pmcc-logo.png"
                alt="PMCC (4th Watch) Logo"
                className="h-12 w-12 shrink-0 object-contain drop-shadow-xs"
              />
              <div>
                <h2
                  id="install-app-title"
                  className="font-serif text-lg sm:text-xl font-semibold text-[#202820]"
                >
                  Install Davao District App
                </h2>
                <p className="text-xs text-[#636B62]">
                  Add to your home screen or desktop for 1-tap access
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs sm:text-sm text-[#303B32]">
              <div className="rounded-xl border border-[#D6C6A5]/70 bg-white/90 p-3.5 space-y-1">
                <p className="font-semibold text-[#202820] flex items-center gap-2">
                  <Smartphone className="h-4 w-4 text-[#8C7853]" />
                  <span>Android (Chrome / Samsung Internet)</span>
                </p>
                <p className="text-xs text-[#475048] leading-relaxed">
                  Tap the browser menu <strong>(&#8942;)</strong> in the top-right corner and select{" "}
                  <strong>&ldquo;Install app&rdquo;</strong> or{" "}
                  <strong>&ldquo;Add to Home screen&rdquo;</strong>.
                </p>
              </div>

              <div className="rounded-xl border border-[#D6C6A5]/70 bg-white/90 p-3.5 space-y-1">
                <p className="font-semibold text-[#202820] flex items-center gap-2">
                  <Share className="h-4 w-4 text-[#8C7853]" />
                  <span>iPhone &amp; iPad (Safari)</span>
                </p>
                <p className="text-xs text-[#475048] leading-relaxed">
                  Tap the <strong>Share</strong> icon at the bottom of Safari, scroll down, and tap{" "}
                  <strong>&ldquo;Add to Home Screen&rdquo;</strong>.
                </p>
              </div>

              <div className="rounded-xl border border-[#D6C6A5]/70 bg-white/90 p-3.5 space-y-1">
                <p className="font-semibold text-[#202820] flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-[#8C7853]" />
                  <span>Windows / Mac (Chrome or Edge)</span>
                </p>
                <p className="text-xs text-[#475048] leading-relaxed">
                  Click the <strong>Install icon</strong> on the right side of your address bar (or menu{" "}
                  <strong>&#8942; &rarr; Cast, save, and share &rarr; Install page as app</strong>).
                </p>
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="rounded-xl bg-gradient-to-r from-[#3A483D] to-[#202820] px-5 py-2 text-xs font-medium text-white shadow-sm"
              >
                Got It
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
