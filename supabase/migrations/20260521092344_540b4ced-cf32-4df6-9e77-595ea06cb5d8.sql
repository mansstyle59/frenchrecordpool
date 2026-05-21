-- Drop existing admin storage policies and recreate as a single permissive ALL policy
DROP POLICY IF EXISTS "Admins can upload audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete audio" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete covers" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload previews" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update previews" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete previews" ON storage.objects;
DROP POLICY IF EXISTS "Admins manage track buckets" ON storage.objects;

CREATE POLICY "Admins manage track buckets"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id IN ('track-audio','track-previews','track-covers')
  AND public.has_role(auth.uid(), 'admin')
)
WITH CHECK (
  bucket_id IN ('track-audio','track-previews','track-covers')
  AND public.has_role(auth.uid(), 'admin')
);

-- Ensure admins can read all objects across the 3 buckets (in addition to public/subscriber rules)
DROP POLICY IF EXISTS "Admins can read track buckets" ON storage.objects;
CREATE POLICY "Admins can read track buckets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id IN ('track-audio','track-previews','track-covers')
  AND public.has_role(auth.uid(), 'admin')
);

-- Raise per-bucket file size limit to 500MB to avoid hidden "payload too large" surfacing as RLS-like failures
UPDATE storage.buckets SET file_size_limit = 524288000
 WHERE id IN ('track-audio','track-previews','track-covers');