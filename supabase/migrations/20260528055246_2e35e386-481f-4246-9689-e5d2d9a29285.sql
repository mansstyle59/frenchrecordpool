
-- 1) Lock down sensitive track URL columns at column level (RLS row policy stays for metadata)
REVOKE SELECT (download_url, acapella_url, instrumental_url) ON public.tracks FROM authenticated;
REVOKE SELECT (download_url, acapella_url, instrumental_url) ON public.tracks FROM anon;
-- service_role and admin RPCs (SECURITY DEFINER) keep access via function owner privileges

-- 2) Tighten realtime topic SELECT policy:
--    - admin: all
--    - support_messages:<thread_id>: only thread owner (existing)
--    - admin-* channels: admins only
--    - notif-<uuid>: only that user
--    - cms_content_changes / cms_* : admins only (drafts are confidential)
--    - other topics (global-presence, site_branding_changes, support-launcher:<uid>, support_messages, etc.): authenticated allowed
DROP POLICY IF EXISTS "auth_realtime_default_read" ON realtime.messages;
CREATE POLICY "auth_realtime_default_read" ON realtime.messages
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR (
      -- support thread messages: only owner
      (realtime.topic() LIKE 'support_messages:%')
      AND EXISTS (
        SELECT 1 FROM public.support_threads st
        WHERE st.id::text = split_part(realtime.topic(), ':', 2)
          AND st.user_id = auth.uid()
      )
    )
    OR (
      -- user notification topic must match own uid
      (realtime.topic() LIKE 'notif-%')
      AND substring(realtime.topic() from 7) = auth.uid()::text
    )
    OR (
      -- user-scoped support launcher channel
      (realtime.topic() LIKE 'support-launcher:%')
      AND substring(realtime.topic() from 18) = auth.uid()::text
    )
    OR (
      -- everything else that is not admin-only / cms / support / notif: allowed for any authenticated user
      realtime.topic() NOT LIKE 'support_%'
      AND realtime.topic() NOT LIKE 'notif-%'
      AND realtime.topic() NOT LIKE 'admin-%'
      AND realtime.topic() NOT LIKE 'cms_%'
    )
  );
