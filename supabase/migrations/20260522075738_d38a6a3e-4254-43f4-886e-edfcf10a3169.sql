-- Add file_size and audio_format columns to tracks for richer download metadata
ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT,
  ADD COLUMN IF NOT EXISTS audio_format TEXT;

-- Index to speed up download history queries
CREATE INDEX IF NOT EXISTS idx_downloads_user_downloaded_at
  ON public.downloads(user_id, downloaded_at DESC);

-- Helper function: returns aggregated download history for a user with track metadata.
-- Used by the Downloads page; respects RLS via SECURITY INVOKER.
CREATE OR REPLACE FUNCTION public.my_download_history()
RETURNS TABLE (
  download_id uuid,
  downloaded_at timestamptz,
  track_id uuid,
  title text,
  artist text,
  genre text,
  bpm integer,
  musical_key text,
  version text,
  cover_url text,
  audio_url text,
  download_url text,
  duration text,
  audio_format text,
  file_size_bytes bigint,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    d.id,
    d.downloaded_at,
    t.id,
    t.title,
    t.artist,
    t.genre,
    t.bpm,
    t.musical_key,
    t.version,
    t.cover_url,
    t.audio_url,
    t.download_url,
    t.duration,
    t.audio_format,
    t.file_size_bytes,
    t.created_at
  FROM public.downloads d
  JOIN public.tracks t ON t.id = d.track_id
  WHERE d.user_id = auth.uid()
  ORDER BY d.downloaded_at DESC
  LIMIT 500;
$$;