
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS tagline text,
  ADD COLUMN IF NOT EXISTS bio_long text,
  ADD COLUMN IF NOT EXISTS spotify_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS beatport_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url text;

CREATE UNIQUE INDEX IF NOT EXISTS artists_user_id_unique ON public.artists(user_id) WHERE user_id IS NOT NULL;

-- Allow linked user to update their own artist page
DROP POLICY IF EXISTS "Linked user can update own artist" ON public.artists;
CREATE POLICY "Linked user can update own artist"
ON public.artists FOR UPDATE
TO authenticated
USING (user_id IS NOT NULL AND auth.uid() = user_id);

-- Storage bucket for banners
INSERT INTO storage.buckets (id, name, public)
VALUES ('artist-banners', 'artist-banners', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public read artist banners" ON storage.objects;
CREATE POLICY "Public read artist banners"
ON storage.objects FOR SELECT
USING (bucket_id = 'artist-banners');

DROP POLICY IF EXISTS "Authenticated upload artist banners" ON storage.objects;
CREATE POLICY "Authenticated upload artist banners"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'artist-banners');

DROP POLICY IF EXISTS "Authenticated update artist banners" ON storage.objects;
CREATE POLICY "Authenticated update artist banners"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'artist-banners');

DROP POLICY IF EXISTS "Authenticated delete artist banners" ON storage.objects;
CREATE POLICY "Authenticated delete artist banners"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'artist-banners');
