CREATE TABLE public.dj_shorts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  youtube_url text NOT NULL,
  youtube_id text NOT NULL,
  thumbnail_url text,
  tags text[] NOT NULL DEFAULT '{}'::text[],
  artist_id uuid,
  track_id uuid,
  position integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dj_shorts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active shorts"
  ON public.dj_shorts FOR SELECT TO public
  USING (is_active = true);

CREATE POLICY "Admins view all shorts"
  ON public.dj_shorts FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert shorts"
  ON public.dj_shorts FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update shorts"
  ON public.dj_shorts FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete shorts"
  ON public.dj_shorts FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER dj_shorts_updated_at
  BEFORE UPDATE ON public.dj_shorts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_dj_shorts_position ON public.dj_shorts (position, created_at DESC);
CREATE INDEX idx_dj_shorts_active ON public.dj_shorts (is_active);