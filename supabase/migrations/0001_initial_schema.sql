-- ============================================================================
-- 0001_initial_schema.sql
-- Davao District System — Core Enums, Tables, Constraints, and Auth Triggers
-- ============================================================================

create extension if not exists "pgcrypto";

-- Custom Enums
create type public.request_decision_status as enum ('pending', 'approved', 'rejected', 'cancelled');
create type public.membership_status as enum ('active', 'left', 'removed');
create type public.activity_level as enum ('national', 'district', 'locale');
create type public.activity_modality as enum ('physical', 'online', 'hybrid');
create type public.activity_status as enum ('upcoming', 'ongoing', 'completed', 'cancelled');
create type public.link_platform as enum ('youtube', 'facebook', 'zoom', 'google_meet', 'other');
create type public.notification_type as enum (
  'activity_published',
  'activity_updated',
  'activity_cancelled',
  'activity_reminder',
  'membership_approved',
  'membership_rejected',
  'leave_requested',
  'leave_approved',
  'leave_rejected',
  'announcement'
);

-- Shared updated_at trigger helper
create or replace function public.handle_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 1. Profiles (1:1 with auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  avatar_url text,
  is_district_admin boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Automatically provision a public.profiles row on Supabase Auth signup
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(coalesce(new.email, 'Member'), '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- 2. Districts
create table public.districts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  created_at timestamptz not null default now()
);

-- 3. Locales
create table public.locales (
  id uuid primary key default gen_random_uuid(),
  district_id uuid not null references public.districts(id) on delete restrict,
  name text not null,
  slug text not null unique,
  address text,
  contact_info text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_locales_district on public.locales (district_id);

create trigger trg_locales_updated_at
  before update on public.locales
  for each row execute function public.handle_updated_at();

-- 4. Locale Admins (Many-to-Many assignment)
create table public.locale_admins (
  id uuid primary key default gen_random_uuid(),
  locale_id uuid not null references public.locales(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (locale_id, user_id)
);

create index idx_locale_admins_user on public.locale_admins (user_id);
create index idx_locale_admins_assigned_by on public.locale_admins (assigned_by);

-- 5. Invitation Codes (Readable & Copyable by Locale Admins)
create table public.invitation_codes (
  id uuid primary key default gen_random_uuid(),
  locale_id uuid not null references public.locales(id) on delete cascade,
  code text not null unique check (code = upper(trim(code))),
  label text,
  max_uses integer not null check (max_uses > 0),
  expires_at timestamptz not null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create index idx_invitation_codes_locale on public.invitation_codes (locale_id, created_at desc);
create index idx_invitation_codes_created_by on public.invitation_codes (created_by);

-- 6. Membership Requests (Incoming Join Applications)
create table public.membership_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  locale_id uuid not null references public.locales(id) on delete cascade,
  invitation_code_id uuid not null references public.invitation_codes(id) on delete restrict,
  status public.request_decision_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index idx_one_pending_request_per_user
  on public.membership_requests (user_id)
  where (status = 'pending');

create index idx_membership_requests_user on public.membership_requests (user_id, created_at desc);
create index idx_membership_requests_locale_status on public.membership_requests (locale_id, status, created_at desc);
create index idx_membership_requests_code on public.membership_requests (invitation_code_id, status);
create index idx_membership_requests_reviewed_by on public.membership_requests (reviewed_by);

-- 7. Memberships (Active + Historical)
create table public.memberships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  locale_id uuid not null references public.locales(id) on delete restrict,
  request_id uuid references public.membership_requests(id) on delete set null,
  status public.membership_status not null default 'active',
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  left_reason text
);

create unique index idx_one_active_membership_per_user
  on public.memberships (user_id)
  where (status = 'active');

create index idx_memberships_user on public.memberships (user_id, joined_at desc);
create index idx_memberships_locale_status on public.memberships (locale_id, status);
create index idx_memberships_request on public.memberships (request_id);

-- 8. Leave Requests (Outgoing Departure / Transfer Approval)
create table public.leave_requests (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.memberships(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  locale_id uuid not null references public.locales(id) on delete cascade,
  reason text,
  status public.request_decision_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create unique index idx_one_pending_leave_per_membership
  on public.leave_requests (membership_id)
  where (status = 'pending');

create index idx_leave_requests_user on public.leave_requests (user_id, created_at desc);
create index idx_leave_requests_locale_status on public.leave_requests (locale_id, status, created_at desc);
create index idx_leave_requests_reviewed_by on public.leave_requests (reviewed_by);

-- 9. Programs & Activities
create table public.programs_activities (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  level public.activity_level not null,
  district_id uuid references public.districts(id) on delete cascade,
  locale_id uuid references public.locales(id) on delete cascade,
  category text not null,
  modality public.activity_modality not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  venue text,
  status public.activity_status not null default 'upcoming',
  thumbnail_url text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint chk_activity_hierarchy check (
    (level = 'national' and district_id is null and locale_id is null) or
    (level = 'district' and district_id is not null and locale_id is null) or
    (level = 'locale' and district_id is not null and locale_id is not null)
  ),
  constraint chk_activity_venue check (
    modality = 'online' or (venue is not null and length(trim(venue)) > 0)
  ),
  constraint chk_activity_dates check (
    ends_at is null or ends_at >= starts_at
  )
);

create trigger trg_activities_updated_at
  before update on public.programs_activities
  for each row execute function public.handle_updated_at();

create index idx_activities_schedule on public.programs_activities (starts_at asc, level);
create index idx_activities_district on public.programs_activities (district_id);
create index idx_activities_locale on public.programs_activities (locale_id);
create index idx_activities_created_by on public.programs_activities (created_by);

-- 10. Activity External / Livestream Links
create table public.activity_links (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.programs_activities(id) on delete cascade,
  platform public.link_platform not null default 'other',
  label text not null,
  url text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index idx_activity_links_activity on public.activity_links (activity_id, sort_order);

-- 11. In-App Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type public.notification_type not null,
  title text not null,
  body text not null,
  activity_id uuid references public.programs_activities(id) on delete set null,
  action_url text,
  is_read boolean not null default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_notifications_user_unread on public.notifications (user_id, is_read, created_at desc);
create index idx_notifications_activity on public.notifications (activity_id);

-- 12. Audit Logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id) on delete set null,
  locale_id uuid references public.locales(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index idx_audit_logs_created_at on public.audit_logs (created_at desc);
create index idx_audit_logs_actor on public.audit_logs (actor_id);
create index idx_audit_logs_locale on public.audit_logs (locale_id);
