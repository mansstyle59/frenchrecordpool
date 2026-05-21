CREATE POLICY "Authenticated can upload to track buckets"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('track-audio','track-previews','track-covers'));

CREATE POLICY "Authenticated can update own uploads in track buckets"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id IN ('track-audio','track-previews','track-covers') AND owner = auth.uid());