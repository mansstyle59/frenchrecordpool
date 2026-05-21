
CREATE OR REPLACE FUNCTION public.admin_upsert_track(_track jsonb, _id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  IF NOT public.has_role(v_user, 'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;

  IF _id IS NULL THEN
    v_id := COALESCE((_track->>'id')::uuid, gen_random_uuid());
    INSERT INTO public.tracks (
      id, title, artist, genre, bpm, musical_key, version, label,
      duration, tags, cover_url, audio_url, preview_url,
      download_url, acapella_url, instrumental_url, created_by
    ) VALUES (
      v_id,
      _track->>'title',
      _track->>'artist',
      COALESCE(_track->>'genre',''),
      NULLIF(_track->>'bpm','')::int,
      _track->>'musical_key',
      COALESCE(_track->>'version','Original'),
      _track->>'label',
      _track->>'duration',
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(_track->'tags')), '{}'::text[]),
      _track->>'cover_url',
      _track->>'audio_url',
      _track->>'preview_url',
      _track->>'download_url',
      _track->>'acapella_url',
      _track->>'instrumental_url',
      v_user
    );
  ELSE
    v_id := _id;
    UPDATE public.tracks SET
      title = COALESCE(_track->>'title', title),
      artist = COALESCE(_track->>'artist', artist),
      genre = COALESCE(_track->>'genre', genre),
      bpm = NULLIF(_track->>'bpm','')::int,
      musical_key = _track->>'musical_key',
      version = COALESCE(_track->>'version', version),
      label = _track->>'label',
      duration = _track->>'duration',
      tags = COALESCE(ARRAY(SELECT jsonb_array_elements_text(_track->'tags')), tags),
      cover_url = COALESCE(_track->>'cover_url', cover_url),
      audio_url = COALESCE(_track->>'audio_url', audio_url),
      preview_url = COALESCE(_track->>'preview_url', preview_url),
      download_url = _track->>'download_url',
      acapella_url = _track->>'acapella_url',
      instrumental_url = _track->>'instrumental_url',
      updated_at = now()
    WHERE id = v_id;
  END IF;

  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION public.admin_delete_track(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_admin' USING ERRCODE = '42501';
  END IF;
  DELETE FROM public.tracks WHERE id = _id;
END $$;

GRANT EXECUTE ON FUNCTION public.admin_upsert_track(jsonb, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_track(uuid) TO authenticated;
