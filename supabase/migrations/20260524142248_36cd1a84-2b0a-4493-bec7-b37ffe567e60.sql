DROP POLICY IF EXISTS "Public sees approved tracks" ON public.tracks;

CREATE POLICY "Authenticated sees approved tracks"
ON public.tracks
FOR SELECT
TO authenticated
USING (status = 'approved');