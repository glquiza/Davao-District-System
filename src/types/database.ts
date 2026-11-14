export type RequestDecisionStatus = "pending" | "approved" | "rejected" | "cancelled";
export type MembershipStatus = "active" | "left" | "removed";
export type ActivityLevel = "national" | "district" | "locale";
export type ActivityModality = "physical" | "online" | "hybrid";
export type ActivityStatus = "upcoming" | "ongoing" | "completed" | "cancelled";
export type LinkPlatform = "youtube" | "facebook" | "zoom" | "google_meet" | "other";

export type NotificationType =
  | "activity_published"
  | "activity_updated"
  | "activity_cancelled"
  | "activity_reminder"
  | "membership_approved"
  | "membership_rejected"
  | "leave_requested"
  | "leave_approved"
  | "leave_rejected"
  | "announcement";

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  is_district_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface District {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
}

export interface Locale {
  id: string;
  district_id: string;
  name: string;
  slug: string;
  address: string | null;
  contact_info: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LocaleAdminAssignment {
  id: string;
  locale_id: string;
  user_id: string;
  assigned_by: string | null;
  created_at: string;
  locale?: Locale;
  profile?: Profile;
}

export interface InvitationCode {
  id: string;
  locale_id: string;
  code: string;
  label: string | null;
  max_uses: number;
  expires_at: string;
  is_active: boolean;
  created_by: string;
  created_at: string;
}

export interface MembershipRequest {
  id: string;
  user_id: string;
  locale_id: string;
  invitation_code_id: string;
  status: RequestDecisionStatus;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  locale?: Locale;
  profile?: Profile;
  invitation_code?: Pick<InvitationCode, "id" | "code" | "label">;
}

export interface Membership {
  id: string;
  user_id: string;
  locale_id: string;
  request_id: string | null;
  status: MembershipStatus;
  joined_at: string;
  left_at: string | null;
  left_reason: string | null;
  locale?: Locale;
  profile?: Profile;
}

export interface LeaveRequest {
  id: string;
  membership_id: string;
  user_id: string;
  locale_id: string;
  reason: string | null;
  status: RequestDecisionStatus;
  reviewed_by: string | null;
  review_note: string | null;
  created_at: string;
  reviewed_at: string | null;
  locale?: Locale;
  profile?: Profile;
}

export interface ActivityLink {
  id: string;
  activity_id: string;
  platform: LinkPlatform;
  label: string;
  url: string;
  sort_order: number;
  created_at: string;
}

export interface ProgramActivity {
  id: string;
  title: string;
  description: string | null;
  level: ActivityLevel;
  district_id: string | null;
  locale_id: string | null;
  category: string;
  modality: ActivityModality;
  starts_at: string;
  ends_at: string | null;
  venue: string | null;
  status: ActivityStatus;
  thumbnail_url: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  locale?: Pick<Locale, "id" | "name" | "slug"> | null;
  district?: Pick<District, "id" | "name" | "slug"> | null;
  activity_links?: ActivityLink[];
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  activity_id: string | null;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id: string | null;
  locale_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  actor?: Pick<Profile, "id" | "full_name" | "email"> | null;
  locale?: Pick<Locale, "id" | "name"> | null;
}

export interface UserAccessContext {
  profile: Profile;
  activeMembership: (Membership & { locale: Locale }) | null;
  pendingJoinRequest: (MembershipRequest & { locale: Locale }) | null;
  pendingLeaveRequest: (LeaveRequest & { locale: Locale }) | null;
  adminLocales: Locale[];
  pendingAdminInvites: Locale[];
  unreadNotificationCount: number;
}
