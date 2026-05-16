CREATE POLICY "Admins can update audio"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'track-audio' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'track-audio' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update covers"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'track-covers' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'track-covers' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update previews"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'track-previews' AND has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (bucket_id = 'track-previews' AND has_role(auth.uid(), 'admin'::app_role));