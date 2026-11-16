-- 0006_activity_attendance.sql
-- Activity Attendance Management System

-- 1. Add attendance control fields to public.programs_activities
ALTER TABLE public.programs_activities 
  ADD COLUMN IF NOT EXISTS attendance_status text NOT NULL DEFAULT 'not_started' 
  CHECK (attendance_status IN ('not_started', 'active', 'paused', 'closed')),
  ADD COLUMN IF NOT EXISTS attendance_code text NULL,
  ADD COLUMN IF NOT EXISTS attendance_activated_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS attendance_closed_at timestamptz NULL;

-- 2. Create public.activity_attendance table
CREATE TABLE IF NOT EXISTS public.activity_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id uuid NOT NULL REFERENCES public.programs_activities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  locale_id uuid NULL REFERENCES public.locales(id) ON DELETE SET NULL,
  attended_at timestamptz NOT NULL DEFAULT now(),
  marked_by uuid NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
  notes text NULL,
  CONSTRAINT activity_attendance_unique UNIQUE (activity_id, user_id)
);

-- 3. Create indexes
CREATE INDEX IF NOT EXISTS idx_activity_attendance_activity ON public.activity_attendance(activity_id);
CREATE INDEX IF NOT EXISTS idx_activity_attendance_user ON public.activity_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_attendance_locale ON public.activity_attendance(locale_id);

-- 4. Enable RLS
ALTER TABLE public.activity_attendance ENABLE ROW LEVEL SECURITY;

-- 5. Policies
CREATE POLICY "Users view own attendance"
  ON public.activity_attendance FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "District admins view all attendance"
  ON public.activity_attendance FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_district_admin = true
    )
  );

CREATE POLICY "District admins manage all attendance"
  ON public.activity_attendance FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_district_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND is_district_admin = true
    )
  );

CREATE POLICY "Users insert own attendance"
  ON public.activity_attendance FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
