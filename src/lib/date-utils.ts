/**
 * Date and Time utilities for Davao District System.
 * All church programs, worship services, and schedules in Davao District
 * operate on Philippine Standard Time (PST / Asia/Manila, UTC+8).
 */

export const PHILIPPINE_TIMEZONE = "Asia/Manila";

/**
 * Parses an input string (e.g. from <input type="datetime-local">) into a UTC ISO string.
 *
 * <input type="datetime-local"> values are formatted as "YYYY-MM-DDTHH:mm" without timezone information.
 * When submitted, users in the Davao District intend this as Philippine Time (UTC+8).
 * If the user's client provides a timezoneOffset (in minutes, from Date.prototype.getTimezoneOffset()),
 * that offset is used; otherwise, it defaults to -480 (UTC+8).
 */
export function parseDateTimeInputToISO(
  raw: string | null | undefined,
  timezoneOffsetMinutes?: number | string | null
): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // If already contains timezone specifier (Z, +HH:MM, -HH:MM after time)
  if (/(?:Z|[+-]\d{2}(?::?\d{2})?)$/i.test(trimmed)) {
    const d = new Date(trimmed);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }

  // Handle standard "YYYY-MM-DDTHH:mm" or "YYYY-MM-DDTHH:mm:ss"
  let offsetStr = "+08:00"; // default to Philippine Standard Time (UTC+8)

  if (
    timezoneOffsetMinutes !== undefined &&
    timezoneOffsetMinutes !== null &&
    timezoneOffsetMinutes !== ""
  ) {
    const offsetNum = Number(timezoneOffsetMinutes);
    if (!Number.isNaN(offsetNum)) {
      // Note: getTimezoneOffset() returns minutes UTC - local.
      // E.g., for UTC+8, offsetNum is -480.
      const sign = offsetNum <= 0 ? "+" : "-";
      const absMinutes = Math.abs(offsetNum);
      const hours = String(Math.floor(absMinutes / 60)).padStart(2, "0");
      const mins = String(absMinutes % 60).padStart(2, "0");
      offsetStr = `${sign}${hours}:${mins}`;
    }
  }

  // Ensure seconds are included if not present (e.g. "2026-11-15T14:00" -> "2026-11-15T14:00:00")
  const withSeconds =
    trimmed.length === 16 ? `${trimmed}:00` : trimmed;
  const isoWithOffset = `${withSeconds}${offsetStr}`;

  const date = new Date(isoWithOffset);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}

/**
 * Formats an ISO date string into "YYYY-MM-DDTHH:mm" for <input type="datetime-local">
 * using the Philippine Time (Asia/Manila) timezone so SSR and CSR match consistently.
 */
export function formatToDateTimeLocalInput(
  isoString: string | null | undefined,
  timeZone: string = PHILIPPINE_TIMEZONE
): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "";

  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const p: Record<string, string> = {};
    for (const part of parts) {
      p[part.type] = part.value;
    }
    const hour = p.hour === "24" ? "00" : p.hour;
    return `${p.year}-${p.month}-${p.day}T${hour}:${p.minute}`;
  } catch {
    return "";
  }
}

/**
 * Formats a date string or Date object in Philippine Time (Asia/Manila)
 */
export function formatPhilippineDateTime(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return "";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: PHILIPPINE_TIMEZONE,
    ...options,
  };

  return date.toLocaleString("en-PH", defaultOptions);
}

/**
 * Formats a date only in Philippine Time (Asia/Manila)
 */
export function formatPhilippineDate(
  dateInput: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (Number.isNaN(date.getTime())) return "";

  const defaultOptions: Intl.DateTimeFormatOptions = {
    dateStyle: "medium",
    timeZone: PHILIPPINE_TIMEZONE,
    ...options,
  };

  return date.toLocaleDateString("en-PH", defaultOptions);
}
