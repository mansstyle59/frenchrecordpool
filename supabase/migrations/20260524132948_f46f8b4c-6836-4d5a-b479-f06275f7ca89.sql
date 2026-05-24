-- 1) Nouvelles colonnes
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS energy integer,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS explicit boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS copyright text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS external_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS accent_color text,
  ADD COLUMN IF NOT EXISTS mix_engineer text,
  ADD COLUMN IF NOT EXISTS mastering_engineer text;

-- Trigger de validation énergie 1..10
CREATE OR REPLACE FUNCTION public.validate_track_energy()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.energy IS NOT NULL AND (NEW.energy < 1 OR NEW.energy > 10) THEN
    RAISE EXCEPTION 'invalid_energy: %', NEW.energy;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_tracks_validate_energy ON public.tracks;
CREATE TRIGGER trg_tracks_validate_energy
  BEFORE INSERT OR UPDATE ON public.tracks
  FOR EACH ROW EXECUTE FUNCTION public.validate_track_energy();

-- 2) dj_submit_track : ajoute les nouveaux champs
CREATE OR REPLACE FUNCTION public.dj_submit_track(_track jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid := gen_random_uuid();
  v_artist_id uuid;
  v_remixer_ids uuid[] := '{}'::uuid[];
  v_remixer_name text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  INSERT INTO public.user_roles(user_id, role) VALUES (v_user, 'dj') ON CONFLICT DO NOTHING;

  IF (_track ? 'artist') AND coalesce(_track->>'artist','') <> '' THEN
    v_artist_id := public.resolve_or_create_artist(_track->>'artist', 'artist');
  END IF;
  IF _track ? 'remixers' THEN
    FOR v_remixer_name IN SELECT jsonb_array_elements_text(_track->'remixers') LOOP
      IF trim(v_remixer_name) <> '' THEN
        v_remixer_ids := array_append(v_remixer_ids, public.resolve_or_create_artist(v_remixer_name, 'remixer'));
      END IF;
    END LOOP;
  END IF;

  INSERT INTO public.tracks (
    id, title, artist, artist_id, featured_artists, remixer_ids,
    producer, release_year, isrc, subgenre, mood,
    genre, bpm, musical_key, version, label,
    duration, tags, cover_url, audio_url, preview_url,
    download_url, acapella_url, instrumental_url,
    energy, language, explicit, copyright, notes,
    external_links, custom_fields, accent_color,
    mix_engineer, mastering_engineer,
    created_by, submitted_by, status
  ) VALUES (
    v_id,
    _track->>'title',
    _track->>'artist',
    v_artist_id,
    COALESCE(ARRAY(SELECT jsonb_array_elements_text(_track->'featured_artists')), '{}'::text[]),
    v_remixer_ids,
    _track->>'producer',
    NULLIF(_track->>'release_year','')::int,
    _track->>'isrc',
    _track->>'subgenre',
    _track->>'mood',
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
    NULLIF(_track->>'energy','')::int,
    _track->>'language',
    COALESCE((_track->>'explicit')::boolean, false),
    _track->>'copyright',
    _track->>'notes',
    COALESCE(_track->'external_links', '{}'::jsonb),
    COALESCE(_track->'custom_fields', '[]'::jsonb),
    _track->>'accent_color',
    _track->>'mix_engineer',
    _track->>'mastering_engineer',
    v_user, v_user, 'pending'
  );
  RETURN v_id;
END $function$;

-- 3) dj_update_own_track : merge des nouveaux champs
CREATE OR REPLACE FUNCTION public.dj_update_own_track(_id uuid, _track jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_owner uuid;
  v_status text;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'not_authenticated' USING ERRCODE = '42501';
  END IF;
  SELECT submitted_by, status INTO v_owner, v_status FROM public.tracks WHERE id = _id;
  IF v_owner IS NULL OR v_owner <> v_user THEN
    RAISE EXCEPTION 'not_owner' USING ERRCODE = '42501';
  END IF;
  IF v_status NOT IN ('pending','rejected') THEN
    RAISE EXCEPTION 'not_editable' USING ERRCODE = '42501';
  END IF;
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
    energy = NULLIF(_track->>'energy','')::int,
    language = COALESCE(_track->>'language', language),
    explicit = COALESCE((_track->>'explicit')::boolean, explicit),
    copyright = COALESCE(_track->>'copyright', copyright),
    notes = COALESCE(_track->>'notes', notes),
    external_links = COALESCE(_track->'external_links', external_links),
    custom_fields = COALESCE(_track->'custom_fields', custom_fields),
    accent_color = COALESCE(_track->>'accent_color', accent_color),
    mix_engineer = COALESCE(_track->>'mix_engineer', mix_engineer),
    mastering_engineer = COALESCE(_track->>'mastering_engineer', mastering_engineer),
    status = 'pending',
    rejection_reason = NULL,
    updated_at = now()
  WHERE id = _id;
END $function$;

-- 4) admin_upsert_track : ajoute aussi les nouveaux champs
CREATE OR REPLACE FUNCTION public.admin_upsert_track(_track jsonb, _id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
  v_artist_id uuid;
  v_remixer_ids uuid[] := '{}'::uuid[];
  v_remixer_name text;
  v_has_remixers boolean := _track ? 'remixers';
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF NOT public.has_role(v_user,'admin') THEN RAISE EXCEPTION 'not_admin' USING ERRCODE='42501'; END IF;

  IF coalesce(_track->>'artist','') <> '' THEN
    v_artist_id := public.resolve_or_create_artist(_track->>'artist','artist');
  END IF;
  IF v_has_remixers THEN
    FOR v_remixer_name IN SELECT jsonb_array_elements_text(_track->'remixers') LOOP
      IF trim(v_remixer_name) <> '' THEN
        v_remixer_ids := array_append(v_remixer_ids, public.resolve_or_create_artist(v_remixer_name,'remixer'));
      END IF;
    END LOOP;
  END IF;

  IF _id IS NULL THEN
    v_id := COALESCE((_track->>'id')::uuid, gen_random_uuid());
    INSERT INTO public.tracks (
      id, title, artist, artist_id, featured_artists, remixer_ids,
      producer, release_year, isrc, subgenre, mood,
      genre, bpm, musical_key, version, label,
      duration, tags, cover_url, audio_url, preview_url,
      download_url, acapella_url, instrumental_url,
      energy, language, explicit, copyright, notes,
      external_links, custom_fields, accent_color,
      mix_engineer, mastering_engineer,
      created_by, submitted_by, status, reviewed_by, reviewed_at
    ) VALUES (
      v_id,
      _track->>'title', _track->>'artist', v_artist_id,
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(_track->'featured_artists')), '{}'::text[]),
      v_remixer_ids,
      _track->>'producer', NULLIF(_track->>'release_year','')::int,
      _track->>'isrc', _track->>'subgenre', _track->>'mood',
      COALESCE(_track->>'genre',''), NULLIF(_track->>'bpm','')::int,
      _track->>'musical_key', COALESCE(_track->>'version','Original'),
      _track->>'label', _track->>'duration',
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(_track->'tags')), '{}'::text[]),
      _track->>'cover_url', _track->>'audio_url', _track->>'preview_url',
      _track->>'download_url', _track->>'acapella_url', _track->>'instrumental_url',
      NULLIF(_track->>'energy','')::int,
      _track->>'language',
      COALESCE((_track->>'explicit')::boolean, false),
      _track->>'copyright', _track->>'notes',
      COALESCE(_track->'external_links','{}'::jsonb),
      COALESCE(_track->'custom_fields','[]'::jsonb),
      _track->>'accent_color',
      _track->>'mix_engineer', _track->>'mastering_engineer',
      v_user, v_user, 'approved', v_user, now()
    );
  ELSE
    v_id := _id;
    UPDATE public.tracks SET
      title = COALESCE(_track->>'title', title),
      artist = COALESCE(_track->>'artist', artist),
      artist_id = COALESCE(v_artist_id, artist_id),
      featured_artists = CASE WHEN _track ? 'featured_artists'
        THEN COALESCE(ARRAY(SELECT jsonb_array_elements_text(_track->'featured_artists')), '{}'::text[])
        ELSE featured_artists END,
      remixer_ids = CASE WHEN v_has_remixers THEN v_remixer_ids ELSE remixer_ids END,
      producer = COALESCE(_track->>'producer', producer),
      release_year = COALESCE(NULLIF(_track->>'release_year','')::int, release_year),
      isrc = COALESCE(_track->>'isrc', isrc),
      subgenre = COALESCE(_track->>'subgenre', subgenre),
      mood = COALESCE(_track->>'mood', mood),
      genre = COALESCE(_track->>'genre', genre),
      bpm = COALESCE(NULLIF(_track->>'bpm','')::int, bpm),
      musical_key = COALESCE(_track->>'musical_key', musical_key),
      version = COALESCE(_track->>'version', version),
      label = COALESCE(_track->>'label', label),
      duration = COALESCE(_track->>'duration', duration),
      tags = COALESCE(ARRAY(SELECT jsonb_array_elements_text(_track->'tags')), tags),
      cover_url = COALESCE(_track->>'cover_url', cover_url),
      audio_url = COALESCE(_track->>'audio_url', audio_url),
      preview_url = COALESCE(_track->>'preview_url', preview_url),
      download_url = _track->>'download_url',
      acapella_url = _track->>'acapella_url',
      instrumental_url = _track->>'instrumental_url',
      energy = COALESCE(NULLIF(_track->>'energy','')::int, energy),
      language = COALESCE(_track->>'language', language),
      explicit = COALESCE((_track->>'explicit')::boolean, explicit),
      copyright = COALESCE(_track->>'copyright', copyright),
      notes = COALESCE(_track->>'notes', notes),
      external_links = COALESCE(_track->'external_links', external_links),
      custom_fields = COALESCE(_track->'custom_fields', custom_fields),
      accent_color = COALESCE(_track->>'accent_color', accent_color),
      mix_engineer = COALESCE(_track->>'mix_engineer', mix_engineer),
      mastering_engineer = COALESCE(_track->>'mastering_engineer', mastering_engineer),
      updated_at = now()
    WHERE id = v_id;
  END IF;
  RETURN v_id;
END $function$;