-- Remove broad subscriber SELECT on track-audio; force usage of edge function (signed URLs)
DROP POLICY IF EXISTS "Subscribers can download audio" ON storage.objects;

-- Admins keep direct read access for moderation
DROP POLICY IF EXISTS "Admins read track-audio" ON storage.objects;
CREATE POLICY "Admins read track-audio"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'track-audio' AND public.has_role(auth.uid(), 'admin'));
