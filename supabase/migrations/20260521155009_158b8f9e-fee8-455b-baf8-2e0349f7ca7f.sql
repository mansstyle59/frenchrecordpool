
-- 1) Add kind to artists and switch slug uniqueness to (slug, kind)
ALTER TABLE public.artists
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'artist'
    CHECK (kind IN ('artist','remixer'));

ALTER TABLE public.artists DROP CONSTRAINT IF EXISTS artists_slug_key;
DROP INDEX IF EXISTS public.idx_artists_slug;
CREATE UNIQUE INDEX IF NOT EXISTS artists_slug_kind_uniq ON public.artists (slug, kind);
CREATE INDEX IF NOT EXISTS idx_artists_kind ON public.artists (kind);

-- 2) Allow authenticated users (DJs) to auto-create artists/remixers via RPC
--    (RPC is SECURITY DEFINER, so no policy needed; but keep table policies as-is.)

-- 3) Extend tracks with structured credits + meta
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS artist_id uuid REFERENCES public.artists(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS featured_artists text[] DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS remixer_ids uuid[] DEFAULT '{}'::uuid[],
  ADD COLUMN IF NOT EXISTS producer text,
  ADD COLUMN IF NOT EXISTS release_year int,
  ADD COLUMN IF NOT EXISTS isrc text,
  ADD COLUMN IF NOT EXISTS subgenre text,
  ADD COLUMN IF NOT EXISTS mood text;

CREATE INDEX IF NOT EXISTS idx_tracks_artist_id ON public.tracks (artist_id);
CREATE INDEX IF NOT EXISTS idx_tracks_remixer_ids ON public.tracks USING gin (remixer_ids);
CREATE INDEX IF NOT EXISTS idx_tracks_featured_artists ON public.tracks USING gin (featured_artists);

-- 4) Slugify helper (immutable, search_path safe)
CREATE OR REPLACE FUNCTION public.slugify(_v text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT trim(both '-' from
    regexp_replace(
      regexp_replace(
        lower(translate(coalesce(_v,''),
          'ÀÁÂÃÄÅàáâãäåÒÓÔÕÖØòóôõöøÈÉÊËèéêëÇçÌÍÎÏìíîïÙÚÛÜùúûüÿÑñ',
          'AAAAAAaaaaaaOOOOOOooooooEEEEeeeeCcIIIIiiiiUUUUuuuuyNn')),
        '[^a-z0-9]+','-','g'),
      '(^-+|-+$)','','g')
  )
$$;

-- 5) Resolve or create an artist by name+kind, returns its id
CREATE OR REPLACE FUNCTION public.resolve_or_create_artist(_name text, _kind text DEFAULT 'artist')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_name text := trim(_name);
  v_slug text;
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF v_name IS NULL OR v_name = '' THEN RETURN NULL; END IF;
  IF _kind NOT IN ('artist','remixer') THEN _kind := 'artist'; END IF;

  v_slug := public.slugify(v_name);
  IF v_slug = '' THEN v_slug := substring(md5(v_name),1,8); END IF;

  SELECT id INTO v_id FROM public.artists WHERE slug = v_slug AND kind = _kind LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  -- Fall back: try by exact name + kind (handles legacy rows without slugify)
  SELECT id INTO v_id FROM public.artists WHERE lower(name) = lower(v_name) AND kind = _kind LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;

  INSERT INTO public.artists(name, slug, kind, created_by)
  VALUES (v_name, v_slug, _kind, v_user)
  RETURNING id INTO v_id;

  RETURN v_id;
END $$;

-- 6) Update dj_submit_track to accept new credits and auto-resolve artist+remixers
CREATE OR REPLACE FUNCTION public.dj_submit_track(_track jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
    v_user, v_user, 'pending'
  );
  RETURN v_id;
END $$;

-- 7) Update admin_upsert_track for the same fields
CREATE OR REPLACE FUNCTION public.admin_upsert_track(_track jsonb, _id uuid DEFAULT NULL::uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
      download_url, acapella_url, instrumental_url, created_by,
      submitted_by, status, reviewed_by, reviewed_at
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
      updated_at = now()
    WHERE id = v_id;
  END IF;
  RETURN v_id;
END $$;

-- 8) Backfill artist_id for existing tracks from existing artist text
UPDATE public.tracks t
SET artist_id = a.id
FROM public.artists a
WHERE t.artist_id IS NULL
  AND a.kind = 'artist'
  AND lower(a.name) = lower(t.artist);
