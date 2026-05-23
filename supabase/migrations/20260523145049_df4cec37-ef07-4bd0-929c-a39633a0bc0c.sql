
CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  source text NOT NULL CHECK (source IN ('spotify','deezer','soundcloud','custom')),
  source_url text,
  embed_id text,
  cover_url text,
  accent_color text NOT NULL DEFAULT '220 80% 58%',
  tags text[] NOT NULL DEFAULT '{}'::text[],
  track_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active playlists"
  ON public.playlists FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins view all playlists"
  ON public.playlists FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert playlists"
  ON public.playlists FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update playlists"
  ON public.playlists FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete playlists"
  ON public.playlists FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS idx_playlists_active_pos ON public.playlists (is_active, position);

CREATE TRIGGER update_playlists_updated_at
BEFORE UPDATE ON public.playlists
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
