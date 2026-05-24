
-- 1) Hide private file URLs from anonymous visitors.
--    Authenticated users (subscribers + admins) keep full access.
REVOKE SELECT (audio_url, download_url, acapella_url, instrumental_url)
  ON public.tracks FROM anon;

-- 2) Prevent non-admins from spoofing admin replies in support chat.
DROP POLICY IF EXISTS "Insert messages in own thread" ON public.support_messages;
CREATE POLICY "Insert messages in own thread"
  ON public.support_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = auth.uid()
    AND is_admin = public.has_role(auth.uid(), 'admin')
    AND (
      public.has_role(auth.uid(), 'admin')
      OR EXISTS (
        SELECT 1 FROM public.support_threads t
        WHERE t.id = thread_id AND t.user_id = auth.uid()
      )
    )
  );
