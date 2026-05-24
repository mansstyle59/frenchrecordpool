
-- =====================================================
-- 1) STORAGE: stop allowing public listing of buckets
--    Public buckets still serve files via their public URL.
-- =====================================================
DROP POLICY IF EXISTS "Anyone can listen to previews" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view covers"        ON storage.objects;
DROP POLICY IF EXISTS "Public read artist banners"    ON storage.objects;

-- =====================================================
-- 2) FUNCTIONS: tighten EXECUTE grants
--    Pattern: REVOKE from PUBLIC, then GRANT to the
--    minimal role(s) that actually need to call it.
-- =====================================================

-- ---- Trigger-only functions: no API access ever ----
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()                 FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tracks_notify_on_insert()                  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.tracks_notify_on_status_change()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.support_after_message()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.artists_guard_linked_user_update()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_promo_code()                      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_track_status()                    FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.increment_track_downloads()                FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_user(uuid, text, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

-- ---- Authenticated-only business functions ----
REVOKE EXECUTE ON FUNCTION public.redeem_promo_code(text, uuid)              FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_my_subscription()                   FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_download_history()                      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.resolve_or_create_artist(text, text)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dj_submit_track(jsonb)                     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dj_update_own_track(uuid, jsonb)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.dj_submit_track_revision(uuid, jsonb)      FROM PUBLIC, anon;

-- ---- Admin-only functions (still callable by authenticated, internal check enforces admin) ----
REVOKE EXECUTE ON FUNCTION public.admin_review_track(uuid, text, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_upsert_track(jsonb, uuid)             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_track(uuid)                    FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_user(uuid)                     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_blocked(uuid, boolean)       FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_user_access(uuid, boolean)        FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_cancel_subscription(uuid)             FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_assign_plan(uuid, uuid, integer)      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_apply_track_revision(uuid)            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_reject_track_revision(uuid, text)     FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_clear_support_thread(uuid)            FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_delete_support_thread(uuid)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cms_save_draft(text, text, jsonb)           FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cms_publish(text[])                         FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cms_revert_draft(text)                      FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cms_restore_version(uuid)                   FROM PUBLIC, anon;

-- ---- Truly public read helpers (used on homepage / artist pages by anon visitors) ----
-- Keep EXECUTE for anon + authenticated; just ensure PUBLIC role default is fine.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role)               TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_subscription(uuid)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.slugify(text)                          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dj_charts_weekly(integer)              TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.top_favorited_tracks(integer)          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.top_downloads_period(integer, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trending_artists(integer, integer)     TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.artist_stats(uuid)                     TO anon, authenticated;
