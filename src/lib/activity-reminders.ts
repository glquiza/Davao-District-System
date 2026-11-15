import type { NotificationItem, ProgramActivity } from "@/types/database";

export interface ReminderIntervalOption {
  minutes: number;
  label: string;
  shortLabel: string;
}

export const REMINDER_INTERVAL_OPTIONS: ReminderIntervalOption[] = [
  { minutes: 1440, label: "24 Hours Before", shortLabel: "24h" },
  { minutes: 360, label: "6 Hours Before", shortLabel: "6h" },
  { minutes: 180, label: "3 Hours Before", shortLabel: "3h" },
  { minutes: 120, label: "2 Hours Before", shortLabel: "2h" },
  { minutes: 60, label: "1 Hour Before", shortLabel: "1h" },
  { minutes: 30, label: "30 Minutes Before", shortLabel: "30m" },
  { minutes: 15, label: "15 Minutes Before", shortLabel: "15m" },
];

export const DEFAULT_REMINDER_MINUTES = [60, 15];

const META_REGEX = /\n*<!--dds-meta:(\{[\s\S]*?\})-->\s*$/;

export interface ParsedActivityMetadata {
  cleanDescription: string | null;
  reminderMinutes: number[];
  lastManualBlastAt: string | null;
}

export function parseActivityMetadata(
  rawDescription: string | null | undefined
): ParsedActivityMetadata {
  if (!rawDescription) {
    return {
      cleanDescription: null,
      reminderMinutes: DEFAULT_REMINDER_MINUTES,
      lastManualBlastAt: null,
    };
  }

  const match = rawDescription.match(META_REGEX);
  if (!match) {
    return {
      cleanDescription: rawDescription.trim() || null,
      reminderMinutes: DEFAULT_REMINDER_MINUTES,
      lastManualBlastAt: null,
    };
  }

  const cleanDescription = rawDescription.replace(META_REGEX, "").trim() || null;

  try {
    const parsed = JSON.parse(match[1]) as {
      reminders?: number[];
      blast?: string | null;
    };
    const reminderMinutes = Array.isArray(parsed.reminders)
      ? parsed.reminders
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n) && n > 0)
          .sort((a, b) => b - a)
      : DEFAULT_REMINDER_MINUTES;

    return {
      cleanDescription,
      reminderMinutes,
      lastManualBlastAt: typeof parsed.blast === "string" ? parsed.blast : null,
    };
  } catch {
    return {
      cleanDescription,
      reminderMinutes: DEFAULT_REMINDER_MINUTES,
      lastManualBlastAt: null,
    };
  }
}

export function serializeActivityMetadata(
  cleanDescription: string | null | undefined,
  reminderMinutes: number[],
  lastManualBlastAt?: string | null
): string | null {
  const clean = (cleanDescription ?? "").replace(META_REGEX, "").trim();
  const normalizedReminders = Array.from(
    new Set(
      reminderMinutes
        .map((n) => Number(n))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
  ).sort((a, b) => b - a);

  const payload = JSON.stringify({
    reminders: normalizedReminders,
    ...(lastManualBlastAt ? { blast: lastManualBlastAt } : {}),
  });

  const metaTag = `<!--dds-meta:${payload}-->`;
  return clean ? `${clean}\n\n${metaTag}` : metaTag;
}

export function parseReminderMinutesInput(raw: string | null | undefined): number[] {
  if (raw === null || raw === undefined) return DEFAULT_REMINDER_MINUTES;
  const trimmed = raw.trim();
  if (!trimmed) return [];
  return Array.from(
    new Set(
      trimmed
        .split(",")
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
  ).sort((a, b) => b - a);
}

export function formatReminderBadgeList(reminderMinutes: number[]): string {
  if (!reminderMinutes || reminderMinutes.length === 0) {
    return "No auto-reminders";
  }
  return reminderMinutes
    .slice()
    .sort((a, b) => b - a)
    .map((mins) => {
      if (mins >= 1440 && mins % 1440 === 0) return `${mins / 1440}d`;
      if (mins >= 60 && mins % 60 === 0) return `${mins / 60}h`;
      return `${mins}m`;
    })
    .join(", ");
}

export function formatTimeRemainingLabel(minutesRemaining: number): string {
  if (minutesRemaining <= 1) return "less than a minute";
  if (minutesRemaining < 60) return `${Math.round(minutesRemaining)} minutes`;
  const hours = Math.floor(minutesRemaining / 60);
  const mins = Math.round(minutesRemaining % 60);
  if (mins === 0) return hours === 1 ? "1 hour" : `${hours} hours`;
  return `${hours}h ${mins}m`;
}

/**
 * Automatically computes an activity's status from its scheduled start and end timestamps:
 * - Before starts_at -> "upcoming"
 * - Between starts_at and ends_at (or within 2 hours after starts_at if ends_at is not set) -> "ongoing"
 * - After ends_at -> "completed"
 */
export function computeActivityScheduleStatus(
  startsAt: string,
  endsAt?: string | null,
  nowMs: number = Date.now()
): "upcoming" | "ongoing" | "completed" {
  const startMs = new Date(startsAt).getTime();
  if (Number.isNaN(startMs)) return "upcoming";

  const parsedEndMs = endsAt ? new Date(endsAt).getTime() : Number.NaN;
  const effectiveEndMs =
    !Number.isNaN(parsedEndMs) && parsedEndMs >= startMs
      ? parsedEndMs
      : startMs + 2 * 60 * 60 * 1000;

  if (nowMs < startMs) {
    return "upcoming";
  }
  if (nowMs <= effectiveEndMs) {
    return "ongoing";
  }
  return "completed";
}

/**
 * Evaluates upcoming activities against current time and returns any due countdown
 * or manual-blast reminder NotificationItems.
 */
export function evaluateDueActivityReminders(
  activities: ProgramActivity[],
  userId: string,
  nowMs: number = Date.now()
): NotificationItem[] {
  const results: NotificationItem[] = [];

  for (const activity of activities) {
    const computedStatus = computeActivityScheduleStatus(
      activity.starts_at,
      activity.ends_at,
      nowMs
    );
    if (computedStatus === "completed") continue;

    const startMs = new Date(activity.starts_at).getTime();
    if (Number.isNaN(startMs)) continue;

    const { reminderMinutes, lastManualBlastAt } = parseActivityMetadata(
      activity.description
    );

    const minutesUntilStart = (startMs - nowMs) / 60000;
    const venueLabel =
      activity.modality === "online"
        ? "Online Livestream"
        : activity.venue || "In-Person Venue";

    const formattedStart = new Date(activity.starts_at).toLocaleString("en-PH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Manila",
    });

    // 1. Check if admin triggered a manual instant reminder blast within the last 24 hours
    if (lastManualBlastAt && activity.created_by !== userId) {
      const blastMs = new Date(lastManualBlastAt).getTime();
      if (!Number.isNaN(blastMs) && nowMs - blastMs <= 24 * 60 * 60 * 1000 && minutesUntilStart > -60) {
        const timeText =
          minutesUntilStart > 0
            ? `Starts in ${formatTimeRemainingLabel(minutesUntilStart)}`
            : "Happening now";
        results.push({
          id: `reminder-blast-${activity.id}-${blastMs}`,
          user_id: userId,
          type: "activity_reminder",
          title: `Reminder: ${activity.title} (${timeText})`,
          body: `${activity.category} • ${venueLabel} • Scheduled for ${formattedStart}. Don't miss this activity!`,
          activity_id: activity.id,
          action_url: `/activities/${activity.id}`,
          is_read: false,
          read_at: null,
          created_at: lastManualBlastAt,
        });
      }
    }

    // 2. Check automatic scheduled countdown intervals (e.g., 24h, 3h, 2h, 1h, 30m, 15m before start)
    if (minutesUntilStart > 0 && reminderMinutes.length > 0) {
      // Find the tightest (smallest) threshold that we have entered
      const sortedAsc = [...reminderMinutes].sort((a, b) => a - b);
      const activeThreshold = sortedAsc.find((threshold) => minutesUntilStart <= threshold);

      if (activeThreshold !== undefined) {
        const thresholdTriggerIso = new Date(
          startMs - activeThreshold * 60000
        ).toISOString();

        results.push({
          id: `reminder-auto-${activity.id}-${activeThreshold}m`,
          user_id: userId,
          type: "activity_reminder",
          title: `Starting in ${formatTimeRemainingLabel(minutesUntilStart)}: ${activity.title}`,
          body: `Scheduled reminder (${formatReminderBadgeList([activeThreshold])} before event) • ${activity.category} at ${venueLabel} (${formattedStart}).`,
          activity_id: activity.id,
          action_url: `/activities/${activity.id}`,
          is_read: false,
          read_at: null,
          created_at: thresholdTriggerIso,
        });
      }
    }
  }

  return results;
}
