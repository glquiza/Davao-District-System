-- ============================================================================
-- 0002_rls_and_rpcs.sql
-- Davao District System — Row Level Security, Helper Functions, and Atomic RPCs
-- ============================================================================

-- Enable RLS across all tables
alter table public.profiles enable row level security;
alter table public.districts enable row level security;
alter table public.locales enable row level security;
alter table public.locale_admins enable row level security;
alter table public.invitation_codes enable row level security;
alter table public.membership_requests enable row level security;
alter table public.memberships enable row level security;
alter table public.leave_requests enable row level security;
alter table public.programs_activities enable row level security;
alter table public.activity_links enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_logs enable row level security;

-- ============================================================================
-- 1. RLS Helper Functions (SECURITY DEFINER to prevent recursive RLS queries)
-- ============================================================================

create or replace function public.is_district_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(
    (select is_district_admin from public.profiles where id = (select auth.uid())),
    false
  );
$$;

create or replace function public.is_locale_admin(target_locale_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.locale_admins
    where user_id = (select auth.uid()) and locale_id = target_locale_id
  );
$$;

create or replace function public.user_active_locale_id()
returns uuid
language sql stable security definer set search_path = public
as $$
  select locale_id from public.memberships
  where user_id = (select auth.uid()) and status = 'active'
  limit 1;
$$;

create or replace function public.is_approved_district_member(target_district_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.memberships m
    join public.locales l on l.id = m.locale_id
    where m.user_id = (select auth.uid())
      and m.status = 'active'
      and l.district_id = target_district_id
  ) or exists (
    select 1
    from public.locale_admins la
    join public.locales l on l.id = la.locale_id
    where la.user_id = (select auth.uid())
      and l.district_id = target_district_id
  );
$$;

-- ============================================================================
-- 2. Table RLS Policies (Scoped TO authenticated with initPlan-cached auth.uid)
-- ============================================================================

-- PROFILES
create policy "Users can view own profile, admins can view relevant profiles"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or public.is_district_admin()
    or exists (
      select 1 from public.membership_requests mr
      where mr.user_id = profiles.id and public.is_locale_admin(mr.locale_id)
    )
    or exists (
      select 1 from public.memberships m
      where m.user_id = profiles.id and public.is_locale_admin(m.locale_id)
    )
  );

create policy "Users can update own non-privileged profile fields"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (
    id = (select auth.uid())
    and is_district_admin = public.is_district_admin()
  );

-- DISTRICTS
create policy "Authenticated users can view districts"
  on public.districts for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy "District admins can insert districts"
  on public.districts for insert
  to authenticated
  with check (public.is_district_admin());

create policy "District admins can update districts"
  on public.districts for update
  to authenticated
  using (public.is_district_admin())
  with check (public.is_district_admin());

create policy "District admins can delete districts"
  on public.districts for delete
  to authenticated
  using (public.is_district_admin());

-- LOCALES
create policy "Authenticated users can view locales"
  on public.locales for select
  to authenticated
  using ((select auth.uid()) is not null);

create policy "District admins can insert locales"
  on public.locales for insert
  to authenticated
  with check (public.is_district_admin());

create policy "District admins or assigned Locale admins can update locales"
  on public.locales for update
  to authenticated
  using (public.is_district_admin() or public.is_locale_admin(id))
  with check (public.is_district_admin() or public.is_locale_admin(id));

create policy "District admins can delete locales"
  on public.locales for delete
  to authenticated
  using (public.is_district_admin());

-- LOCALE ADMINS
create policy "Users view own admin assignments; admins view locale assignments"
  on public.locale_admins for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_district_admin()
    or public.is_locale_admin(locale_id)
  );

create policy "District admins insert locale admin assignments"
  on public.locale_admins for insert
  to authenticated
  with check (public.is_district_admin());

create policy "District admins update locale admin assignments"
  on public.locale_admins for update
  to authenticated
  using (public.is_district_admin())
  with check (public.is_district_admin());

create policy "District admins delete locale admin assignments"
  on public.locale_admins for delete
  to authenticated
  using (public.is_district_admin());

-- INVITATION CODES (Never directly readable by regular users; validated via RPC)
create policy "District admins and locale admins view invitation codes"
  on public.invitation_codes for select
  to authenticated
  using (public.is_district_admin() or public.is_locale_admin(locale_id));

create policy "Locale admins create invitation codes for their locale"
  on public.invitation_codes for insert
  to authenticated
  with check (public.is_locale_admin(locale_id) and created_by = (select auth.uid()));

create policy "Locale admins update own locale invitation codes"
  on public.invitation_codes for update
  to authenticated
  using (public.is_locale_admin(locale_id))
  with check (public.is_locale_admin(locale_id));

-- MEMBERSHIP REQUESTS
create policy "Users view own membership requests; admins view scoped requests"
  on public.membership_requests for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_district_admin()
    or public.is_locale_admin(locale_id)
  );

-- MEMBERSHIPS
create policy "Users view own memberships; admins view scoped memberships"
  on public.memberships for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_district_admin()
    or public.is_locale_admin(locale_id)
  );

-- LEAVE REQUESTS
create policy "Users view own leave requests; admins view scoped leave requests"
  on public.leave_requests for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_district_admin()
    or public.is_locale_admin(locale_id)
  );

-- PROGRAMS & ACTIVITIES (Strict Read & Write Hierarchy)
create policy "Hierarchical activity read access"
  on public.programs_activities for select
  to authenticated
  using (
    (level = 'national' and (select auth.uid()) is not null)
    or (level = 'district' and (public.is_district_admin() or public.is_approved_district_member(district_id)))
    or (level = 'locale' and (
      public.is_district_admin()
      or public.is_locale_admin(locale_id)
      or public.user_active_locale_id() = locale_id
    ))
  );

create policy "Strict role-scoped activity insert"
  on public.programs_activities for insert
  to authenticated
  with check (
    created_by = (select auth.uid())
    and (
      (level in ('national', 'district') and public.is_district_admin())
      or (level = 'locale' and public.is_locale_admin(locale_id))
    )
  );

create policy "Strict role-scoped activity update"
  on public.programs_activities for update
  to authenticated
  using (
    (level in ('national', 'district') and public.is_district_admin())
    or (level = 'locale' and public.is_locale_admin(locale_id))
  )
  with check (
    (level in ('national', 'district') and public.is_district_admin())
    or (level = 'locale' and public.is_locale_admin(locale_id))
  );

create policy "Strict role-scoped activity delete"
  on public.programs_activities for delete
  to authenticated
  using (
    (level in ('national', 'district') and public.is_district_admin())
    or (level = 'locale' and public.is_locale_admin(locale_id))
  );

-- ACTIVITY LINKS (Inherits read/write visibility from parent activity)
create policy "Users view links for activities they can access"
  on public.activity_links for select
  to authenticated
  using (
    exists (
      select 1 from public.programs_activities pa
      where pa.id = activity_links.activity_id
    )
  );

create policy "Authorized publisher inserts activity links"
  on public.activity_links for insert
  to authenticated
  with check (
    exists (
      select 1 from public.programs_activities pa
      where pa.id = activity_links.activity_id
        and (
          (pa.level in ('national', 'district') and public.is_district_admin())
          or (pa.level = 'locale' and public.is_locale_admin(pa.locale_id))
        )
    )
  );

create policy "Authorized publisher updates activity links"
  on public.activity_links for update
  to authenticated
  using (
    exists (
      select 1 from public.programs_activities pa
      where pa.id = activity_links.activity_id
        and (
          (pa.level in ('national', 'district') and public.is_district_admin())
          or (pa.level = 'locale' and public.is_locale_admin(pa.locale_id))
        )
    )
  )
  with check (
    exists (
      select 1 from public.programs_activities pa
      where pa.id = activity_links.activity_id
        and (
          (pa.level in ('national', 'district') and public.is_district_admin())
          or (pa.level = 'locale' and public.is_locale_admin(pa.locale_id))
        )
    )
  );

create policy "Authorized publisher deletes activity links"
  on public.activity_links for delete
  to authenticated
  using (
    exists (
      select 1 from public.programs_activities pa
      where pa.id = activity_links.activity_id
        and (
          (pa.level in ('national', 'district') and public.is_district_admin())
          or (pa.level = 'locale' and public.is_locale_admin(pa.locale_id))
        )
    )
  );

-- NOTIFICATIONS
create policy "Users read own notifications"
  on public.notifications for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy "Users mark own notifications as read"
  on public.notifications for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- AUDIT LOGS
create policy "District admins read all audit logs; Locale admins read own locale logs"
  on public.audit_logs for select
  to authenticated
  using (
    public.is_district_admin()
    or (locale_id is not null and public.is_locale_admin(locale_id))
  );

-- ============================================================================
-- 3. Transactional RPCs for Invite Capacity, Join Review, and Leave Review
-- ============================================================================

-- 3.1 Submit Membership Request (Atomic Invite Code Validation + Slot Reservation)
create or replace function public.submit_membership_request(
  p_locale_id uuid,
  p_code text
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_code_row public.invitation_codes%rowtype;
  v_reserved_count integer;
  v_request_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if exists (
    select 1 from public.memberships
    where user_id = v_user_id and status = 'active'
  ) then
    raise exception 'You already belong to an active Locale. Request and obtain leave approval before joining another Locale.';
  end if;

  if exists (
    select 1 from public.membership_requests
    where user_id = v_user_id and status = 'pending'
  ) then
    raise exception 'You already have a pending membership request.';
  end if;

  select * into v_code_row
  from public.invitation_codes
  where code = upper(trim(p_code))
    and locale_id = p_locale_id
  for update;

  if not found then
    raise exception 'Invalid invitation code for the selected Locale.';
  end if;

  if not v_code_row.is_active then
    raise exception 'This invitation code has been deactivated.';
  end if;

  if v_code_row.expires_at <= now() then
    raise exception 'This invitation code has expired.';
  end if;

  select count(*) into v_reserved_count
  from public.membership_requests
  where invitation_code_id = v_code_row.id
    and status in ('pending', 'approved');

  if v_reserved_count >= v_code_row.max_uses then
    raise exception 'This invitation code has reached its maximum usage capacity.';
  end if;

  insert into public.membership_requests (
    user_id,
    locale_id,
    invitation_code_id,
    status
  ) values (
    v_user_id,
    p_locale_id,
    v_code_row.id,
    'pending'
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

-- 3.2 Cancel Pending Membership Request
create or replace function public.cancel_membership_request(p_request_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  update public.membership_requests
  set status = 'cancelled',
      reviewed_at = now()
  where id = p_request_id
    and user_id = v_user_id
    and status = 'pending';

  if not found then
    raise exception 'Pending membership request not found.';
  end if;
end;
$$;

-- 3.3 Review Membership Request (Locale Admin Approve / Reject)
create or replace function public.review_membership_request(
  p_request_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_req public.membership_requests%rowtype;
  v_locale_name text;
begin
  if v_actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected.';
  end if;

  select * into v_req
  from public.membership_requests
  where id = p_request_id
  for update;

  if not found or v_req.status <> 'pending' then
    raise exception 'Pending membership request not found.';
  end if;

  if not public.is_locale_admin(v_req.locale_id) then
    raise exception 'Only an assigned Locale Admin can review this membership request.';
  end if;

  select name into v_locale_name from public.locales where id = v_req.locale_id;

  update public.membership_requests
  set status = p_decision::public.request_decision_status,
      reviewed_by = v_actor_id,
      review_note = nullif(trim(p_note), ''),
      reviewed_at = now()
  where id = p_request_id;

  if p_decision = 'approved' then
    insert into public.memberships (user_id, locale_id, request_id, status)
    values (v_req.user_id, v_req.locale_id, v_req.id, 'active');

    insert into public.notifications (user_id, type, title, body, action_url)
    values (
      v_req.user_id,
      'membership_approved',
      'Membership Approved — ' || v_locale_name,
      'Your membership application to ' || v_locale_name || ' has been approved. You now have access to Davao District and Locale programs and activities.',
      '/feed'
    );
  else
    insert into public.notifications (user_id, type, title, body, action_url)
    values (
      v_req.user_id,
      'membership_rejected',
      'Membership Application Update — ' || v_locale_name,
      coalesce('Your application to ' || v_locale_name || ' was not approved. Note: ' || nullif(trim(p_note), ''), 'Your application to ' || v_locale_name || ' was not approved.'),
      '/membership'
    );
  end if;

  insert into public.audit_logs (actor_id, locale_id, action, entity_type, entity_id, metadata)
  values (
    v_actor_id,
    v_req.locale_id,
    'membership_request.' || p_decision,
    'membership_request',
    v_req.id,
    jsonb_build_object('applicant_id', v_req.user_id, 'note', p_note)
  );
end;
$$;

-- 3.4 Submit Leave Request (Requires Outgoing Locale Admin Approval)
create or replace function public.submit_leave_request(p_reason text default null)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_membership public.memberships%rowtype;
  v_locale_name text;
  v_leave_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  select * into v_membership
  from public.memberships
  where user_id = v_user_id and status = 'active'
  for update;

  if not found then
    raise exception 'You do not have an active Locale membership to leave.';
  end if;

  if exists (
    select 1 from public.leave_requests
    where membership_id = v_membership.id and status = 'pending'
  ) then
    raise exception 'You already have a pending leave request awaiting Locale Admin approval.';
  end if;

  insert into public.leave_requests (
    membership_id,
    user_id,
    locale_id,
    reason,
    status
  ) values (
    v_membership.id,
    v_user_id,
    v_membership.locale_id,
    nullif(trim(p_reason), ''),
    'pending'
  )
  returning id into v_leave_id;

  select name into v_locale_name from public.locales where id = v_membership.locale_id;

  insert into public.notifications (user_id, type, title, body, action_url)
  select
    la.user_id,
    'leave_requested',
    'Member Leave Request — ' || v_locale_name,
    'A member has requested approval to leave ' || v_locale_name || '.',
    '/locale-admin'
  from public.locale_admins la
  where la.locale_id = v_membership.locale_id;

  return v_leave_id;
end;
$$;

-- 3.5 Cancel Pending Leave Request
create or replace function public.cancel_leave_request(p_leave_request_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  update public.leave_requests
  set status = 'cancelled',
      reviewed_at = now()
  where id = p_leave_request_id
    and user_id = v_user_id
    and status = 'pending';

  if not found then
    raise exception 'Pending leave request not found.';
  end if;
end;
$$;

-- 3.6 Review Leave Request (Outgoing Locale Admin Approve / Reject)
create or replace function public.review_leave_request(
  p_leave_request_id uuid,
  p_decision text,
  p_note text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_lr public.leave_requests%rowtype;
  v_locale_name text;
begin
  if v_actor_id is null then
    raise exception 'Authentication required.';
  end if;

  if p_decision not in ('approved', 'rejected') then
    raise exception 'Decision must be approved or rejected.';
  end if;

  select * into v_lr
  from public.leave_requests
  where id = p_leave_request_id
  for update;

  if not found or v_lr.status <> 'pending' then
    raise exception 'Pending leave request not found.';
  end if;

  if not public.is_locale_admin(v_lr.locale_id) then
    raise exception 'Only an assigned Locale Admin can review this leave request.';
  end if;

  select name into v_locale_name from public.locales where id = v_lr.locale_id;

  update public.leave_requests
  set status = p_decision::public.request_decision_status,
      reviewed_by = v_actor_id,
      review_note = nullif(trim(p_note), ''),
      reviewed_at = now()
  where id = p_leave_request_id;

  if p_decision = 'approved' then
    update public.memberships
    set status = 'left',
        left_at = now(),
        left_reason = v_lr.reason
    where id = v_lr.membership_id
      and status = 'active';

    insert into public.notifications (user_id, type, title, body, action_url)
    values (
      v_lr.user_id,
      'leave_approved',
      'Leave Request Approved — ' || v_locale_name,
      'Your departure from ' || v_locale_name || ' has been approved. You may now apply to join another Locale using its invitation code.',
      '/membership'
    );
  else
    insert into public.notifications (user_id, type, title, body, action_url)
    values (
      v_lr.user_id,
      'leave_rejected',
      'Leave Request Declined — ' || v_locale_name,
      coalesce('Your request to leave ' || v_locale_name || ' was declined. Note: ' || nullif(trim(p_note), ''), 'Your request to leave ' || v_locale_name || ' was declined. Your membership remains active.'),
      '/membership'
    );
  end if;

  insert into public.audit_logs (actor_id, locale_id, action, entity_type, entity_id, metadata)
  values (
    v_actor_id,
    v_lr.locale_id,
    'leave_request.' || p_decision,
    'leave_request',
    v_lr.id,
    jsonb_build_object('member_id', v_lr.user_id, 'note', p_note)
  );
end;
$$;

-- Restrict SECURITY DEFINER helper & RPC execution to authenticated users only
revoke execute on function public.is_district_admin() from public, anon;
grant execute on function public.is_district_admin() to authenticated;

revoke execute on function public.is_locale_admin(uuid) from public, anon;
grant execute on function public.is_locale_admin(uuid) to authenticated;

revoke execute on function public.user_active_locale_id() from public, anon;
grant execute on function public.user_active_locale_id() to authenticated;

revoke execute on function public.is_approved_district_member(uuid) from public, anon;
grant execute on function public.is_approved_district_member(uuid) to authenticated;

revoke execute on function public.submit_membership_request(uuid, text) from public, anon;
grant execute on function public.submit_membership_request(uuid, text) to authenticated;

revoke execute on function public.cancel_membership_request(uuid) from public, anon;
grant execute on function public.cancel_membership_request(uuid) to authenticated;

revoke execute on function public.review_membership_request(uuid, text, text) from public, anon;
grant execute on function public.review_membership_request(uuid, text, text) to authenticated;

revoke execute on function public.submit_leave_request(text) from public, anon;
grant execute on function public.submit_leave_request(text) to authenticated;

revoke execute on function public.cancel_leave_request(uuid) from public, anon;
grant execute on function public.cancel_leave_request(uuid) to authenticated;

revoke execute on function public.review_leave_request(uuid, text, text) from public, anon;
grant execute on function public.review_leave_request(uuid, text, text) to authenticated;

-- ============================================================================
-- 4. Automatic Activity Notification & Audit Trigger
-- ============================================================================

create or replace function public.handle_activity_notifications()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_notif_type public.notification_type;
  v_title_prefix text;
begin
  if tg_op = 'INSERT' then
    v_notif_type := 'activity_published';
    v_title_prefix := 'New Activity: ';
  elsif tg_op = 'UPDATE' then
    if old.status <> 'cancelled' and new.status = 'cancelled' then
      v_notif_type := 'activity_cancelled';
      v_title_prefix := 'Cancelled: ';
    elsif old.starts_at is distinct from new.starts_at or old.venue is distinct from new.venue then
      v_notif_type := 'activity_updated';
      v_title_prefix := 'Schedule Updated: ';
    else
      return new;
    end if;
  end if;

  if new.level = 'national' then
    insert into public.notifications (user_id, type, title, body, activity_id, action_url)
    select
      p.id,
      v_notif_type,
      v_title_prefix || new.title,
      'A National activity has been posted or updated.',
      new.id,
      '/activities/' || new.id
    from public.profiles p
    where p.id <> new.created_by;

  elsif new.level = 'district' then
    insert into public.notifications (user_id, type, title, body, activity_id, action_url)
    select distinct
      m.user_id,
      v_notif_type,
      v_title_prefix || new.title,
      'A Davao District activity has been posted or updated.',
      new.id,
      '/activities/' || new.id
    from public.memberships m
    join public.locales l on l.id = m.locale_id
    where m.status = 'active'
      and l.district_id = new.district_id
      and m.user_id <> new.created_by;

  elsif new.level = 'locale' then
    insert into public.notifications (user_id, type, title, body, activity_id, action_url)
    select
      m.user_id,
      v_notif_type,
      v_title_prefix || new.title,
      'A Locale activity has been posted or updated for your congregation.',
      new.id,
      '/activities/' || new.id
    from public.memberships m
    where m.status = 'active'
      and m.locale_id = new.locale_id
      and m.user_id <> new.created_by;
  end if;

  insert into public.audit_logs (actor_id, locale_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    new.locale_id,
    'activity.' || lower(tg_op),
    'programs_activity',
    new.id,
    jsonb_build_object('title', new.title, 'level', new.level, 'status', new.status)
  );

  return new;
end;
$$;

create trigger trg_activity_notifications
  after insert or update on public.programs_activities
  for each row execute function public.handle_activity_notifications();

revoke execute on function public.handle_new_auth_user() from public, anon, authenticated;
revoke execute on function public.handle_activity_notifications() from public, anon, authenticated;
