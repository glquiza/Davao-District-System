const MINISTER_TAG_REGEX = /\n*<!--dds-minister:([\s\S]*?)-->\s*/;
const REMOVED_TAG_REGEX = /\n*<!--dds-removed:true-->\s*/;
const ADMIN_INVITES_TAG_REGEX = /\n*<!--dds-admin-invites:([\s\S]*?)-->\s*/;

export type LocaleAdminInviteStatus = "pending" | "accepted" | "declined";

export interface ParsedLocaleMetadata {
  headMinister: string | null;
  contactInfo: string | null;
  isRemoved: boolean;
  adminInvites: Record<string, LocaleAdminInviteStatus>;
}

export function parseLocaleMetadata(
  rawContactInfo: string | null | undefined
): ParsedLocaleMetadata {
  if (!rawContactInfo) {
    return {
      headMinister: null,
      contactInfo: null,
      isRemoved: false,
      adminInvites: {},
    };
  }

  const isRemoved = REMOVED_TAG_REGEX.test(rawContactInfo);
  const ministerMatch = rawContactInfo.match(MINISTER_TAG_REGEX);
  const headMinister = ministerMatch?.[1]?.trim() || null;

  let adminInvites: Record<string, LocaleAdminInviteStatus> = {};
  const invitesMatch = rawContactInfo.match(ADMIN_INVITES_TAG_REGEX);
  if (invitesMatch?.[1]) {
    try {
      const parsed = JSON.parse(invitesMatch[1]) as Record<string, LocaleAdminInviteStatus>;
      if (parsed && typeof parsed === "object") {
        adminInvites = parsed;
      }
    } catch {
      adminInvites = {};
    }
  }

  const contactInfo =
    rawContactInfo
      .replace(MINISTER_TAG_REGEX, "")
      .replace(REMOVED_TAG_REGEX, "")
      .replace(ADMIN_INVITES_TAG_REGEX, "")
      .trim() || null;

  return {
    headMinister,
    contactInfo,
    isRemoved,
    adminInvites,
  };
}

export function isLocaleRemoved(
  locale: { slug?: string | null; contact_info?: string | null } | null | undefined
): boolean {
  if (!locale) return true;
  if (locale.slug && locale.slug.startsWith("removed-")) return true;
  return parseLocaleMetadata(locale.contact_info).isRemoved;
}

export function getLocaleAdminInviteStatus(
  locale: { contact_info?: string | null } | null | undefined,
  userId: string,
  hasActiveLocaleMembership = false
): LocaleAdminInviteStatus {
  if (!locale) return "pending";
  const { adminInvites } = parseLocaleMetadata(locale.contact_info);
  const recorded = adminInvites[userId];
  if (recorded === "accepted" || recorded === "pending" || recorded === "declined") {
    return recorded;
  }
  return hasActiveLocaleMembership ? "accepted" : "pending";
}

export function setLocaleAdminInviteStatus(
  rawContactInfo: string | null | undefined,
  userId: string,
  status: LocaleAdminInviteStatus
): string | null {
  const current = parseLocaleMetadata(rawContactInfo);
  const nextInvites: Record<string, LocaleAdminInviteStatus> = {
    ...current.adminInvites,
    [userId]: status,
  };
  return serializeLocaleMetadata(
    current.headMinister,
    current.contactInfo,
    current.isRemoved,
    nextInvites
  );
}

export function serializeLocaleMetadata(
  headMinister: string | null | undefined,
  contactInfo: string | null | undefined,
  isRemoved = false,
  adminInvites?: Record<string, LocaleAdminInviteStatus>,
  existingRawContactInfo?: string | null
): string | null {
  const existing = existingRawContactInfo
    ? parseLocaleMetadata(existingRawContactInfo)
    : null;

  const cleanContact = (contactInfo ?? "")
    .replace(MINISTER_TAG_REGEX, "")
    .replace(REMOVED_TAG_REGEX, "")
    .replace(ADMIN_INVITES_TAG_REGEX, "")
    .trim();
  const cleanMinister = (headMinister ?? "").trim();
  const resolvedInvites = adminInvites ?? existing?.adminInvites ?? {};

  const parts: string[] = [];
  if (cleanContact) parts.push(cleanContact);
  if (cleanMinister) parts.push(`<!--dds-minister:${cleanMinister}-->`);
  if (Object.keys(resolvedInvites).length > 0) {
    parts.push(`<!--dds-admin-invites:${JSON.stringify(resolvedInvites)}-->`);
  }
  if (isRemoved) parts.push(`<!--dds-removed:true-->`);

  return parts.length > 0 ? parts.join("\n") : null;
}


