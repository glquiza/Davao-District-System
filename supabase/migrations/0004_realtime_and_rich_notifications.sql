-- ============================================================================
-- DAVAO DISTRICT SYSTEM — REALTIME & RICH ACTIVITY NOTIFICATIONS
-- ============================================================================

-- 1. Enable Supabase Realtime on public.notifications (idempotent)
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end
$$;

-- 2. Upgrade handle_activity_notifications() with richer body & broader recipient coverage
create or replace function public.handle_activity_notifications()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_notif_type public.notification_type;
  v_title_prefix text;
  v_details text;
  v_modality_label text;
begin
  if tg_op = 'INSERT' then
    v_notif_type := 'activity_published';
    v_title_prefix := 'New Activity: ';
  elsif tg_op = 'UPDATE' then
    if old.status <> 'cancelled' and new.status = 'cancelled' then
      v_notif_type := 'activity_cancelled';
      v_title_prefix := 'Cancelled: ';
    elsif old.title is distinct from new.title
       or old.starts_at is distinct from new.starts_at
       or old.venue is distinct from new.venue
       or old.modality is distinct from new.modality then
      v_notif_type := 'activity_updated';
      v_title_prefix := 'Updated: ';
    else
      return new;
    end if;
  end if;

  v_modality_label := case new.modality
    when 'online' then 'Online Livestream'
    when 'hybrid' then 'Hybrid (' || coalesce(new.venue, 'In-Person & Online') || ')'
    else coalesce(new.venue, 'In-Person Venue')
  end;

  v_details := new.category || ' • ' || v_modality_label || ' • ' ||
    to_char(new.starts_at at time zone 'Asia/Manila', 'Mon DD, YYYY HH12:MI AM');

  if new.level = 'national' then
    insert into public.notifications (user_id, type, title, body, activity_id, action_url)
    select
      p.id,
      v_notif_type,
      v_title_prefix || new.title,
      'National Program — ' || v_details,
      new.id,
      '/activities/' || new.id
    from public.profiles p
    where p.id is distinct from new.created_by;

  elsif new.level = 'district' then
    insert into public.notifications (user_id, type, title, body, activity_id, action_url)
    select distinct
      recipient.user_id,
      v_notif_type,
      v_title_prefix || new.title,
      'Davao District — ' || v_details,
      new.id,
      '/activities/' || new.id
    from (
      select m.user_id
      from public.memberships m
      join public.locales l on l.id = m.locale_id
      where m.status = 'active'
        and l.district_id = new.district_id
      union
      select la.user_id
      from public.locale_admins la
      join public.locales l on l.id = la.locale_id
      where l.district_id = new.district_id
      union
      select p.id as user_id
      from public.profiles p
      where p.is_district_admin = true
    ) recipient
    where recipient.user_id is distinct from new.created_by;

  elsif new.level = 'locale' then
    insert into public.notifications (user_id, type, title, body, activity_id, action_url)
    select distinct
      recipient.user_id,
      v_notif_type,
      v_title_prefix || new.title,
      'Locale Activity — ' || v_details,
      new.id,
      '/activities/' || new.id
    from (
      select m.user_id
      from public.memberships m
      where m.status = 'active'
        and m.locale_id = new.locale_id
      union
      select la.user_id
      from public.locale_admins la
      where la.locale_id = new.locale_id
    ) recipient
    where recipient.user_id is distinct from new.created_by;
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

revoke execute on function public.handle_activity_notifications() from public, anon, authenticated;

-- 3. Cascade support, District Admin DELETE policies, & atomic RPC for Locale Removal
alter table public.memberships
  drop constraint if exists memberships_locale_id_fkey,
  add constraint memberships_locale_id_fkey
    foreign key (locale_id) references public.locales(id) on delete cascade;

alter table public.membership_requests
  drop constraint if exists membership_requests_invitation_code_id_fkey,
  add constraint membership_requests_invitation_code_id_fkey
    foreign key (invitation_code_id) references public.invitation_codes(id) on delete cascade;

drop policy if exists "District admins delete any programs_activities" on public.programs_activities;
create policy "District admins delete any programs_activities"
  on public.programs_activities for delete
  to authenticated
  using (public.is_district_admin());

drop policy if exists "District admins delete invitation codes" on public.invitation_codes;
create policy "District admins delete invitation codes"
  on public.invitation_codes for delete
  to authenticated
  using (public.is_district_admin() or public.is_locale_admin(locale_id));

drop policy if exists "District admins delete membership requests" on public.membership_requests;
create policy "District admins delete membership requests"
  on public.membership_requests for delete
  to authenticated
  using (public.is_district_admin());

drop policy if exists "District admins delete memberships" on public.memberships;
create policy "District admins delete memberships"
  on public.memberships for delete
  to authenticated
  using (public.is_district_admin());

drop policy if exists "District admins delete leave requests" on public.leave_requests;
create policy "District admins delete leave requests"
  on public.leave_requests for delete
  to authenticated
  using (public.is_district_admin());

create or replace function public.delete_locale_cascade(p_locale_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_locale_name text;
begin
  if not public.is_district_admin() then
    raise exception 'Only a District Admin can remove a Locale church.';
  end if;

  select name into v_locale_name from public.locales where id = p_locale_id;
  if not found then
    raise exception 'Locale not found.';
  end if;

  -- Notify active members, pending applicants, and Locale Admins that the Locale was removed and their status has been reset to Step 1
  insert into public.notifications (user_id, type, title, body, action_url)
  select distinct
    recipient.user_id,
    'announcement',
    'Locale Church Removed — ' || v_locale_name,
    v_locale_name || ' has been removed by the District Administration. Your membership and Locale role have been reset so you may join a new Locale church using an invitation code.',
    '/membership'
  from (
    select m.user_id from public.memberships m where m.locale_id = p_locale_id and m.status = 'active'
    union
    select mr.user_id from public.membership_requests mr where mr.locale_id = p_locale_id and mr.status = 'pending'
    union
    select la.user_id from public.locale_admins la where la.locale_id = p_locale_id
  ) recipient
  where recipient.user_id is distinct from auth.uid();

  delete from public.leave_requests where locale_id = p_locale_id;
  delete from public.memberships where locale_id = p_locale_id;
  delete from public.membership_requests where locale_id = p_locale_id;
  delete from public.invitation_codes where locale_id = p_locale_id;
  delete from public.locale_admins where locale_id = p_locale_id;
  delete from public.programs_activities where locale_id = p_locale_id;
  delete from public.locales where id = p_locale_id;

  insert into public.audit_logs (actor_id, locale_id, action, entity_type, entity_id, metadata)
  values (
    auth.uid(),
    null,
    'locale.deleted',
    'locale',
    p_locale_id,
    jsonb_build_object('name', v_locale_name)
  );
end;
$$;

revoke execute on function public.delete_locale_cascade(uuid) from public, anon;
grant execute on function public.delete_locale_cascade(uuid) to authenticated;

-- Immediately clean up any previously soft-removed Locales (slug like 'removed-%') and all their child records
delete from public.locales
where slug like 'removed-%'
   or contact_info like '%<!--dds-removed:true-->%';

-- 4. Locale Admin Invitation Notification Trigger & Accept / Decline RPCs
create or replace function public.handle_locale_admin_invitation_notification()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_locale_name text;
begin
  select name into v_locale_name from public.locales where id = new.locale_id;

  if new.user_id is distinct from new.assigned_by then
    insert into public.notifications (user_id, type, title, body, action_url)
    values (
      new.user_id,
      'announcement',
      'Locale Admin Invitation — ' || coalesce(v_locale_name, 'Davao District Locale'),
      'You have been invited by the District Administration to serve as a Locale Admin for ' || coalesce(v_locale_name, 'this Locale') || '. Accept this invitation to automatically receive membership in ' || coalesce(v_locale_name, 'this Locale') || ' (without needing an invitation code) and unlock the Locale Admin console.',
      '/notifications'
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_locale_admin_invitation_notification on public.locale_admins;
create trigger trg_locale_admin_invitation_notification
  after insert on public.locale_admins
  for each row execute function public.handle_locale_admin_invitation_notification();

revoke execute on function public.handle_locale_admin_invitation_notification() from public, anon, authenticated;

create or replace function public.accept_locale_admin_invitation(p_locale_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_locale_name text;
begin
  if v_user_id is null then
    raise exception 'Authentication required.';
  end if;

  if not exists (
    select 1 from public.locale_admins
    where locale_id = p_locale_id and user_id = v_user_id
  ) then
    raise exception 'No Locale Admin invitation found for this Locale.';
  end if;

  select name into v_locale_name from public.locales where id = p_locale_id;

  -- Cancel any pending join requests
  update public.membership_requests
  set status = 'cancelled',
      reviewed_at = now()
  where user_id = v_user_id
    and status = 'pending';

  -- If the user had an active membership in a different Locale, close it cleanly
  update public.memberships
  set status = 'left',
      left_at = now(),
      left_reason = 'Accepted Locale Admin assignment for ' || coalesce(v_locale_name, 'Locale')
  where user_id = v_user_id
    and status = 'active'
    and locale_id <> p_locale_id;

  -- Automatically grant active membership in this Locale if not already active
  if not exists (
    select 1 from public.memberships
    where user_id = v_user_id
      and locale_id = p_locale_id
      and status = 'active'
  ) then
    insert into public.memberships (user_id, locale_id, status)
    values (v_user_id, p_locale_id, 'active');
  end if;

  -- Mark invitation notification as read
  update public.notifications
  set is_read = true,
      read_at = now()
  where user_id = v_user_id
    and is_read = false
    and title like 'Locale Admin Invitation%';

  insert into public.audit_logs (actor_id, locale_id, action, entity_type, entity_id, metadata)
  values (
    v_user_id,
    p_locale_id,
    'locale_admin.invitation_accepted',
    'locale',
    p_locale_id,
    jsonb_build_object('locale_name', v_locale_name)
  );
end;
$$;

create or replace function public.decline_locale_admin_invitation(p_locale_id uuid)
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

  delete from public.locale_admins
  where locale_id = p_locale_id
    and user_id = v_user_id;

  update public.notifications
  set is_read = true,
      read_at = now()
  where user_id = v_user_id
    and is_read = false
    and title like 'Locale Admin Invitation%';
end;
$$;

revoke execute on function public.accept_locale_admin_invitation(uuid) from public, anon;
grant execute on function public.accept_locale_admin_invitation(uuid) to authenticated;

revoke execute on function public.decline_locale_admin_invitation(uuid) from public, anon;
grant execute on function public.decline_locale_admin_invitation(uuid) to authenticated;



