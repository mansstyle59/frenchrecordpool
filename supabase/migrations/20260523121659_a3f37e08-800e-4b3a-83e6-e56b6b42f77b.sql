-- Restrict artist-banners mutations to admins only
DROP POLICY IF EXISTS "Authenticated upload artist banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated update artist banners" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete artist banners" ON storage.objects;

CREATE POLICY "Admins upload artist banners" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'artist-banners' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update artist banners" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'artist-banners' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete artist banners" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'artist-banners' AND has_role(auth.uid(), 'admin'::app_role));

-- Restrict uploads to track buckets (audio/previews/covers) to admins
DROP POLICY IF EXISTS "Authenticated can upload to track buckets" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update own uploads in track buckets" ON storage.objects;

CREATE POLICY "Admins upload to track buckets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = ANY (ARRAY['track-audio','track-previews','track-covers'])
    AND has_role(auth.uid(), 'admin'::app_role)
  );
