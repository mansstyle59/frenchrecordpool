-- 1) Étendre la contrainte kind pour inclure 'both' (et garder artist/remixer)
ALTER TABLE public.artists DROP CONSTRAINT IF EXISTS artists_kind_check;
ALTER TABLE public.artists ADD CONSTRAINT artists_kind_check
  CHECK (kind = ANY (ARRAY['artist'::text, 'remixer'::text, 'both'::text]));

-- 2) Storage : permettre aux utilisateurs liés à un artiste d'uploader leur bannière/photo
CREATE POLICY "Linked user can upload artist banners"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'artist-banners'
  AND EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.user_id = auth.uid()
      AND a.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Linked user can update artist banners"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'artist-banners'
  AND EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.user_id = auth.uid()
      AND a.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Linked user can delete artist banners"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'artist-banners'
  AND EXISTS (
    SELECT 1 FROM public.artists a
    WHERE a.user_id = auth.uid()
      AND a.id::text = (storage.foldername(name))[1]
  )
);