-- 0005_cascade_delete_activity_notifications.sql
-- Automatically remove notifications of deleted programs and activities for all users.

-- 1. Purge any preexisting orphan notifications referencing deleted activities
DELETE FROM public.notifications
WHERE (activity_id IS NULL AND action_url LIKE '/activities/%')
   OR (activity_id IS NOT NULL AND activity_id NOT IN (SELECT id FROM public.programs_activities));

-- 2. Update foreign key to ON DELETE CASCADE
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_activity_id_fkey;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_activity_id_fkey
  FOREIGN KEY (activity_id) REFERENCES public.programs_activities(id) ON DELETE CASCADE;

-- 3. Trigger to purge notifications matching activity_id or action_url
CREATE OR REPLACE FUNCTION public.handle_activity_before_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  DELETE FROM public.notifications
  WHERE activity_id = old.id
     OR action_url = '/activities/' || old.id;
  RETURN old;
END;
$$;

DROP TRIGGER IF EXISTS trg_activity_before_delete ON public.programs_activities;
CREATE TRIGGER trg_activity_before_delete
  BEFORE DELETE ON public.programs_activities
  FOR EACH ROW EXECUTE FUNCTION public.handle_activity_before_delete();
