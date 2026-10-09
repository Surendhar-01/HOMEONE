-- ============================================================================
-- HOMEONE - 0002_storage_buckets.sql
-- Private buckets. Documents are never publicly readable; access goes through
-- short-lived signed URLs issued by the backend after an ownership/role check.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('profile-photos', 'profile-photos', false, 5242880,
    ARRAY['image/jpeg', 'image/jpg', 'image/png']),
  ('provider-documents', 'provider-documents', false, 10485760,
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'application/pdf']),
  ('provider-work-photos', 'provider-work-photos', false, 5242880,
    ARRAY['image/jpeg', 'image/jpg', 'image/png'])
ON CONFLICT (id) DO NOTHING;

-- Owners can manage their own objects. Admins are handled by the service role.
DROP POLICY IF EXISTS "profile_photos_owner_all" ON storage.objects;
CREATE POLICY "profile_photos_owner_all" ON storage.objects
  FOR ALL
  USING (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
  WITH CHECK (bucket_id = 'profile-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "provider_documents_owner_all" ON storage.objects;
CREATE POLICY "provider_documents_owner_all" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'provider-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'provider-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "provider_work_photos_owner_all" ON storage.objects;
CREATE POLICY "provider_work_photos_owner_all" ON storage.objects
  FOR ALL
  USING (
    bucket_id = 'provider-work-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'provider-work-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Keep the first admin bootstrap explicit and auditable.
-- Admin accounts are never created from the public app.
CREATE OR REPLACE FUNCTION public.promote_to_admin(target_email text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_id uuid;
BEGIN
  SELECT id INTO target_id FROM auth.users WHERE email = lower(trim(target_email));
  IF target_id IS NULL THEN
    RAISE EXCEPTION 'No auth user found for %', target_email;
  END IF;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (target_id, 'ADMIN')
  ON CONFLICT (user_id) DO UPDATE SET role = 'ADMIN';

  RETURN target_id;
END;
$$;