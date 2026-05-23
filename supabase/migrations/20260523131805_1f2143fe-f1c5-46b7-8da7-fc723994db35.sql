-- Targeting columns on home_widgets
ALTER TABLE public.home_widgets
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS devices  text NOT NULL DEFAULT 'all',
  ADD COLUMN IF NOT EXISTS starts_at timestamptz,
  ADD COLUMN IF NOT EXISTS ends_at   timestamptz;

-- RPC: top downloads on a period window
CREATE OR REPLACE FUNCTION public.top_downloads_period(_days int, _limit int)
RETURNS SETOF public.tracks
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT t.*
  FROM public.tracks t
  JOIN public.downloads d ON d.track_id = t.id
  WHERE t.status = 'approved'
    AND (_days IS NULL OR d.downloaded_at >= now() - (_days || ' days')::interval)
  GROUP BY t.id
  ORDER BY count(d.id) DESC
  LIMIT GREATEST(COALESCE(_limit, 8), 1);
$$;

-- RPC: trending artists on a period window
CREATE OR REPLACE FUNCTION public.trending_artists(_days int, _limit int)
RETURNS TABLE(
  artist_id uuid, name text, slug text, photo_url text, kind text,
  downloads_count bigint
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT a.id, a.name, a.slug, a.photo_url, a.kind, count(d.id)
  FROM public.artists a
  JOIN public.tracks t ON t.artist_id = a.id AND t.status = 'approved'
  JOIN public.downloads d ON d.track_id = t.id
  WHERE (_days IS NULL OR d.downloaded_at >= now() - (_days || ' days')::interval)
  GROUP BY a.id
  ORDER BY count(d.id) DESC
  LIMIT GREATEST(COALESCE(_limit, 8), 1);
$$;

GRANT EXECUTE ON FUNCTION public.top_downloads_period(int,int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.trending_artists(int,int) TO anon, authenticated;