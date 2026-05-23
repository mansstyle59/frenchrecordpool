
ALTER TABLE public.dj_shorts
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'youtube',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_id text;

-- Backfill
UPDATE public.dj_shorts
SET source_url = COALESCE(source_url, youtube_url),
    source_id  = COALESCE(source_id, youtube_id),
    provider   = COALESCE(provider, 'youtube');

-- Constraints
ALTER TABLE public.dj_shorts
  ALTER COLUMN youtube_url DROP NOT NULL,
  ALTER COLUMN youtube_id  DROP NOT NULL;

ALTER TABLE public.dj_shorts
  DROP CONSTRAINT IF EXISTS dj_shorts_provider_check;
ALTER TABLE public.dj_shorts
  ADD CONSTRAINT dj_shorts_provider_check CHECK (provider IN ('youtube','instagram'));
