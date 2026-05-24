-- 1) Empêcher anon de lire les URLs audio sensibles depuis tracks
REVOKE SELECT (audio_url, download_url, acapella_url, instrumental_url)
  ON public.tracks FROM anon;

-- 2) Restreindre Realtime support aux participants
-- (RLS sur realtime.messages : seul l'owner du thread ou un admin peut souscrire)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c
             JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname='realtime' AND c.relname='messages') THEN
    -- Activer RLS si pas déjà fait (idempotent)
    EXECUTE 'ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY';

    -- Supprimer d'anciennes policies si présentes
    EXECUTE 'DROP POLICY IF EXISTS "support_realtime_read" ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS "support_realtime_write" ON realtime.messages';
    EXECUTE 'DROP POLICY IF EXISTS "auth_realtime_default_read" ON realtime.messages';

    -- Lecture: admin OU topic NON lié à support_* OU owner du thread support_*
    EXECUTE $POL$
      CREATE POLICY "auth_realtime_default_read"
      ON realtime.messages FOR SELECT
      TO authenticated
      USING (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR (
          realtime.topic() NOT LIKE 'support_%'
        )
        OR (
          realtime.topic() LIKE 'support_messages:%'
          AND EXISTS (
            SELECT 1 FROM public.support_threads st
            WHERE st.id::text = split_part(realtime.topic(), ':', 2)
              AND st.user_id = auth.uid()
          )
        )
        OR (
          realtime.topic() = 'admin-support-threads-feed'
          AND public.has_role(auth.uid(), 'admin'::public.app_role)
        )
      );
    $POL$;

    -- Broadcast/presence (write)
    EXECUTE $POL$
      CREATE POLICY "auth_realtime_default_write"
      ON realtime.messages FOR INSERT
      TO authenticated
      WITH CHECK (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR realtime.topic() NOT LIKE 'support_%'
        OR (
          realtime.topic() LIKE 'support_messages:%'
          AND EXISTS (
            SELECT 1 FROM public.support_threads st
            WHERE st.id::text = split_part(realtime.topic(), ':', 2)
              AND st.user_id = auth.uid()
          )
        )
      );
    $POL$;
  END IF;
END $$;