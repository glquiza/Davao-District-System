"use client";

import { useState } from "react";
import { ExternalLink, Play, Radio, Tv, Video } from "lucide-react";
import type { ActivityLink, ActivityStatus } from "@/types/database";

interface ParsedStream {
  kind: "youtube" | "facebook" | "meeting";
  youtubeId?: string;
  thumbnailUrl?: string;
  embedUrl?: string;
  platformLabel: string;
}

function extractYouTubeId(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl);
    const host = u.hostname.replace(/^www\./i, "").toLowerCase();

    if (host === "youtu.be") {
      const id = u.pathname.split("/").filter(Boolean)[0];
      return id && id.length >= 11 ? id.slice(0, 11) : null;
    }

    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const vParam = u.searchParams.get("v");
      if (vParam && vParam.length >= 11) return vParam.slice(0, 11);

      const parts = u.pathname.split("/").filter(Boolean);
      if (
        parts.length >= 2 &&
        ["live", "embed", "shorts", "v"].includes(parts[0].toLowerCase())
      ) {
        return parts[1].slice(0, 11);
      }
    }
  } catch {
    // Ignore invalid URLs
  }
  return null;
}

function parseStreamLink(link: ActivityLink): ParsedStream {
  const ytId = extractYouTubeId(link.url);
  if (ytId) {
    return {
      kind: "youtube",
      youtubeId: ytId,
      thumbnailUrl: `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`,
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`,
      platformLabel: "YouTube Live",
    };
  }

  const lowerUrl = link.url.toLowerCase();
  if (
    link.platform === "facebook" ||
    lowerUrl.includes("facebook.com") ||
    lowerUrl.includes("fb.watch")
  ) {
    const canEmbedVideo =
      lowerUrl.includes("/videos/") ||
      lowerUrl.includes("fb.watch") ||
      lowerUrl.includes("/watch");
    return {
      kind: "facebook",
      embedUrl: canEmbedVideo
        ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
            link.url
          )}&show_text=false&autoplay=true`
        : undefined,
      platformLabel: "Facebook Live",
    };
  }

  const labelMap: Record<ActivityLink["platform"], string> = {
    youtube: "YouTube Live",
    facebook: "Facebook Live",
    zoom: "Zoom Broadcast",
    google_meet: "Google Meet",
    other: "Livestream Broadcast",
  };

  return {
    kind: "meeting",
    platformLabel: labelMap[link.platform] ?? "Livestream",
  };
}

export function LivestreamVideoTemplate({
  links,
  activityTitle,
  activityStatus,
  compact = false,
}: {
  links: ActivityLink[];
  activityTitle: string;
  activityStatus: ActivityStatus;
  compact?: boolean;
}) {
  const sortedLinks = [...links].sort((a, b) => a.sort_order - b.sort_order);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlayingEmbed, setIsPlayingEmbed] = useState(false);

  const activeLink = sortedLinks[selectedIndex] ?? sortedLinks[0];
  if (!activeLink) return null;

  const parsed = parseStreamLink(activeLink);
  const canPlayInline = Boolean(parsed.embedUrl);

  return (
    <div className="space-y-2.5">
      {/* Stream Switcher Tabs when multiple links exist */}
      {sortedLinks.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex flex-wrap gap-1 rounded-xl border border-[#D6C6A5]/60 bg-[#F0ECE3] p-1">
            {sortedLinks.map((lnk, idx) => {
              const active = idx === selectedIndex;
              return (
                <button
                  key={lnk.id}
                  type="button"
                  onClick={() => {
                    setSelectedIndex(idx);
                    setIsPlayingEmbed(false);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-medium ${
                    active
                      ? "bg-white text-[#202820] shadow-sm border border-[#D6C6A5]/50"
                      : "text-[#636B62] hover:text-[#202820]"
                  }`}
                >
                  <Tv className="h-3 w-3 text-[#303B32]" />
                  <span>{lnk.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 16:9 Video Player / Livestream Template Frame */}
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-[#D6C6A5] bg-[#202820] shadow-sm group/video">
        {isPlayingEmbed && parsed.embedUrl ? (
          <iframe
            src={parsed.embedUrl}
            title={activeLink.label || activityTitle}
            className="h-full w-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        ) : (
          <>
            {/* Video Thumbnail or Architectural Broadcast Backdrop */}
            {parsed.thumbnailUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={parsed.thumbnailUrl}
                alt={activeLink.label || activityTitle}
                className="h-full w-full object-cover opacity-80 transition-opacity duration-200 group-hover/video:opacity-90"
              />
            ) : (
              <div
                className="h-full w-full"
                style={{
                  background:
                    "radial-gradient(circle at 50% 38%, #303B32 0%, #202820 75%)",
                }}
              />
            )}

            {/* Subtle Dark Gradient Overlay for Readability */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#202820]/95 via-[#202820]/35 to-[#202820]/60" />

            {/* Top Bar: Broadcast Status Pill & Platform Tag */}
            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6C6A5]/40 bg-[#202820]/85 px-2.5 py-1 text-[11px] font-medium text-[#F5F1E9] backdrop-blur-sm">
                <Radio
                  className={`h-3 w-3 ${
                    activityStatus === "ongoing" ? "text-[#D6C6A5]" : "text-[#8C9288]"
                  }`}
                />
                <span>
                  {activityStatus === "ongoing"
                    ? "Live Broadcast"
                    : parsed.platformLabel}
                </span>
              </span>

              <a
                href={activeLink.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-[#D6C6A5]/40 bg-[#202820]/85 px-2.5 py-1 text-[11px] font-medium text-[#F5F1E9] hover:bg-[#303B32] backdrop-blur-sm"
                title="Open livestream in new tab"
              >
                <span>Open Stream</span>
                <ExternalLink className="h-3 w-3 text-[#D6C6A5]" />
              </a>
            </div>

            {/* Center Play / Launch Action */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-4 text-center">
              {canPlayInline ? (
                <button
                  type="button"
                  onClick={() => setIsPlayingEmbed(true)}
                  className="flex flex-col items-center gap-2 group/play"
                  aria-label={`Play ${activeLink.label}`}
                >
                  <span className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-[#D6C6A5] bg-[#303B32]/95 text-[#F5F1E9] shadow-md group-hover/play:bg-[#202820]">
                    <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-[#D6C6A5] text-[#D6C6A5] ml-0.5" />
                  </span>
                  {!compact && (
                    <span className="rounded-full bg-[#202820]/80 px-3 py-0.5 text-xs font-medium text-[#F5F1E9] border border-[#D6C6A5]/30">
                      Click to Watch Embedded Stream
                    </span>
                  )}
                </button>
              ) : (
                <a
                  href={activeLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col items-center gap-2 group/play"
                >
                  <span className="flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-[#D6C6A5] bg-[#303B32]/95 text-[#F5F1E9] shadow-md group-hover/play:bg-[#202820]">
                    <Play className="h-5 w-5 sm:h-6 sm:w-6 fill-[#D6C6A5] text-[#D6C6A5] ml-0.5" />
                  </span>
                  <span className="rounded-full bg-[#202820]/80 px-3 py-0.5 text-xs font-medium text-[#F5F1E9] border border-[#D6C6A5]/30">
                    Launch {parsed.platformLabel}
                  </span>
                </a>
              )}
            </div>

            {/* Bottom Video Player Template Chrome (Progress Bar + Stream Label) */}
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 px-3.5 pb-2.5 pt-4 space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs text-[#F5F1E9]">
                <div className="flex items-center gap-1.5 truncate">
                  <Video className="h-3.5 w-3.5 text-[#D6C6A5] shrink-0" />
                  <span className="font-medium truncate">{activeLink.label}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-[#D6C6A5] shrink-0">
                  {parsed.platformLabel}
                </span>
              </div>

              {/* Minimalist Player Scrubber Bar */}
              <div className="h-1 w-full overflow-hidden rounded-full bg-[#F5F1E9]/20">
                <div className="h-full w-1/3 rounded-full bg-[#D6C6A5]" />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
