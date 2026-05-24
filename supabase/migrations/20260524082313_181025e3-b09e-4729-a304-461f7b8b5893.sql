-- Top favorited tracks (anonymous aggregate)
CREATE OR REPLACE FUNCTION public.top_favorited_tracks(_limit int DEFAULT 10)
RETURNS TABLE (
  id uuid, title text, artist text, genre text, version text,
  bpm int, musical_key text, duration text, cover_url text,
  preview_url text, audio_url text, download_url text, label text,
  tags text[], release_date date, downloads int, created_at timestamptz,
  status text, favorites_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT t.id, t.title, t.artist, t.genre, t.version, t.bpm, t.musical_key,
         t.duration, t.cover_url, t.preview_url, t.audio_url, t.download_url,
         t.label, t.tags, t.release_date, t.downloads, t.created_at, t.status,
         COUNT(f.id) AS favorites_count
  FROM public.tracks t
  JOIN public.favorites f ON f.track_id = t.id
  WHERE t.status = 'approved'
  GROUP BY t.id
  ORDER BY favorites_count DESC, t.downloads DESC NULLS LAST
  LIMIT GREATEST(1, LEAST(_limit, 50));
$$;

-- DJ Charts : current week vs previous week
CREATE OR REPLACE FUNCTION public.dj_charts_weekly(_limit int DEFAULT 10)
RETURNS TABLE (
  id uuid, title text, artist text, genre text, version text,
  bpm int, musical_key text, duration text, cover_url text,
  preview_url text, audio_url text, download_url text, label text,
  tags text[], release_date date, downloads int, created_at timestamptz,
  status text,
  current_count bigint, previous_count bigint,
  current_rank int, previous_rank int
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH cur AS (
    SELECT track_id, COUNT(*) AS c
    FROM public.downloads
    WHERE downloaded_at >= now() - interval '7 days'
    GROUP BY track_id
  ),
  prev AS (
    SELECT track_id, COUNT(*) AS c
    FROM public.downloads
    WHERE downloaded_at >= now() - interval '14 days'
      AND downloaded_at <  now() - interval '7 days'
    GROUP BY track_id
  ),
  cur_ranked AS (
    SELECT track_id, c, ROW_NUMBER() OVER (ORDER BY c DESC, track_id) AS rk FROM cur
  ),
  prev_ranked AS (
    SELECT track_id, c, ROW_NUMBER() OVER (ORDER BY c DESC, track_id) AS rk FROM prev
  )
  SELECT t.id, t.title, t.artist, t.genre, t.version, t.bpm, t.musical_key,
         t.duration, t.cover_url, t.preview_url, t.audio_url, t.download_url,
         t.label, t.tags, t.release_date, t.downloads, t.created_at, t.status,
         COALESCE(cr.c, 0) AS current_count,
         COALESCE(pr.c, 0) AS previous_count,
         cr.rk::int AS current_rank,
         pr.rk::int AS previous_rank
  FROM cur_ranked cr
  JOIN public.tracks t ON t.id = cr.track_id AND t.status = 'approved'
  LEFT JOIN prev_ranked pr ON pr.track_id = cr.track_id
  ORDER BY cr.rk
  LIMIT GREATEST(1, LEAST(_limit, 50));
$$;

GRANT EXECUTE ON FUNCTION public.top_favorited_tracks(int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dj_charts_weekly(int) TO anon, authenticated;