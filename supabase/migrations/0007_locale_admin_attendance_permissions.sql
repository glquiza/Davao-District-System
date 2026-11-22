-- 0007_locale_admin_attendance_permissions.sql
-- Allow Locale Admins to view and manage attendance records
-- ONLY for activities that belong to their assigned Locale church(es).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_attendance' 
      AND policyname = 'Locale admins view attendance for assigned locale activities'
  ) THEN
    CREATE POLICY "Locale admins view attendance for assigned locale activities"
      ON public.activity_attendance FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.programs_activities pa
          JOIN public.locale_admins la ON la.locale_id = pa.locale_id
          WHERE pa.id = activity_attendance.activity_id
            AND la.user_id = auth.uid()
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'activity_attendance' 
      AND policyname = 'Locale admins manage attendance for assigned locale activities'
  ) THEN
    CREATE POLICY "Locale admins manage attendance for assigned locale activities"
      ON public.activity_attendance FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.programs_activities pa
          JOIN public.locale_admins la ON la.locale_id = pa.locale_id
          WHERE pa.id = activity_attendance.activity_id
            AND la.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.programs_activities pa
          JOIN public.locale_admins la ON la.locale_id = pa.locale_id
          WHERE pa.id = activity_attendance.activity_id
            AND la.user_id = auth.uid()
        )
      );
  END IF;
END $$;
