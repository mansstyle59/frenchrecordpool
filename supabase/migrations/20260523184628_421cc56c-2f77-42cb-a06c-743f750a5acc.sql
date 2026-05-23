-- 1) Add multi-roles array on artists
ALTER TABLE public.artists ADD COLUMN IF NOT EXISTS roles text[] NOT NULL DEFAULT '{}';

-- 2) Backfill from legacy `kind`
UPDATE public.artists SET roles = CASE
  WHEN kind = 'both' THEN ARRAY['dj','remixer']
  WHEN kind = 'remixer' THEN ARRAY['remixer']
  ELSE ARRAY['dj']
END
WHERE coalesce(array_length(roles,1),0) = 0;

-- 3) Index for role filters
CREATE INDEX IF NOT EXISTS artists_roles_gin ON public.artists USING GIN (roles);

-- 4) Replace resolve_or_create_artist: merge role into roles[]
CREATE OR REPLACE FUNCTION public.resolve_or_create_artist(_name text, _kind text DEFAULT 'artist'::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user uuid := auth.uid();
  v_name text := trim(_name);
  v_slug text;
  v_id uuid;
  v_role text;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'not_authenticated' USING ERRCODE='42501'; END IF;
  IF v_name IS NULL OR v_name = '' THEN RETURN NULL; END IF;

  -- Map legacy values
  v_role := CASE lower(coalesce(_kind,'artist'))
    WHEN 'artist' THEN 'dj'
    WHEN 'remixer' THEN 'remixer'
    WHEN 'producer' THEN 'producer'
    WHEN 'vocalist' THEN 'vocalist'
    WHEN 'band' THEN 'band'
    WHEN 'dj' THEN 'dj'
    ELSE 'dj'
  END;

  v_slug := public.slugify(v_name);
  IF v_slug = '' THEN v_slug := substring(md5(v_name),1,8); END IF;

  -- Try by slug (any kind, unified)
  SELECT id INTO v_id FROM public.artists WHERE slug = v_slug LIMIT 1;
  IF v_id IS NULL THEN
    SELECT id INTO v_id FROM public.artists WHERE lower(name) = lower(v_name) LIMIT 1;
  END IF;

  IF v_id IS NOT NULL THEN
    -- Merge role if missing
    UPDATE public.artists
      SET roles = (SELECT array_agg(DISTINCT r) FROM unnest(array_append(roles, v_role)) r),
          updated_at = now()
      WHERE id = v_id AND NOT (v_role = ANY(roles));
    RETURN v_id;
  END IF;

  INSERT INTO public.artists(name, slug, kind, roles, created_by)
  VALUES (v_name, v_slug,
    CASE WHEN v_role = 'remixer' THEN 'remixer' ELSE 'artist' END,
    ARRAY[v_role], v_user)
  RETURNING id INTO v_id;
  RETURN v_id;
END $function$;

-- 5) artist_stats helper
CREATE OR REPLACE FUNCTION public.artist_stats(_artist_id uuid)
RETURNS TABLE(originals int, remixes int, featured int, downloads bigint, top_genre text, avg_bpm numeric)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH t_orig AS (
    SELECT id, genre, bpm FROM public.tracks
    WHERE artist_id = _artist_id AND status='approved'
  ),
  t_rem AS (
    SELECT id, genre, bpm FROM public.tracks
    WHERE _artist_id = ANY(remixer_ids) AND status='approved'
  ),
  t_all AS (SELECT * FROM t_orig UNION SELECT * FROM t_rem)
  SELECT
    (SELECT count(*)::int FROM t_orig) AS originals,
    (SELECT count(*)::int FROM t_rem) AS remixes,
    0::int AS featured,
    (SELECT count(*)::bigint FROM public.downloads d WHERE d.track_id IN (SELECT id FROM t_all)) AS downloads,
    (SELECT genre FROM t_all WHERE genre IS NOT NULL AND genre <> '' GROUP BY genre ORDER BY count(*) DESC LIMIT 1) AS top_genre,
    (SELECT round(avg(bpm)::numeric, 0) FROM t_all WHERE bpm IS NOT NULL) AS avg_bpm;
$$;