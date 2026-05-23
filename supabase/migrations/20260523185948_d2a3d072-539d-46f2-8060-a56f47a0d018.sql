-- Lock down sensitive SECURITY DEFINER functions: revoke from PUBLIC/anon
-- and grant only to authenticated users.

DO $$
DECLARE
  fn text;
  sig text;
  fns text[] := ARRAY[
    'admin_apply_track_revision(uuid)',
    'admin_assign_plan(uuid, uuid, integer)',
    'admin_cancel_subscription(uuid)',
    'admin_clear_support_thread(uuid)',
    'admin_delete_support_thread(uuid)',
    'admin_delete_track(uuid)',
    'admin_delete_user(uuid)',
    'admin_reject_track_revision(uuid, text)',
    'admin_review_track(uuid, text, text, jsonb)',
    'admin_set_user_access(uuid, boolean)',
    'admin_set_user_blocked(uuid, boolean)',
    'admin_upsert_track(jsonb, uuid)',
    'cancel_my_subscription()',
    'cms_publish(text[])',
    'cms_restore_version(uuid)',
    'cms_revert_draft(text)',
    'cms_save_draft(text, text, jsonb)',
    'dj_submit_track(jsonb)',
    'dj_submit_track_revision(uuid, jsonb)',
    'dj_update_own_track(uuid, jsonb)',
    'notify_user(uuid, text, text, text, text, jsonb)',
    'redeem_promo_code(text, uuid)',
    'my_download_history()'
  ];
BEGIN
  FOREACH sig IN ARRAY fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC', sig);
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM anon', sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.%s TO authenticated', sig);
  END LOOP;
END $$;

-- Trigger-only / internal helpers: no API exposure at all
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.support_after_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tracks_notify_on_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.tracks_notify_on_status_change() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_track_status() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.validate_promo_code() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_track_downloads() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.artists_guard_linked_user_update() FROM PUBLIC, anon, authenticated;