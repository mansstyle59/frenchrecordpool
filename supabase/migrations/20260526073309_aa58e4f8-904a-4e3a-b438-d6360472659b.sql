-- 1) Révoque l'accès direct aux URLs sensibles des tracks (gardé via get_track_urls RPC)
REVOKE SELECT (download_url, acapella_url, instrumental_url)
  ON public.tracks
  FROM anon, authenticated;

-- service_role conserve l'accès complet (utilisé par les edge functions)
GRANT SELECT (download_url, acapella_url, instrumental_url)
  ON public.tracks
  TO service_role;

-- 2) Corrige les policies storage pour artist-banners : utiliser objects.name (chemin réel)
--    et non a.name (nom de l'artiste) dans foldername()
DROP POLICY IF EXISTS "Linked user can upload artist banners" ON storage.objects;
DROP POLICY IF EXISTS "Linked user can update artist banners" ON storage.objects;
DROP POLICY IF EXISTS "Linked user can delete artist banners" ON storage.objects;

CREATE POLICY "Linked user can upload artist banners"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'artist-banners'
    AND EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.user_id = auth.uid()
        AND (a.id)::text = (storage.foldername(storage.objects.name))[1]
    )
  );

CREATE POLICY "Linked user can update artist banners"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'artist-banners'
    AND EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.user_id = auth.uid()
        AND (a.id)::text = (storage.foldername(storage.objects.name))[1]
    )
  );

CREATE POLICY "Linked user can delete artist banners"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'artist-banners'
    AND EXISTS (
      SELECT 1 FROM public.artists a
      WHERE a.user_id = auth.uid()
        AND (a.id)::text = (storage.foldername(storage.objects.name))[1]
    )
  );