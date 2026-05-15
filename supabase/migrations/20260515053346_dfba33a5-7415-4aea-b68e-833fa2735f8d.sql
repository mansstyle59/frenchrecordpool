ALTER TABLE public.tracks
  ADD COLUMN IF NOT EXISTS acapella_url text,
  ADD COLUMN IF NOT EXISTS instrumental_url text;